// Persistência local: um state.json (workspaces, papéis, partituras) e notas em Markdown.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const uid = (p = '') => p + crypto.randomBytes(5).toString('hex');

// `launch` é executado pelo shell do usuário; $REGENTE_SYSTEM_PROMPT carrega papel + instruções de orquestração.
const DEFAULT_AGENTS = [
  { id: 'claude', label: 'Claude Code', launch: 'claude --append-system-prompt "$REGENTE_SYSTEM_PROMPT"' },
  { id: 'codex', label: 'Codex', launch: 'codex "$REGENTE_SYSTEM_PROMPT"' },
  { id: 'gemini', label: 'Gemini CLI', launch: 'gemini -i "$REGENTE_SYSTEM_PROMPT"' },
  { id: 'opencode', label: 'OpenCode', launch: 'opencode --prompt "$REGENTE_SYSTEM_PROMPT"' },
  { id: 'shell', label: 'Shell', launch: '' },
];

const DEFAULT_ROLES = [
  { id: 'r-lead', name: 'Maestro', prompt: 'Você é o agente coordenador. Quebre a tarefa em partes, delegue aos terminais conectados com `regente ask` / `regente send`, acompanhe o progresso e integre os resultados. Não implemente tudo sozinho quando houver colegas conectados.' },
  { id: 'r-bug', name: 'Caçador de Bugs', prompt: 'Sua responsabilidade é encontrar a causa raiz de bugs. Reproduza antes de corrigir, escreva um teste que falha, corrija o mínimo necessário e explique a causa.' },
  { id: 'r-review', name: 'Revisor', prompt: 'Você revisa código. Procure bugs reais, regressões e riscos de segurança. Seja específico (arquivo:linha) e não reescreva código que está correto.' },
  { id: 'r-test', name: 'Testador', prompt: 'Você escreve e roda testes. Garanta cobertura dos casos de borda e reporte falhas com a saída exata.' },
  { id: 'r-docs', name: 'Documentador', prompt: 'Você mantém a documentação (README, comentários de API, changelog) sincronizada com o código.' },
  { id: 'r-refactor', name: 'Refatorador', prompt: 'Você simplifica código sem mudar comportamento. Faça mudanças pequenas e verificáveis, rodando os testes a cada passo.' },
  { id: 'r-git', name: 'Mago do Git', prompt: 'Você cuida do git: branches, commits atômicos com boas mensagens, rebase e resolução de conflitos. Nunca force push sem pedir.' },
  { id: 'r-perf', name: 'Performance', prompt: 'Você mede antes de otimizar. Encontre gargalos com profiling e proponha melhorias com números de antes/depois.' },
];

function newWorkspace(name, cwd) {
  return {
    id: uid('w-'), name, cwd: cwd || os.homedir(),
    view: { x: 0, y: 0, zoom: 1 },
    nodes: [], edges: [], drawings: [],
    createdAt: Date.now(),
  };
}

class Store {
  constructor(dir) {
    this.dir = dir;
    this.notesDir = path.join(dir, 'notes');
    this.file = path.join(dir, 'state.json');
    fs.mkdirSync(this.notesDir, { recursive: true });
    this.state = this.load();
    this.timer = null;
  }

  load() {
    let s = null;
    try { s = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch {}
    if (!s || !Array.isArray(s.workspaces)) {
      const ws = newWorkspace('Principal', os.homedir());
      s = { version: 1, activeWorkspace: ws.id, workspaces: [ws], roles: DEFAULT_ROLES, scores: [], agents: DEFAULT_AGENTS, settings: {} };
    }
    s.roles ||= DEFAULT_ROLES;
    s.scores ||= [];
    s.settings ||= {};
    // Garante que presets novos apareçam sem apagar os personalizados.
    s.agents ||= [];
    for (const a of DEFAULT_AGENTS) if (!s.agents.find((x) => x.id === a.id)) s.agents.push(a);
    if (!s.workspaces.find((w) => w.id === s.activeWorkspace)) s.activeWorkspace = s.workspaces[0].id;
    return s;
  }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 300);
  }

  flush() {
    clearTimeout(this.timer);
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmp, this.file);
  }

  workspace(id) { return this.state.workspaces.find((w) => w.id === id); }

  // Procura um nó em qualquer workspace.
  findNode(nodeId) {
    for (const ws of this.state.workspaces) {
      const node = ws.nodes.find((n) => n.id === nodeId);
      if (node) return { ws, node };
    }
    return null;
  }

  // Nós ligados diretamente a nodeId por uma conexão.
  neighbors(nodeId) {
    const hit = this.findNode(nodeId);
    if (!hit) return [];
    const ids = new Set();
    for (const e of hit.ws.edges) {
      if (e.from === nodeId) ids.add(e.to);
      if (e.to === nodeId) ids.add(e.from);
    }
    return hit.ws.nodes.filter((n) => ids.has(n.id));
  }

  notePath(id) { return path.join(this.notesDir, id.replace(/[^\w-]/g, '') + '.md'); }
  readNote(id) { try { return fs.readFileSync(this.notePath(id), 'utf8'); } catch { return ''; } }
  writeNote(id, text) { fs.writeFileSync(this.notePath(id), text); }
}

module.exports = { Store, newWorkspace, uid };
