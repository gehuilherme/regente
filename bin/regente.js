#!/usr/bin/env node
// CLI usada pelos agentes dentro dos terminais do Regente para falar com os nós conectados.
const net = require('net');
const path = require('path');

// Traduções compartilhadas com o app. O idioma vem de cada resposta do Regente (segue a configuração
// atual); antes disso, de REGENTE_LANG, definido quando o terminal abriu.
const i18n = (() => {
  try {
    const m = require(path.join(__dirname, '..', 'src', 'shared', 'i18n.js'));
    m.define(require(path.join(__dirname, '..', 'src', 'shared', 'locales.js')));
    m.setLang(m.resolve(process.env.REGENTE_LANG || 'pt'));
    return m;
  } catch { return { t: (k, v) => k.replace(/\{(\w+)\}/g, (x, n) => v?.[n] ?? x), setLang() {}, resolve: (l) => l }; }
})();
const t = i18n.t;

const HELP = `regente — orquestração entre agentes no canvas do Regente

Você só enxerga nós conectados a você por uma linha no canvas.

  regente whoami                         quem sou eu, workspace, conectados
  regente peers                          lista nós conectados (terminais, notas, portais) e estado
  regente send <nome> <texto|->          manda mensagem (enfileira se o destino estiver ocupado)
  regente ask <nome> <texto|-> [--timeout s]
                                         delega uma tarefa e ESPERA a resposta (regente reply)
  regente reply <id> <texto|->           responde uma tarefa recebida via ask
  regente broadcast <texto|->            manda para todos os terminais conectados
  regente read <nome> [--lines N]        lê a tela de um terminal / conteúdo de nota / texto de portal
  regente wait <nome> [--timeout s]      espera o terminal ficar ocioso e mostra o fim da tela
  regente keys <nome> <tecla...>         teclas cruas (enter, esc, tab, up, down, ctrl-c, "1"...)
  regente note <nome> read|write|append [texto|-]
  regente portal <nome> <ação> ...       goto <url> | snapshot | text | click <ref> |
                                         type <ref> <texto> [--submit] [--clear] | key <Tecla> |
                                         scroll [dy] | eval <js> | screenshot [arquivo] | back | reload | url
  regente status <texto>                 mostra um status curto no seu nó do canvas
  regente spawn <agente> [--name N] [--role R] [--cwd D] [--task T]
                                         cria um novo agente conectado a você (claude, codex, gemini, opencode, shell)
  regente routine add "<prompt>" (--every 30m | --daily 09:00 | --weekly mon,fri@18:00 | --once 10m)
                  [--terminal <nome>] [--reminder] [--count N] [--until 2026-12-31] [--no-skip-if-busy]
  regente routine list | rm <id>         prompts agendados (padrão: entregues no seu próprio terminal)
  regente mcp                            servidor MCP (stdio) com as mesmas ferramentas

Use "-" no lugar do texto para ler do stdin.`;

function call(cmd, args = {}) {
  const sock = process.env.REGENTE_SOCK;
  const token = process.env.REGENTE_TOKEN;
  if (!sock || !token) return Promise.reject(new Error(t('fora de um terminal do Regente (REGENTE_SOCK/REGENTE_TOKEN ausentes)')));
  return new Promise((resolve, reject) => {
    const c = net.createConnection(sock);
    let buf = '';
    c.on('connect', () => c.write(JSON.stringify({ token, cmd, args }) + '\n'));
    c.on('data', (d) => {
      buf += d;
      const i = buf.indexOf('\n');
      if (i < 0) return;
      const res = JSON.parse(buf.slice(0, i));
      if (res.lang) i18n.setLang(i18n.resolve(res.lang));
      c.end();
      res.ok ? resolve(res.result) : reject(new Error(res.error));
    });
    c.on('error', (e) => reject(new Error(t('não consegui falar com o Regente: {msg}', { msg: e.message }))));
  });
}

function parse(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) flags[k] = true;
      else { flags[k] = next; i++; }
    } else pos.push(a);
  }
  return { pos, flags };
}

async function text(parts) {
  if (parts.length === 1 && parts[0] === '-') {
    let s = '';
    for await (const chunk of process.stdin) s += chunk;
    return s.trimEnd();
  }
  return parts.join(' ');
}

function print(r) {
  if (typeof r === 'string') return console.log(r);
  if (Array.isArray(r) && r.every((x) => x && x.name)) {
    if (!r.length) return console.log(t('(nenhum nó conectado)'));
    for (const p of r) {
      const bits = [p.type, p.agent, p.role && t('papel: {role}', { role: p.role }), p.status, p.note && `"${p.note}"`].filter(Boolean);
      console.log(`- ${p.name}  (${bits.join(', ')})`);
    }
    return;
  }
  if (r && r.implicit) return console.log(t('{from} terminou o turno sem "regente reply". Fim da tela dele:', r) + '\n' + r.screen);
  if (r && r.reply !== undefined) return console.log(t('Resposta de {from}:', r) + '\n' + r.reply);
  if (r && r.timedOut && r.screen !== undefined) {
    return console.log(t('Sem resposta dentro do tempo (status: {status}). Fim da tela do destino:', r) + '\n' + r.screen);
  }
  if (r && r.screen !== undefined) return console.log(`[${r.status}]\n${r.screen}`);
  console.log(JSON.stringify(r, null, 2));
}

async function run(argv) {
  const { pos, flags } = parse(argv);
  const [cmd, ...rest] = pos;
  switch (cmd) {
    case 'whoami': case 'peers': return call(cmd);
    case 'send': case 'broadcast': case 'ask': {
      const to = cmd === 'broadcast' ? undefined : rest.shift();
      return call(cmd, { to, text: await text(rest), now: !!flags.now, timeout: flags.timeout });
    }
    case 'reply': return call('reply', { id: rest[0], text: await text(rest.slice(1)), to: flags.to });
    case 'read': return call('read', { to: rest[0], lines: flags.lines });
    case 'wait': return call('wait', { to: rest[0], timeout: flags.timeout, lines: flags.lines });
    case 'keys': return call('keys', { to: rest[0], keys: rest.slice(1) });
    case 'note': return call('note', { to: rest[0], op: rest[1] || 'read', text: await text(rest.slice(2)) });
    case 'status': return call('status', { text: rest.join(' ') });
    case 'spawn': return call('spawn', { agent: rest[0], name: flags.name, role: flags.role, cwd: flags.cwd, task: flags.task });
    case 'routine': {
      const op = rest[0] || 'list';
      if (op === 'rm') return call('routine', { op, id: rest[1] });
      if (op === 'list') return call('routine', { op });
      return call('routine', {
        op: 'add', prompt: await text(rest.slice(1)), every: flags.every, daily: flags.daily, weekly: flags.weekly, once: flags.once,
        terminal: flags.terminal, reminder: !!flags.reminder, count: flags.count, until: flags.until, skipIfBusy: !flags['no-skip-if-busy'],
      });
    }
    case 'portal': {
      const [to, action, ...more] = rest;
      const a = { to, action, submit: !!flags.submit, clear: !!flags.clear };
      if (action === 'goto') a.url = more[0];
      if (action === 'click') a.ref = more[0];
      if (action === 'type') { a.ref = more[0]; a.text = more.slice(1).join(' '); }
      if (action === 'key') a.key = more[0];
      if (action === 'scroll') a.dy = more[0];
      if (action === 'eval') a.js = await text(more);
      if (action === 'screenshot') a.path = more[0];
      return call('portal', a);
    }
    default: return null;
  }
}

// ---------- servidor MCP (JSON-RPC 2.0 sobre stdio) ----------

const S = (props, required = []) => ({ type: 'object', properties: props, required });
const str = (description) => ({ type: 'string', description });
const TOOLS = [
  ['peers', 'Lista os nós conectados a você no canvas (terminais/agentes, notas, portais) e seus estados.', S({})],
  ['send', 'Envia uma mensagem a um agente conectado (não espera resposta).', S({ to: str('nome do nó'), text: str('mensagem') }, ['to', 'text'])],
  ['ask', 'Delega uma tarefa a um agente conectado e espera a resposta dele.', S({ to: str('nome do nó'), text: str('tarefa'), timeout: { type: 'number', description: 'segundos' } }, ['to', 'text'])],
  ['reply', 'Responde a uma tarefa recebida (id m-...).', S({ id: str('id da tarefa'), text: str('resultado') }, ['id', 'text'])],
  ['read', 'Lê a tela de um terminal, o conteúdo de uma nota ou o texto de um portal conectado.', S({ to: str('nome do nó'), lines: { type: 'number' } }, ['to'])],
  ['wait', 'Espera um terminal conectado ficar ocioso.', S({ to: str('nome do nó'), timeout: { type: 'number' } }, ['to'])],
  ['note', 'Lê/escreve/anexa numa nota conectada.', S({ to: str('nome da nota'), op: { type: 'string', enum: ['read', 'write', 'append'] }, text: str('texto') }, ['to', 'op'])],
  ['portal', 'Controla um portal (navegador) conectado. Ações: goto, snapshot, text, click, type, key, scroll, eval, screenshot, back, reload, url.',
    S({ to: str('nome do portal'), action: str('ação'), url: str('para goto'), ref: str('ref do snapshot'), text: str('para type'), key: str('para key'), js: str('para eval'), submit: { type: 'boolean' } }, ['to', 'action'])],
  ['routine', 'Agenda prompts recorrentes. op=add (prompt + every|daily|weekly|once, terminal opcional), list ou rm (id).',
    S({ op: { type: 'string', enum: ['add', 'list', 'rm'] }, prompt: str('texto'), every: str('ex. 30m'), daily: str('HH:MM'), weekly: str('mon,fri@HH:MM'), once: str('atraso, ex. 10m'), terminal: str('nome do terminal conectado'), id: str('para rm') }, ['op'])],
  ['status', 'Mostra um status curto no seu nó do canvas.', S({ text: str('status') }, ['text'])],
  ['spawn', 'Cria um novo agente conectado a você, opcionalmente com uma tarefa.', S({ agent: str('claude|codex|gemini|opencode|shell'), name: str('nome'), role: str('papel'), task: str('tarefa inicial') }, ['agent'])],
];

function mcp() {
  const send = (m) => process.stdout.write(JSON.stringify(m) + '\n');
  let buf = '';
  process.stdin.on('data', async (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.id === undefined) continue; // notificações
      const reply = (result) => send({ jsonrpc: '2.0', id: msg.id, result });
      if (msg.method === 'initialize') {
        reply({ protocolVersion: msg.params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'regente', version: '0.1.0' } });
      } else if (msg.method === 'tools/list') {
        reply({ tools: TOOLS.map(([name, description, inputSchema]) => ({ name, description: t(description), inputSchema })) });
      } else if (msg.method === 'tools/call') {
        const { name, arguments: args = {} } = msg.params;
        call(name, args).then(
          (r) => reply({ content: [{ type: 'text', text: typeof r === 'string' ? r : JSON.stringify(r, null, 2) }] }),
          (e) => reply({ content: [{ type: 'text', text: e.message }], isError: true }),
        );
      } else if (msg.method === 'ping') {
        reply({});
      } else {
        send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: t('método não suportado') } });
      }
    }
  });
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv[0] === 'mcp') mcp();
  else if (!argv.length || argv[0] === 'help' || argv[0] === '--help' || argv[0] === '-h') console.log(t(HELP));
  else {
    run(argv).then((r) => {
      if (r === null) { console.error(t('comando desconhecido: {cmd}', { cmd: argv[0] }) + '\n\n' + t(HELP)); process.exit(2); }
      print(r);
    }, (e) => { console.error(t('erro:') + ' ' + e.message); process.exit(1); });
  }
}

module.exports = { parse, call };
