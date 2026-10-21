// Barramento de orquestração: socket local (unix ou named pipe no Windows) onde a CLI `regente` (rodando dentro de cada
// terminal) fala com o app. Cada PTY recebe um token próprio; um agente só enxerga os nós
// conectados a ele por uma linha no canvas.
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const { uid } = require('./store');
const platform = require('./platform');
const i18n = require('../shared/i18n');

const MAX_QUEUE_WAIT = 30 * 60 * 1000;
const IMPLICIT_REPLY_GRACE = Number(process.env.REGENTE_REPLY_GRACE_MS) || 45000;

class Bus {
  // tr/lang: idioma do usuário para o que chega aos agentes; sem eles (testes), português.
  constructor({ store, sessions, portals, ui, socketPath, tr = i18n.t, lang = () => 'pt' }) {
    Object.assign(this, { store, sessions, portals, ui, socketPath, tr, lang });
    this.tokens = new Map(); // token -> nodeId
    this.pending = new Map(); // msgId -> { from, to, resolve, timer }
    this.queues = new Map(); // nodeId -> [texto aguardando o agente ficar ocioso]
    sessions.on('status', (id, st, prev) => {
      if (st === 'idle') this.flushQueue(id);
      this.watchTurn(id, st, prev);
    });
  }

  // Se o destino de um ask terminou o turno e não chamou `regente reply`, devolve a tela após uma carência.
  watchTurn(id, st, prev) {
    for (const [msgId, p] of this.pending) {
      if (p.to !== id) continue;
      clearTimeout(p.idleTimer);
      if (st === 'idle' && prev === 'working') {
        p.idleTimer = setTimeout(() => {
          if (!this.pending.has(msgId)) return;
          const s = this.sessions.get(id);
          this.finish(msgId, { from: this.store.findNode(id)?.node.title, reply: null, implicit: true, screen: s?.screenText(60) });
        }, IMPLICIT_REPLY_GRACE);
      }
    }
  }

  finish(msgId, result) {
    const p = this.pending.get(msgId);
    if (!p) return;
    clearTimeout(p.timer);
    clearTimeout(p.idleTimer);
    this.pending.delete(msgId);
    this.ui('pending', { from: p.from, to: p.to, msgId, open: false });
    p.resolve(result);
  }

  tokenFor(nodeId) {
    for (const [t, id] of this.tokens) if (id === nodeId) return t;
    const t = crypto.randomBytes(16).toString('hex');
    this.tokens.set(t, nodeId);
    return t;
  }

  // No Windows o socketPath é um named pipe: não existe arquivo para apagar nem permissão para ajustar.
  listen() {
    if (!platform.isWin) try { fs.unlinkSync(this.socketPath); } catch {}
    this.server = net.createServer((sock) => {
      let buf = '';
      sock.on('data', (chunk) => {
        buf += chunk;
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          this.handle(line).then(
            // `lang` diz à CLI em que idioma formatar a saída.
            (result) => sock.writable && sock.write(JSON.stringify({ ok: true, result, lang: this.lang() }) + '\n'),
            (err) => sock.writable && sock.write(JSON.stringify({ ok: false, error: err.message, lang: this.lang() }) + '\n'),
          );
        }
      });
      sock.on('error', () => {});
    });
    this.server.listen(this.socketPath, () => platform.isWin || fs.chmodSync(this.socketPath, 0o600));
  }

  close() { this.server?.close(); if (!platform.isWin) try { fs.unlinkSync(this.socketPath); } catch {} }

  async handle(line) {
    const req = JSON.parse(line);
    const me = this.tokens.get(req.token);
    if (!me) throw new Error(this.tr('token inválido: este terminal não pertence ao Regente aberto'));
    const fn = this['cmd_' + String(req.cmd).replace(/[^\w]/g, '_')];
    if (!fn) throw new Error(this.tr('comando desconhecido: {cmd}', { cmd: req.cmd }));
    return fn.call(this, me, req.args || {});
  }

  // ---------- helpers ----------

  self(me) {
    const hit = this.store.findNode(me);
    if (!hit) throw new Error(this.tr('nó removido do canvas'));
    return hit;
  }

  describe(node) {
    const s = this.sessions.get(node.id);
    const role = node.roleId && this.store.state.roles.find((r) => r.id === node.roleId);
    return {
      name: node.title, id: node.id, type: node.type,
      agent: node.type === 'terminal' ? node.agent : undefined,
      role: role && this.tr(role.name), status: node.type === 'terminal' ? (s?.status || 'stopped') : undefined,
      note: node.statusText || undefined,
    };
  }

  // Resolve um peer conectado por nome (sem diferenciar maiúsculas) ou id.
  peer(me, ref, type) {
    if (!ref) throw new Error(this.tr('informe o destino (nome do nó conectado)'));
    const key = String(ref).toLowerCase();
    const list = this.store.neighbors(me);
    const p = list.find((n) => n.id === ref) || list.find((n) => n.title.toLowerCase() === key) ||
      list.find((n) => n.title.toLowerCase().startsWith(key));
    if (!p) {
      const names = list.map((n) => n.title).join(', ') || this.tr('nenhum');
      throw new Error(this.tr('"{ref}" não está conectado a você. Conectados: {names}', { ref, names }));
    }
    if (type && p.type !== type) throw new Error(this.tr('"{name}" é {type}, não {want}', { name: p.title, type: p.type, want: type }));
    return p;
  }

  liveSession(node) {
    const s = this.sessions.get(node.id);
    if (!s || s.status === 'exited') throw new Error(this.tr('o terminal "{name}" não está rodando', { name: node.title }));
    return s;
  }

  deliver(node, text, now) {
    const s = this.liveSession(node);
    // Num shell puro a mensagem seria executada como comando: só exibe (heredoc / here-string).
    if (node.agent === 'shell') text = platform.showText(s.shellKind, text);
    if (now || s.status === 'idle' || s.status === 'starting') {
      s.submit(text);
      return this.tr('entregue');
    }
    const q = this.queues.get(node.id) || [];
    q.push({ text, at: Date.now() });
    this.queues.set(node.id, q);
    this.ui('queue', { id: node.id, size: q.length });
    return this.tr('na fila (destino está {status}); será entregue quando ficar ocioso', { status: s.status });
  }

  flushQueue(id) {
    const q = this.queues.get(id);
    const s = this.sessions.get(id);
    if (!q?.length || !s) return;
    const item = q.shift();
    if (Date.now() - item.at < MAX_QUEUE_WAIT) s.submit(item.text);
    this.ui('queue', { id, size: q.length });
  }

  log(fromNode, toNode, kind, text) {
    this.ui('message', { from: fromNode.id, to: toNode.id, kind, text: text.slice(0, 500), at: Date.now() });
  }

  // ---------- comandos ----------

  cmd_whoami(me) {
    const { ws, node } = this.self(me);
    return { ...this.describe(node), workspace: ws.name, cwd: node.cwd || ws.cwd, peers: this.store.neighbors(me).map((n) => n.title) };
  }

  cmd_peers(me) {
    return this.store.neighbors(me).map((n) => this.describe(n));
  }

  cmd_send(me, a) {
    const { node: from } = this.self(me);
    const to = this.peer(me, a.to, 'terminal');
    const text = this.tr('[Regente] Mensagem de "{from}":\n{text}\n\n(Se precisar responder: regente send "{from}" "<mensagem>")', { from: from.title, text: a.text });
    this.log(from, to, 'send', a.text);
    return this.deliver(to, text, a.now);
  }

  cmd_broadcast(me, a) {
    const { node: from } = this.self(me);
    const out = {};
    for (const to of this.store.neighbors(me).filter((n) => n.type === 'terminal')) {
      try {
        const text = this.tr('[Regente] Mensagem de "{from}" para todos:\n{text}', { from: from.title, text: a.text });
        this.log(from, to, 'send', a.text);
        out[to.title] = this.deliver(to, text, a.now);
      } catch (e) { out[to.title] = e.message; }
    }
    return out;
  }

  // Entrega uma tarefa e bloqueia até o destino chamar `regente reply <id>` (ou estourar o tempo).
  cmd_ask(me, a) {
    const { node: from } = this.self(me);
    const to = this.peer(me, a.to, 'terminal');
    const msgId = uid('m-');
    const text = this.tr('[Regente] Tarefa de "{from}" (id {id}):\n{text}\n\nIMPORTANTE: quando terminar, entregue o resultado rodando no shell:\nregente reply {id} "<resultado resumido>"   (ou: echo "<resultado longo>" | regente reply {id} -)',
      { from: from.title, id: msgId, text: a.text });
    const timeoutMs = (Number(a.timeout) || 1800) * 1000;
    this.log(from, to, 'ask', a.text);
    const delivered = this.deliver(to, text, a.now);
    this.ui('pending', { from: from.id, to: to.id, msgId, open: true });
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const s = this.sessions.get(to.id);
        this.finish(msgId, { timedOut: true, delivered, status: s?.status, screen: s?.screenText(40) });
      }, timeoutMs);
      this.pending.set(msgId, { from: from.id, to: to.id, resolve, timer });
    });
  }

  cmd_reply(me, a) {
    const { node: from } = this.self(me);
    const p = this.pending.get(a.id);
    if (p) {
      const asker = this.store.findNode(p.from)?.node;
      if (asker) this.log(from, asker, 'reply', a.text);
      this.finish(a.id, { from: from.title, reply: a.text });
      return this.tr('resposta entregue');
    }
    // Sem ask pendente (já expirou): manda como mensagem normal para quem perguntou, se conectado.
    if (a.to) return this.cmd_send(me, { to: a.to, text: a.text });
    throw new Error(this.tr('nenhuma tarefa pendente com id {id} (talvez tenha expirado). Use: regente send <nome> "<texto>"', { id: a.id }));
  }

  cmd_read(me, a) {
    const p = this.peer(me, a.to);
    if (p.type === 'note') return this.store.readNote(p.id);
    if (p.type === 'portal') return this.portals.run(p.id, 'text', {});
    const s = this.liveSession(p);
    return s.screenText(Number(a.lines) || 80);
  }

  async cmd_wait(me, a) {
    const p = this.peer(me, a.to, 'terminal');
    const s = this.liveSession(p);
    const deadline = Date.now() + (Number(a.timeout) || 600) * 1000;
    // Dá tempo para a mensagem recém-enviada começar a ser processada.
    await new Promise((r) => setTimeout(r, 2000));
    while (Date.now() < deadline) {
      if (s.status === 'idle' || s.status === 'waiting' || s.status === 'exited') return { status: s.status, screen: s.screenText(Number(a.lines) || 30) };
      await new Promise((r) => setTimeout(r, 500));
    }
    return { status: s.status, timedOut: true };
  }

  // Teclas cruas para o terminal conectado (ex.: aprovar um prompt de permissão).
  cmd_keys(me, a) {
    const p = this.peer(me, a.to, 'terminal');
    const map = { enter: '\r', esc: '\x1b', tab: '\t', up: '\x1b[A', down: '\x1b[B', left: '\x1b[D', right: '\x1b[C', 'ctrl-c': '\x03', backspace: '\x7f' };
    const seq = (a.keys || []).map((k) => map[String(k).toLowerCase()] ?? String(k)).join('');
    this.liveSession(p).write(seq);
    return 'ok';
  }

  cmd_note(me, a) {
    const p = this.peer(me, a.to, 'note');
    const cur = this.store.readNote(p.id);
    let next;
    if (a.op === 'read') return cur;
    if (a.op === 'write') next = a.text;
    else if (a.op === 'append') next = cur + (cur && !cur.endsWith('\n') ? '\n' : '') + a.text + '\n';
    else throw new Error(this.tr('op de nota: read | write | append'));
    this.store.writeNote(p.id, next);
    this.ui('note', { id: p.id, text: next });
    return this.tr('nota "{name}" atualizada ({n} caracteres)', { name: p.title, n: next.length });
  }

  cmd_portal(me, a) {
    const p = this.peer(me, a.to, 'portal');
    return this.portals.run(p.id, a.action, a);
  }

  cmd_status(me, a) {
    const { node } = this.self(me);
    node.statusText = String(a.text || '').slice(0, 140);
    this.store.save();
    this.ui('nodePatch', { id: me, patch: { statusText: node.statusText } });
    return 'ok';
  }

  // Rotinas: alvo padrão é o próprio terminal; --terminal <nome> precisa estar conectado.
  cmd_routine(me, a) {
    const r = this.routines;
    if (a.op === 'list') {
      return r.list.map((x) => ({ id: x.id, alvo: x.reminder ? this.tr('lembrete') : this.store.findNode(x.target)?.node.title, prompt: x.prompt.slice(0, 80), ativa: x.enabled, execucoes: x.runs, proxima: x.next && new Date(x.next).toLocaleString(), ultimo: x.lastResult }));
    }
    if (a.op === 'rm') return this.tr(r.remove(a.id) ? 'rotina removida' : 'rotina não encontrada');
    if (a.op === 'add') {
      const target = a.terminal ? this.peer(me, a.terminal, 'terminal').id : me;
      let rt;
      try { rt = r.add({ ...a, target }); } catch (e) { throw new Error(this.tr(e.message)); }
      return this.tr('rotina {id} criada; próxima execução: {next}', { id: rt.id, next: rt.next ? new Date(rt.next).toLocaleString() : '—' });
    }
    throw new Error(this.tr('uso: regente routine list | add ... | rm <id>'));
  }

  // Cria um novo agente ao lado do chamador, já conectado a ele. Opcionalmente entrega uma tarefa.
  async cmd_spawn(me, a) {
    const { ws, node } = this.self(me);
    const agent = this.store.state.agents.find((x) => x.id === (a.agent || 'claude'));
    if (!agent) throw new Error(this.tr('agente desconhecido: {agent}. Disponíveis: {list}', { agent: a.agent, list: this.store.state.agents.map((x) => x.id).join(', ') }));
    // Aceita o nome salvo ou o traduzido (o agente vê os papéis no idioma do usuário).
    const want = String(a.role || '').toLowerCase();
    const role = a.role && this.store.state.roles.find((r) => r.id === a.role || r.name.toLowerCase() === want || this.tr(r.name).toLowerCase() === want);
    if (a.role && !role) throw new Error(this.tr('papel desconhecido: {role}', { role: a.role }));
    const siblings = this.store.neighbors(me).length;
    const created = await this.ui('spawn', {
      workspaceId: ws.id,
      near: me,
      node: {
        type: 'terminal', agent: agent.id, roleId: role?.id, title: a.name || `${agent.label} ${siblings + 1}`,
        cwd: a.cwd || node.cwd || ws.cwd,
      },
    });
    if (a.task) {
      const s = this.sessions.get(created.id);
      // Espera a TUI do agente subir antes de entregar a tarefa.
      await new Promise((resolve) => {
        const t0 = Date.now();
        const check = () => (s && s.status === 'idle') || Date.now() - t0 > 60000 ? resolve() : setTimeout(check, 500);
        setTimeout(check, 3000);
      });
      this.deliver(created, this.tr('[Regente] Tarefa de "{from}":\n{text}', { from: node.title, text: a.task }), false);
    }
    return { name: created.title, id: created.id };
  }
}

module.exports = { Bus };
