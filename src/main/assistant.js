// "Ponto": quando um agente termina um turno, resume o que aconteceu e sugere próximos passos.
// Usa um CLI de LLM configurável (padrão: `claude -p` com um modelo pequeno). Opcional e desligado por padrão.
const { spawn } = require('child_process');

const PROMPT = (name, screen) => `Você observa um agente de código chamado "${name}" que acabou de terminar um turno num terminal.
Abaixo está o fim da tela dele. Responda APENAS com JSON válido, sem markdown, no formato:
{"summary": "2-3 frases dizendo o que o agente fez e o estado atual", "followups": ["próximo passo 1", "próximo passo 2", "próximo passo 3"]}
Os próximos passos são mensagens curtas que o usuário enviaria ao agente; priorize verificação (revisar o diff, rodar/escrever testes, rodar o build, testar manualmente).
Escreva no mesmo idioma que o agente usou.

--- TELA ---
${screen}`;

class Assistant {
  constructor({ store, sessions, send, env }) {
    Object.assign(this, { store, sessions, send, env });
    this.timers = new Map();
    this.busy = false;
  }

  get cfg() { return this.store.state.settings.assistant || {}; }

  onTurnEnd(id) {
    if (!this.cfg.enabled) return;
    const hit = this.store.findNode(id);
    if (!hit || hit.node.agent === 'shell') return;
    clearTimeout(this.timers.get(id));
    // Espera a tela assentar; se o agente voltar a trabalhar, cancela.
    this.timers.set(id, setTimeout(() => {
      if (this.sessions.get(id)?.status === 'idle') this.summarize(id).catch(() => {});
    }, 4000));
  }

  async summarize(id, manual) {
    const hit = this.store.findNode(id);
    const s = this.sessions.get(id);
    if (!hit || !s) throw new Error('terminal não está rodando');
    if (this.busy && !manual) return null;
    this.busy = true;
    try {
      const out = await this.run(PROMPT(hit.node.title, s.screenText(120)));
      const json = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
      const card = { id, workspaceId: hit.ws.id, title: hit.node.title, summary: String(json.summary || ''), followups: (json.followups || []).slice(0, 3).map(String), at: Date.now() };
      this.send('assistant:card', card);
      return card;
    } finally { this.busy = false; }
  }

  run(prompt) {
    const cmd = this.cfg.command || 'claude -p --model haiku';
    return new Promise((resolve, reject) => {
      const p = spawn(process.env.SHELL || '/bin/sh', ['-c', cmd], { env: this.env ? this.env() : process.env });
      let out = '', err = '';
      const t = setTimeout(() => { p.kill(); reject(new Error('assistente: tempo esgotado')); }, 90000);
      p.stdout.on('data', (d) => { out += d; });
      p.stderr.on('data', (d) => { err += d; });
      p.on('error', (e) => { clearTimeout(t); reject(e); });
      p.on('close', (code) => { clearTimeout(t); code === 0 ? resolve(out) : reject(new Error(err.trim() || `assistente saiu com ${code}`)); });
      p.stdin.end(prompt);
    });
  }
}

module.exports = { Assistant };
