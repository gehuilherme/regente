// Sessões de terminal: PTY real + espelho headless (para ler a tela) + detecção de estado.
const os = require('os');
const pty = require('node-pty');
const { Terminal } = require('@xterm/headless');
const { EventEmitter } = require('events');
const platform = require('./platform');

const RING_LIMIT = 2 * 1024 * 1024; // bytes de saída bruta guardados para reanexar a UI
const BUSY_WINDOW = 1500; // ms sem saída => ocioso
const ECHO_WINDOW = 150; // saída logo após digitação é eco, não trabalho

// Padrões de telas de confirmação dos agentes (permissões, y/n).
const WAITING_PATTERNS = [
  /Do you want to (proceed|make this edit|create|run)/i,
  /\(y\/n\)|\[y\/N\]|\[Y\/n\]/,
  /❯\s*1\.\s*Yes/,
  /Allow (once|always)|Approve\?/i,
  /Press Enter to continue/i,
];

class Session extends EventEmitter {
  constructor({ id, cwd, env, launch, cols = 100, rows = 30 }) {
    super();
    this.id = id;
    this.status = 'starting';
    this.lastOutputAt = 0;
    this.lastInputAt = 0;
    this.ring = [];
    this.ringSize = 0;
    this.exitCode = null;
    this.title = '';

    // O agente roda dentro de um shell interativo; ao sair, o terminal continua utilizável.
    const shell = platform.shell();
    this.shellKind = shell.kind;
    this.headless = new Terminal({ cols, rows, scrollback: 5000, allowProposedApi: true });
    this.pty = pty.spawn(shell.path, platform.sessionArgs(shell, launch), { name: 'xterm-256color', cols, rows, cwd: cwd || os.homedir(), env });
    this.pid = this.pty.pid;

    this.pty.onData((data) => {
      const now = Date.now();
      if (now - this.lastInputAt > ECHO_WINDOW || data.length > 64) this.lastOutputAt = now;
      this.ring.push(data);
      this.ringSize += data.length;
      while (this.ringSize > RING_LIMIT && this.ring.length > 1) this.ringSize -= this.ring.shift().length;
      this.headless.write(data);
      this.emit('data', data);
    });
    this.headless.onTitleChange((t) => { this.title = t; this.emit('title', t); });
    this.pty.onExit(({ exitCode }) => {
      this.exitCode = exitCode;
      this.setStatus('exited');
      this.emit('exit', exitCode);
    });
    this.tick = setInterval(() => this.updateStatus(), 400);
  }

  updateStatus() {
    if (this.status === 'exited') return;
    const busy = Date.now() - this.lastOutputAt < BUSY_WINDOW;
    if (busy) return this.setStatus('working');
    if (this.status === 'starting' && this.lastOutputAt === 0) return;
    this.setStatus(this.looksLikePrompt() ? 'waiting' : 'idle');
  }

  looksLikePrompt() {
    const tail = this.screenText(15);
    return WAITING_PATTERNS.some((re) => re.test(tail));
  }

  setStatus(s) {
    if (s === this.status) return;
    const prev = this.status;
    this.status = s;
    this.emit('status', s, prev);
  }

  write(data) {
    this.lastInputAt = Date.now();
    this.pty.write(data);
  }

  // Cola texto como bracketed paste e envia Enter: funciona em TUIs (Claude, Codex) e shells.
  submit(text) {
    this.write('\x1b[200~' + text.replace(/\x1b/g, '') + '\x1b[201~');
    // Pequeno atraso para a TUI processar o paste antes do Enter.
    setTimeout(() => this.write('\r'), 120);
    // Algumas TUIs engolem o Enter logo após um paste grande: se o texto continuar parado
    // no campo de entrada, reenvia (até 2 vezes). Enter num input vazio é inofensivo.
    const lastLine = text.trim().split('\n').pop().slice(-30);
    let tries = 0;
    const confirm = () => {
      if (this.status === 'working' || this.status === 'exited' || tries++ >= 2) return;
      const tail = this.screenText(8);
      if (tail.includes('[Pasted text') || (lastLine && tail.includes(lastLine))) {
        this.write('\r');
        setTimeout(confirm, 1500);
      }
    };
    setTimeout(confirm, 1500);
  }

  resize(cols, rows) {
    if (this.status === 'exited' || !cols || !rows) return;
    try { this.pty.resize(cols, rows); this.headless.resize(cols, rows); } catch {}
  }

  replay() { return this.ring.join(''); }

  // Texto das últimas `lines` linhas (tela + scrollback), sem cores.
  screenText(lines = 60) {
    const buf = this.headless.buffer.active;
    const out = [];
    // Termina na última linha com conteúdo (cursor ou abaixo dele), não no fim do buffer, que após um
    // `clear` é só espaço em branco.
    let end = buf.baseY + buf.cursorY + 1;
    for (let i = buf.length - 1; i >= end; i--) {
      if (buf.getLine(i)?.translateToString(true).trim()) { end = i + 1; break; }
    }
    const start = Math.max(0, end - lines);
    for (let i = start; i < end; i++) {
      const line = buf.getLine(i);
      if (line) out.push(line.translateToString(true));
    }
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return out.join('\n');
  }

  kill() {
    clearInterval(this.tick);
    try { this.pty.kill(); } catch {}
    this.headless.dispose();
  }
}

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  get(id) { return this.sessions.get(id); }

  start(opts) {
    this.stop(opts.id);
    const s = new Session(opts);
    this.sessions.set(opts.id, s);
    s.on('data', (d) => this.emit('data', s.id, d));
    s.on('status', (st, prev) => this.emit('status', s.id, st, prev));
    s.on('title', (t) => this.emit('title', s.id, t));
    s.on('exit', (code) => this.emit('exit', s.id, code));
    return s;
  }

  stop(id) {
    const s = this.sessions.get(id);
    if (!s) return;
    s.removeAllListeners();
    s.kill();
    this.sessions.delete(id);
  }

  stopAll() { for (const id of [...this.sessions.keys()]) this.stop(id); }
}

module.exports = { SessionManager, Session };
