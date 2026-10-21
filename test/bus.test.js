const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { Store } = require('../src/main/store');
const { Bus } = require('../src/main/bus');
const { parse } = require('../bin/regente');

// Sessão falsa: registra o que foi "digitado" e permite trocar o status.
class FakeSession extends EventEmitter {
  constructor(id) { super(); this.id = id; this.status = 'idle'; this.typed = []; }
  submit(t) { this.typed.push(t); }
  write(t) { this.typed.push(t); }
  screenText() { return 'tela de ' + this.id; }
}

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'regente-test-'));
  const store = new Store(dir);
  const ws = store.state.workspaces[0];
  ws.nodes.push(
    { id: 'a', type: 'terminal', agent: 'claude', title: 'Lead' },
    { id: 'b', type: 'terminal', agent: 'codex', title: 'Dev' },
    { id: 'c', type: 'terminal', agent: 'claude', title: 'Isolado' },
    { id: 'n', type: 'note', title: 'Plano' },
  );
  ws.edges.push({ id: 'e1', from: 'a', to: 'b' }, { id: 'e2', from: 'a', to: 'n' });
  const sessions = new EventEmitter();
  const map = new Map(['a', 'b', 'c'].map((id) => [id, new FakeSession(id)]));
  sessions.get = (id) => map.get(id);
  const events = [];
  const bus = new Bus({ store, sessions, portals: null, ui: (ev, p) => events.push([ev, p]), socketPath: path.join(dir, 's') });
  return { store, sessions, map, bus, events, tok: (id) => bus.tokenFor(id) };
}

const call = (bus, token, cmd, args) => bus.handle(JSON.stringify({ token, cmd, args }));

test('peers lista só nós conectados', async () => {
  const { bus, tok } = setup();
  const peers = await call(bus, tok('a'), 'peers');
  assert.deepStrictEqual(peers.map((p) => p.name).sort(), ['Dev', 'Plano']);
  await assert.rejects(call(bus, tok('a'), 'read', { to: 'Isolado' }), /não está conectado/);
});

test('token inválido é recusado', async () => {
  const { bus } = setup();
  await assert.rejects(call(bus, 'xxx', 'peers'), /token inválido/);
});

test('ask bloqueia até reply', async () => {
  const { bus, map, tok } = setup();
  const pending = call(bus, tok('a'), 'ask', { to: 'dev', text: 'faça X' });
  const delivered = map.get('b').typed[0];
  const id = delivered.match(/id (m-\w+)/)[1];
  assert.match(delivered, /faça X/);
  assert.strictEqual(await call(bus, tok('b'), 'reply', { id, text: 'feito' }), 'resposta entregue');
  assert.deepStrictEqual(await pending, { from: 'Dev', reply: 'feito' });
});

test('send enfileira quando destino está ocupado e entrega ao ficar ocioso', async () => {
  const { bus, map, sessions, tok } = setup();
  map.get('b').status = 'working';
  const r = await call(bus, tok('a'), 'send', { to: 'Dev', text: 'oi' });
  assert.match(r, /fila/);
  assert.strictEqual(map.get('b').typed.length, 0);
  map.get('b').status = 'idle';
  sessions.emit('status', 'b', 'idle', 'working');
  assert.match(map.get('b').typed[0], /oi/);
});

test('ask sem reply resolve com a tela após o turno terminar', async () => {
  process.env.REGENTE_REPLY_GRACE_MS = '10';
  delete require.cache[require.resolve('../src/main/bus')];
  const { Bus: FreshBus } = require('../src/main/bus');
  const ctx = setup();
  const bus = new FreshBus({ store: ctx.store, sessions: ctx.sessions, portals: null, ui: () => {}, socketPath: '/tmp/x' });
  const pending = call(bus, bus.tokenFor('a'), 'ask', { to: 'Dev', text: 't' });
  ctx.sessions.emit('status', 'b', 'working', 'idle');
  ctx.sessions.emit('status', 'b', 'idle', 'working');
  const r = await pending;
  assert.strictEqual(r.implicit, true);
  assert.strictEqual(r.screen, 'tela de b');
});

test('notas: append e read', async () => {
  const { bus, tok } = setup();
  await call(bus, tok('a'), 'note', { to: 'Plano', op: 'append', text: '- [ ] passo 1' });
  await call(bus, tok('a'), 'note', { to: 'Plano', op: 'append', text: '- [ ] passo 2' });
  assert.strictEqual(await call(bus, tok('a'), 'note', { to: 'Plano', op: 'read' }), '- [ ] passo 1\n- [ ] passo 2\n');
});

test('mensagens para shell puro viram heredoc', async () => {
  const { bus, store, map, tok } = setup();
  store.state.workspaces[0].nodes.find((n) => n.id === 'b').agent = 'shell';
  await call(bus, tok('a'), 'send', { to: 'Dev', text: 'rm -rf /' });
  assert.match(map.get('b').typed[0], /^cat <<'REGENTE_MSG'\n[\s\S]*rm -rf \/[\s\S]*\nREGENTE_MSG$/);
});

test('parse de argumentos da CLI', () => {
  assert.deepStrictEqual(parse(['ask', 'Dev', 'faça', 'X', '--timeout', '60', '--now']), { pos: ['ask', 'Dev', 'faça', 'X'], flags: { timeout: '60', now: true } });
});
