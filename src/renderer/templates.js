// Arranjos prontos. Usam o formato das partituras; agent "$default" vira o agente preferido do usuário.
const term = (id, title, x, y, extra = {}) => ({ id, type: 'terminal', agent: '$default', title, x, y, w: 720, h: 440, ...extra });
const note = (id, title, x, y, extra = {}) => ({ id, type: 'note', title, x, y, w: 380, h: 300, ...extra });
const edges = (...pairs) => pairs.map(([from, to], i) => ({ id: 'e' + i, from, to }));
const title = (text, x, y) => ({ id: 'd-title', kind: 'text', points: [[x, y]], text, color: '#1d1d1f', size: 40 });
const underline = (x, y, w) => ({ id: 'd-line', kind: 'pen', color: '#e5383b', width: 4, points: [[x, y], [x + w * 0.45, y + 4], [x + w, y - 2]] });

export const TEMPLATES = [
  {
    id: 't-solo', name: 'Solo', icon: 'square-terminal',
    description: 'Um agente e uma nota de plano conectada. Bom para começar.',
    nodes: [term('a', 'Dev', 0, 0), note('p', 'Plano', 780, 0)],
    edges: edges(['a', 'p']),
    drawings: [],
    notes: { p: '# Plano\n\n- [ ] descrever a tarefa\n' },
  },
  {
    id: 't-pair', name: 'Dev + Revisor', icon: 'users',
    description: 'Um agente implementa e pede revisão ao outro com regente ask.',
    nodes: [term('a', 'Dev', 0, 0), term('b', 'Revisor', 800, 0, { roleId: 'r-review' }), note('p', 'Decisões', 170, 520)],
    edges: edges(['a', 'b'], ['a', 'p']),
    drawings: [title('Par', 0, -50), underline(0, -38, 70)],
    notes: { p: '# Decisões\n' },
  },
  {
    id: 't-team', name: 'Equipe com Maestro', icon: 'music-4',
    description: 'Um coordenador quebra a tarefa e delega para dois devs e um testador. O progresso vai para a nota.',
    nodes: [
      term('m', 'Maestro', 0, 260, { roleId: 'r-lead' }),
      term('a', 'Dev A', 860, -40, { w: 640, h: 380 }),
      term('b', 'Dev B', 860, 380, { w: 640, h: 380 }),
      term('t', 'Testador', 860, 800, { roleId: 'r-test', w: 640, h: 380 }),
      note('p', 'Plano', 170, -120, { w: 400, h: 300 }),
    ],
    edges: edges(['m', 'a'], ['m', 'b'], ['m', 't'], ['m', 'p']),
    drawings: [title('Equipe', 0, -170), underline(0, -158, 130)],
    notes: { p: '# Plano\n\nO Maestro mantém esta lista atualizada.\n\n- [ ] \n' },
  },
  {
    id: 't-front', name: 'Frontend com portal', icon: 'globe',
    description: 'Um dev com um navegador conectado: ele abre o app, lê a tela, clica e testa sozinho.',
    nodes: [
      term('a', 'Frontend', 0, 0),
      { id: 'w', type: 'portal', title: 'App', x: 780, y: 0, w: 900, h: 620, url: 'http://localhost:3000' },
      term('r', 'Revisor', 0, 500, { roleId: 'r-review', h: 380 }),
    ],
    edges: edges(['a', 'w'], ['a', 'r']),
    drawings: [],
    notes: {},
  },
  {
    id: 't-bug', name: 'Caça ao bug', icon: 'crosshair',
    description: 'Caçador investiga a causa raiz, Testador escreve o teste que falha, e um shell fica livre para logs.',
    nodes: [
      term('c', 'Caçador', 0, 0, { roleId: 'r-bug' }),
      term('t', 'Testador', 780, 0, { roleId: 'r-test' }),
      { id: 's', type: 'terminal', agent: 'shell', title: 'Logs', x: 0, y: 500, w: 720, h: 320 },
      note('n', 'Hipóteses', 780, 500),
    ],
    edges: edges(['c', 't'], ['c', 's'], ['c', 'n']),
    drawings: [],
    notes: { n: '# Hipóteses\n\n- \n' },
  },
];

export const INSTALL_HINTS = {
  claude: 'npm i -g @anthropic-ai/claude-code',
  codex: 'npm i -g @openai/codex',
  gemini: 'npm i -g @google/gemini-cli',
  opencode: 'npm i -g opencode-ai',
};
