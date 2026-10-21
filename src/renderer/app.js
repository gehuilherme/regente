import { el, menu, menuBelow, modal, prompt, confirmBox, toast, debounce, uid, ic, hydrateIcons } from './ui.js';
import { TerminalView, NoteView, PortalView, termTheme } from './nodes.js';
import { TEMPLATES, INSTALL_HINTS } from './templates.js';

const api = window.regente;
const $ = (s) => document.querySelector(s);
const viewport = $('#viewport');
const pan = $('#pan');
const world = $('#world');
const nodesLayer = $('#nodes');
const edgesSvg = $('#edges');
const drawSvg = $('#drawings');
const overlay = $('#draw-overlay');
const SVGNS = 'http://www.w3.org/2000/svg';

const S = {
  state: null,
  ws: null,
  frames: new Map(), // nodeId -> { el, view, dot, meta }
  statuses: {},
  titles: {},
  queues: {},
  pending: new Map(), // msgId -> "from|to"
  selected: null,
  selectedEdge: null,
  tool: 'select',
  log: [],
  space: false,
  color: '#2f6df6',
  stroke: 3,
  filter: '',
};

const SWATCHES = ['#1d1d1f', '#2f6df6', '#e5383b', '#26b36b', '#f0a020', '#a23fc9'];
const WS_COLORS = ['#2f6df6', '#26b36b', '#a23fc9', '#f0a020', '#e5383b', '#0f8ea1', '#8b8b93'];

const saveWs = debounce(() => S.ws && api.saveWorkspace(S.ws), 250);
const saveView = debounce(() => S.ws && api.saveWorkspace(S.ws), 600);
const settings = () => S.state.settings;

// Contexto compartilhado com as views dos nós.
const ctx = {
  save: () => saveWs(),
  settings,
  roles: () => S.state.roles,
  zoom: () => S.ws.view.zoom,
  neighbors: (id) => neighbors(id),
  setStatus: (id, st) => setStatus(id, st),
  refreshMeta: (id) => refreshMeta(id),
  isGlobalShortcut: (e) => isGlobalShortcut(e),
  askAssistant: (id) => askAssistant(id),
};

// ---------- workspace ----------

function neighbors(id) {
  const ids = new Set();
  for (const e of S.ws.edges) {
    if (e.from === id) ids.add(e.to);
    if (e.to === id) ids.add(e.from);
  }
  return S.ws.nodes.filter((n) => ids.has(n.id));
}

function showWorkspace(id) {
  const ws = S.state.workspaces.find((w) => w.id === id) || S.state.workspaces[0];
  S.ws = ws;
  S.state.activeWorkspace = ws.id;
  api.patchState({ activeWorkspace: ws.id });
  S.selected = null;
  S.selectedEdge = null;
  nodesLayer.replaceChildren();
  for (const n of ws.nodes) nodesLayer.append(frameFor(n).el);
  for (const n of ws.nodes) S.frames.get(n.id).view.attach();
  applyView();
  renderEdges();
  renderDrawings();
  renderTabs();
  renderFloorbar();
  updateEmpty();
}

function updateEmpty() { $('#empty-hint').hidden = S.ws.nodes.length > 0 || S.ws.drawings.length > 0; }

function wsStats(w) {
  let terms = 0, waiting = 0, working = 0;
  for (const n of w.nodes) {
    if (n.type !== 'terminal') continue;
    terms++;
    if (S.statuses[n.id] === 'waiting') waiting++;
    if (S.statuses[n.id] === 'working') working++;
  }
  return { terms, waiting, working };
}

// Barra lateral: workspaces agrupados por projeto, andares aninhados sob o original.
function renderTabs() {
  const list = $('#ws-list');
  const all = S.state.workspaces;
  const q = S.filter.toLowerCase();
  const collapsed = new Set(settings().collapsedGroups || []);
  const groups = [];
  for (const w of all) {
    if (w.parentId && all.some((p) => p.id === w.parentId)) continue;
    const g = w.group || 'Projetos';
    if (!groups.includes(g)) groups.push(g);
  }
  for (const g of settings().groups || []) if (!groups.includes(g)) groups.push(g);
  const row = (w, i) => {
    const st = wsStats(w);
    const color = w.color || WS_COLORS[i % WS_COLORS.length];
    return el('div', {
      class: 'ws-row' + (w.id === S.ws.id ? ' active' : '') + (w.parentId ? ' floor' : ''), title: w.cwd,
      onclick: () => w.id !== S.ws.id && showWorkspace(w.id),
      ondblclick: () => renameWorkspace(w),
      oncontextmenu: (e) => { e.preventDefault(); workspaceMenu(w, e.clientX, e.clientY); },
    },
    el('span', { class: 'ws-icon', style: { color } }, ic(w.floor ? 'layers-2' : w.icon || 'app-window')),
    el('span', { class: 'name' }, w.name),
    i < 9 && el('span', { class: 'kbd' }, `^${i + 1}`),
    el('span', { class: 'count' },
      st.waiting ? el('span', { class: 'alert' }, st.waiting) : st.working ? el('span', { class: 'busy' }) : null,
      ic('square-terminal'), st.terms));
  };
  const out = [];
  for (const g of groups) {
    const members = all.filter((w) => !w.parentId && (w.group || 'Projetos') === g);
    const visible = members.filter((w) => !q || w.name.toLowerCase().includes(q) || all.some((f) => f.parentId === w.id && f.name.toLowerCase().includes(q)));
    if (q && !visible.length) continue;
    const head = el('div', {
      class: 'group-head' + (collapsed.has(g) ? ' collapsed' : ''),
      onclick: () => { collapsed.has(g) ? collapsed.delete(g) : collapsed.add(g); settings().collapsedGroups = [...collapsed]; api.patchState({ settings: settings() }); renderTabs(); },
      oncontextmenu: (e) => { e.preventDefault(); groupMenu(g, e.clientX, e.clientY); },
    }, ic('chevron-down'), g);
    out.push(head);
    if (collapsed.has(g) && !q) continue;
    for (const w of visible) {
      out.push(row(w, all.indexOf(w)));
      for (const f of all.filter((x) => x.parentId === w.id)) out.push(row(f, all.indexOf(f)));
    }
  }
  list.replaceChildren(...out);
}
function groupMenu(g, x, y) {
  menu(x, y, [
    { label: 'Renomear grupo', action: async () => {
      const name = await prompt('Renomear grupo', g);
      if (!name) return;
      for (const w of S.state.workspaces) if ((w.group || 'Projetos') === g) { w.group = name; api.saveWorkspace(w); }
      settings().groups = (settings().groups || []).map((x) => (x === g ? name : x));
      api.patchState({ settings: settings() });
      renderTabs();
    } },
    { label: 'Novo workspace aqui', action: () => newWorkspace(g) },
  ]);
}
const renderTabsSoon = debounce(renderTabs, 150);

async function renameWorkspace(w) {
  const name = await prompt('Renomear workspace', w.name);
  if (!name) return;
  w.name = name;
  await api.renameWorkspace({ id: w.id, name });
  renderTabs();
}

function workspaceMenu(w, x, y) {
  const persist = () => { if (w === S.ws) saveWs(); else api.saveWorkspace(w); renderTabs(); };
  menu(x, y, [
    { label: 'Renomear', action: () => renameWorkspace(w) },
    { label: 'Mover para grupo…', hint: w.group || 'Projetos', action: async () => {
      const g = await prompt('Grupo (projeto)', w.group || 'Projetos');
      if (g) { w.group = g; persist(); }
    } },
    { label: 'Trocar cor do ícone', action: () => { w.color = WS_COLORS[(WS_COLORS.indexOf(w.color) + 1) % WS_COLORS.length]; persist(); } },
    { label: 'Pasta do projeto…', hint: w.cwd, action: async () => {
      const dir = await api.pickDir(w.cwd);
      if (dir) { w.cwd = dir; if (w === S.ws) saveWs(); else api.saveWorkspace(w); renderTabs(); }
    } },
    { label: 'Criar andar a partir deste', action: () => createFloor(w) },
    'sep',
    { label: 'Excluir workspace', action: async () => {
      if (!(await confirmBox('Excluir workspace', `"${w.name}" e todos os seus terminais serão fechados.`))) return;
      for (const n of w.nodes) disposeFrame(n.id);
      if (await api.deleteWorkspace(w.id)) {
        S.state.workspaces = S.state.workspaces.filter((x) => x.id !== w.id);
        showWorkspace(S.state.workspaces[0].id);
      } else toast('Não dá para excluir o último workspace', true);
    } },
  ]);
}

async function newWorkspace(group) {
  const name = await prompt('Nome do novo workspace', `Workspace ${S.state.workspaces.length + 1}`);
  if (!name) return;
  const cwd = (await api.pickDir(S.ws.cwd)) || S.ws.cwd;
  const ws = await api.createWorkspace({ name, cwd });
  ws.group = typeof group === 'string' ? group : S.ws.group;
  ws.color = WS_COLORS[S.state.workspaces.length % WS_COLORS.length];
  await api.saveWorkspace(ws);
  S.state.workspaces.push(ws);
  showWorkspace(ws.id);
}

function cycleWorkspace(dir) {
  const list = S.state.workspaces;
  const i = list.indexOf(S.ws);
  showWorkspace(list[(i + dir + list.length) % list.length].id);
}

// ---------- andares ----------

async function createFloor(w = S.ws) {
  const name = await prompt('Novo andar', 'experimento', {
    hint: 'Um andar é uma cópia isolada do workspace. Em repositórios git vira um git worktree numa branch própria (regente/<nome>); fora do git, uma cópia da pasta. Os agentes do andar trabalham sem tocar no original.',
  });
  if (!name) return;
  try {
    toast('Criando andar…');
    const ws = await api.floorCreate({ workspaceId: w.id, name });
    S.state.workspaces.push(ws);
    showWorkspace(ws.id);
    toast(`Andar criado em ${ws.floor.dir}`);
  } catch (e) { toast(e.message, true); }
}

function renderFloorbar() {
  const bar = $('#floorbar');
  const f = S.ws.floor;
  bar.hidden = !f;
  if (!f) return;
  const parent = S.state.workspaces.find((w) => w.id === S.ws.parentId);
  bar.replaceChildren(
    ic('layers-2'), el('b', {}, 'Andar'),
    f.kind === 'git' ? el('span', {}, 'branch ', el('code', {}, f.branch), ' a partir de ', el('code', {}, f.base)) : el('span', {}, 'cópia de ', el('code', {}, f.root)),
    el('span', {}, 'em ', el('code', {}, f.dir)),
    el('span', { class: 'spacer' }),
    parent && el('button', { class: 'outline', onclick: () => showWorkspace(parent.id) }, 'Ir para o original'),
    f.kind === 'git' && el('button', { class: 'primary', onclick: landFloor }, 'Pousar (merge)'),
    el('button', { class: 'danger', onclick: discardFloor }, 'Descartar andar'),
  );
}

async function landFloor() {
  if (!(await confirmBox('Pousar andar', `Fazer merge da branch ${S.ws.floor.branch} em ${S.ws.floor.base} no repositório original?`))) return;
  try { toast(await api.floorLand(S.ws.id) || 'Andar pousado'); } catch (e) { toast(e.message, true); }
}

async function discardFloor() {
  if (!(await confirmBox('Descartar andar', `O worktree/cópia em ${S.ws.floor.dir} será apagado, junto com a branch. Isso não pode ser desfeito.`))) return;
  try {
    for (const n of S.ws.nodes) disposeFrame(n.id);
    const next = await api.floorDiscard(S.ws.id);
    S.state.workspaces = S.state.workspaces.filter((w) => w.id !== S.ws.id);
    showWorkspace(next);
  } catch (e) { toast(e.message, true); }
}

// ---------- câmera ----------

function applyView() {
  const v = S.ws.view;
  pan.style.transform = `translate(${v.x}px, ${v.y}px)`;
  world.style.zoom = v.zoom;
  viewport.style.backgroundSize = `${28 * v.zoom}px ${28 * v.zoom}px`;
  viewport.style.backgroundPosition = `${v.x}px ${v.y}px`;
  $('#zoom-indicator').textContent = `${Math.round(v.zoom * 100)}%`;
  for (const f of S.frames.values()) if (f.view instanceof PortalView && f.el.isConnected) f.view.syncZoom();
}

function setView(x, y, zoom, animate) {
  const v = S.ws.view;
  zoom = Math.min(3, Math.max(0.1, zoom));
  if (!animate) { Object.assign(v, { x, y, zoom }); applyView(); saveView(); return; }
  const from = { ...v };
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 220);
    const e = 1 - Math.pow(1 - k, 3);
    v.x = from.x + (x - from.x) * e;
    v.y = from.y + (y - from.y) * e;
    v.zoom = from.zoom + (zoom - from.zoom) * e;
    applyView();
    if (k < 1) requestAnimationFrame(step);
    else { saveView(); refitVisible(); }
  };
  requestAnimationFrame(step);
}

const refitVisible = debounce(() => { for (const n of S.ws.nodes) S.frames.get(n.id)?.view.refit?.(); }, 150);

function toWorld(cx, cy) {
  const r = viewport.getBoundingClientRect();
  const v = S.ws.view;
  return { x: (cx - r.left - v.x) / v.zoom, y: (cy - r.top - v.y) / v.zoom };
}

function zoomAt(cx, cy, factor) {
  const r = viewport.getBoundingClientRect();
  const v = S.ws.view;
  const p = toWorld(cx, cy);
  const z = Math.min(3, Math.max(0.1, v.zoom * factor));
  setView(cx - r.left - p.x * z, cy - r.top - p.y * z, z);
  refitVisible();
}

// Área útil do canvas: desconta a barra lateral e as barras flutuantes.
function usableRect() {
  const r = viewport.getBoundingClientRect();
  const left = document.body.classList.contains('side-hidden') ? 0 : $('#sidebar').getBoundingClientRect().right;
  return { left, top: 60, width: r.width - left, height: r.height - 120 };
}

function zoomToRect(x, y, w, h, maxZoom = 1.5) {
  const u = usableRect();
  const z = Math.min(maxZoom, (u.width * 0.94) / w, (u.height * 0.96) / h);
  setView(u.left + u.width / 2 - (x + w / 2) * z, u.top + u.height / 2 - (y + h / 2) * z, z, true);
}

function zoomToNode(n) { zoomToRect(n.x, n.y, n.w, n.h, 1.6); select(n.id, true); }

function fitAll() {
  const items = [...S.ws.nodes.map((n) => [n.x, n.y, n.x + n.w, n.y + n.h])];
  for (const d of S.ws.drawings) for (const [x, y] of d.points) items.push([x, y, x, y]);
  if (!items.length) return setView(0, 0, 1, true);
  const x0 = Math.min(...items.map((i) => i[0])), y0 = Math.min(...items.map((i) => i[1]));
  const x1 = Math.max(...items.map((i) => i[2])), y1 = Math.max(...items.map((i) => i[3]));
  zoomToRect(x0 - 40, y0 - 40, x1 - x0 + 80, y1 - y0 + 80, 1);
}

function viewportCenterWorld() {
  const u = usableRect();
  return toWorld(u.left + u.width / 2, u.top + u.height / 2);
}

// ---------- nós ----------

function frameFor(n) {
  let f = S.frames.get(n.id);
  if (f) { f.node = n; f.view.node = n; return f; }
  const View = n.type === 'terminal' ? TerminalView : n.type === 'note' ? NoteView : PortalView;
  const view = new View(n, ctx);
  const dot = el('span', { class: 'dot ' + (S.statuses[n.id] || (n.type === 'terminal' ? 'exited' : '')) });
  if (n.type !== 'terminal') dot.style.display = 'none';
  const kind = el('span', { class: 'kind' }, ic({ terminal: 'square-terminal', note: 'sticky-note', portal: 'globe' }[n.type]));
  const title = el('span', { class: 'title', title: 'Duplo clique para renomear' }, n.title);
  const meta = el('span', { class: 'meta' });
  const head = el('div', { class: 'node-head' },
    kind, dot, title, meta, ...view.headerExtras(),
    el('button', { title: 'Focar (Ctrl+Enter)', onclick: () => zoomToNode(f.node) }, ic('maximize-2')),
    el('button', { title: 'Fechar', class: 'danger', onclick: () => removeNode(f.node) }, ic('x')));
  const root = el('div', { class: `node ${n.type}`, 'data-id': n.id },
    head, view.body, el('div', { class: 'handle', title: 'Arraste até outro nó para conectar' }), el('div', { class: 'resize' }));
  title.addEventListener('dblclick', (e) => { e.stopPropagation(); editTitle(f, title); });
  root.addEventListener('pointerdown', () => select(f.node.id, false), true);
  head.addEventListener('dblclick', (e) => { if (e.target === head || e.target === meta) zoomToNode(f.node); });
  f = { el: root, view, dot, meta, title, node: n };
  S.frames.set(n.id, f);
  position(f);
  refreshMeta(n.id);
  return f;
}

function position(f) {
  const n = f.node;
  Object.assign(f.el.style, { left: n.x + 'px', top: n.y + 'px', width: n.w + 'px', height: n.h + 'px' });
}

function editTitle(f, title) {
  title.contentEditable = 'true';
  title.focus();
  document.getSelection().selectAllChildren(title);
  const done = () => {
    title.contentEditable = 'false';
    const t = title.textContent.trim();
    if (t && t !== f.node.title) {
      if (S.ws.nodes.some((x) => x !== f.node && x.title.toLowerCase() === t.toLowerCase())) { toast('Já existe um nó com esse nome', true); title.textContent = f.node.title; return; }
      f.node.title = t; saveWs(); refreshMeta(f.node.id);
    } else title.textContent = f.node.title;
  };
  title.addEventListener('blur', done, { once: true });
  title.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); title.blur(); } });
}

function refreshMeta(id) {
  const f = S.frames.get(id);
  if (!f) return;
  const n = f.node;
  const bits = [];
  if (n.type === 'terminal') {
    const agent = S.state.agents.find((a) => a.id === n.agent);
    bits.push(agent?.label || n.agent);
    const termTitle = S.titles[id];
    bits.push(termTitle || (n.cwd || S.ws.cwd || '').split('/').pop());
  } else if (n.type === 'portal') bits.push(f.view.title || n.url || '');
  else bits.push('nota');
  f.meta.replaceChildren(bits.filter(Boolean).join(' · '));
  if (n.statusText) f.meta.append(' · ', el('span', { class: 'status-text' }, n.statusText));
  if (S.queues[id]) f.meta.append(' ', el('span', { class: 'queue-badge', title: 'mensagens na fila' }, S.queues[id]));
  f.meta.title = f.meta.textContent;
}

function setStatus(id, st) {
  S.statuses[id] = st;
  const f = S.frames.get(id);
  if (f) {
    f.dot.className = 'dot ' + st;
    f.el.classList.remove('st-working', 'st-waiting', 'st-idle', 'st-exited', 'st-starting');
    f.el.classList.add('st-' + st);
  }
  renderTabsSoon();
}

function select(id, focus) {
  S.selected = id;
  S.selectedEdge = null;
  for (const [fid, f] of S.frames) f.el.classList.toggle('selected', fid === id);
  renderEdges();
  if (focus) S.frames.get(id)?.view.focus();
}

function uniqueTitle(base) {
  const names = new Set(S.ws.nodes.map((n) => n.title.toLowerCase()));
  for (let i = 1; ; i++) { const t = `${base} ${i}`; if (!names.has(t.toLowerCase())) return t; }
}

function addNode(partial) {
  const c = viewportCenterWorld();
  const n = { id: uid('n-'), x: Math.round(c.x - partial.w / 2), y: Math.round(c.y - partial.h / 2), ...partial };
  // Evita empilhar exatamente em cima de outro nó.
  while (S.ws.nodes.some((o) => Math.abs(o.x - n.x) < 30 && Math.abs(o.y - n.y) < 30)) { n.x += 40; n.y += 40; }
  S.ws.nodes.push(n);
  const f = frameFor(n);
  nodesLayer.append(f.el);
  f.view.attach();
  select(n.id, true);
  saveWs();
  updateEmpty();
  return n;
}

function addTerminal(agentId, roleId) {
  const agent = S.state.agents.find((a) => a.id === agentId);
  return addNode({ type: 'terminal', agent: agentId, roleId, title: uniqueTitle(agent.label.split(' ')[0]), w: 760, h: 460, cwd: S.ws.cwd });
}

function terminalMenu(x, y) {
  const items = S.state.agents.map((a) => ({ label: a.label, hint: a.launch.split(' ')[0] || '$SHELL', action: () => addTerminal(a.id) }));
  items.push('sep', { label: 'Com papel…', action: () => pickRoleThenAdd(x, y) });
  menu(x, y, items);
}

function pickRoleThenAdd(x, y) {
  menu(x, y, S.state.roles.map((r) => ({
    label: r.name,
    action: () => menu(x, y, S.state.agents.filter((a) => a.id !== 'shell').map((a) => ({ label: a.label, action: () => addTerminal(a.id, r.id) }))),
  })));
}

function addNote() { return addNode({ type: 'note', title: uniqueTitle('Nota'), w: 380, h: 300 }); }

async function addPortal() {
  const url = await prompt('Endereço do portal', 'http://localhost:3000', { hint: 'Agentes conectados podem navegar, ler a árvore de elementos, clicar e digitar: regente portal <nome> snapshot | click <ref> | type <ref> <texto>' });
  if (!url) return;
  const n = addNode({ type: 'portal', title: uniqueTitle('Portal'), w: 960, h: 640, url: /^[a-z]+:/i.test(url) ? url : 'http://' + url });
  return n;
}

async function removeNode(n) {
  if (n.type === 'terminal' && ['working', 'waiting'].includes(S.statuses[n.id])) {
    if (!(await confirmBox('Fechar terminal', `"${n.title}" ainda está trabalhando. Fechar mesmo assim?`))) return;
  }
  disposeFrame(n.id);
  S.ws.nodes = S.ws.nodes.filter((x) => x.id !== n.id);
  S.ws.edges = S.ws.edges.filter((e) => e.from !== n.id && e.to !== n.id);
  renderEdges();
  saveWs();
  updateEmpty();
}

function disposeFrame(id) {
  const f = S.frames.get(id);
  if (!f) return;
  f.view.dispose();
  f.el.remove();
  S.frames.delete(id);
}

// ---------- conexões ----------

function anchors(a, b) {
  const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const dx = cb.x - ca.x, dy = cb.y - ca.y;
  if (Math.abs(dx) * (a.h + b.h) > Math.abs(dy) * (a.w + b.w)) {
    const s = Math.sign(dx) || 1;
    return [{ x: ca.x + s * a.w / 2, y: ca.y, dx: s, dy: 0 }, { x: cb.x - s * b.w / 2, y: cb.y, dx: -s, dy: 0 }];
  }
  const s = Math.sign(dy) || 1;
  return [{ x: ca.x, y: ca.y + s * a.h / 2, dx: 0, dy: s }, { x: cb.x, y: cb.y - s * b.h / 2, dx: 0, dy: -s }];
}

function curve(p, q) {
  const k = Math.max(40, Math.hypot(q.x - p.x, q.y - p.y) / 3);
  return `M${p.x},${p.y} C${p.x + p.dx * k},${p.y + p.dy * k} ${q.x + q.dx * k},${q.y + q.dy * k} ${q.x},${q.y}`;
}

function svg(tag, attrs = {}) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function renderEdges() {
  const byId = new Map(S.ws.nodes.map((n) => [n.id, n]));
  const pendingPairs = new Set(S.pending.values());
  edgesSvg.replaceChildren(...S.ws.edges.map((e) => {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) return svg('g');
    const [p, q] = anchors(a, b);
    const d = curve(p, q);
    const pending = pendingPairs.has(`${e.from}|${e.to}`) || pendingPairs.has(`${e.to}|${e.from}`);
    const g = svg('g', { class: [S.selectedEdge === e.id && 'selected', pending && 'pending'].filter(Boolean).join(' '), 'data-id': e.id });
    const line = svg('path', { d, class: 'line' });
    const hit = svg('path', { d, class: 'hit' });
    const ends = [p, q].map((pt) => svg('circle', { cx: pt.x, cy: pt.y, r: 4.5, class: 'end' }));
    hit.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); S.selectedEdge = e.id; S.selected = null; for (const f of S.frames.values()) f.el.classList.remove('selected'); renderEdges(); });
    hit.addEventListener('contextmenu', (ev) => { ev.preventDefault(); menu(ev.clientX, ev.clientY, [{ label: 'Remover conexão', action: () => removeEdge(e.id) }]); });
    g.append(line, ...ends, hit);
    return g;
  }));
}

function removeEdge(id) {
  S.ws.edges = S.ws.edges.filter((e) => e.id !== id);
  S.selectedEdge = null;
  renderEdges();
  saveWs();
}

function connect(from, to) {
  if (from === to || S.ws.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))) return;
  S.ws.edges.push({ id: uid('e-'), from, to });
  renderEdges();
  saveWs();
  const a = S.ws.nodes.find((n) => n.id === from), b = S.ws.nodes.find((n) => n.id === to);
  toast(`${a.title} ⇄ ${b.title} conectados`);
}

// Bolinha percorrendo a conexão quando uma mensagem passa entre agentes.
function pulse(from, to) {
  const g = [...edgesSvg.children].find((g) => {
    const e = S.ws.edges.find((x) => x.id === g.dataset.id);
    return e && ((e.from === from && e.to === to) || (e.from === to && e.to === from));
  });
  const path = g?.querySelector('path.line');
  if (!path) return;
  const e = S.ws.edges.find((x) => x.id === g.dataset.id);
  const reverse = e.from !== from;
  const len = path.getTotalLength();
  const c = svg('circle', { r: 6, class: 'pulse' });
  edgesSvg.append(c);
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 700);
    const pt = path.getPointAtLength((reverse ? 1 - k : k) * len);
    c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y);
    if (k < 1) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}

// ---------- desenho ----------

function renderDrawings() {
  let defs = svg('defs');
  const marker = svg('marker', { id: 'arrowhead', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
  marker.append(svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'context-stroke' }));
  defs.append(marker);
  drawSvg.replaceChildren(defs, ...S.ws.drawings.map(drawingEl));
}

function drawingEl(d) {
  let e;
  const common = { stroke: d.color, 'stroke-width': d.width || 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-id': d.id };
  if (d.kind === 'pen') e = svg('path', { ...common, d: 'M' + d.points.map((p) => p.join(',')).join(' L') });
  else if (d.kind === 'arrow') {
    const [[x1, y1], [x2, y2]] = d.points;
    e = svg('line', { ...common, x1, y1, x2, y2, 'marker-end': 'url(#arrowhead)' });
  } else if (d.kind === 'rect') {
    const [[x1, y1], [x2, y2]] = d.points;
    e = svg('rect', { ...common, x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), rx: 8 });
  } else if (d.kind === 'text') {
    const [[x, y]] = d.points;
    e = svg('text', { x, y, fill: d.color, 'font-size': d.size || 28, 'data-id': d.id });
    e.textContent = d.text;
  }
  e.addEventListener('pointerdown', (ev) => {
    if (S.tool !== 'erase') return;
    ev.stopPropagation();
    S.ws.drawings = S.ws.drawings.filter((x) => x.id !== d.id);
    renderDrawings(); saveWs();
  });
  return e;
}

function setTool(t) {
  S.tool = t;
  for (const b of document.querySelectorAll('#toolbar button[data-tool]')) b.classList.toggle('active', b.dataset.tool === t);
  $('#drawbar').hidden = !['pen', 'arrow', 'rect', 'text'].includes(t);
  overlay.hidden = !['pen', 'arrow', 'rect', 'text'].includes(t);
  drawSvg.classList.toggle('erasing', t === 'erase');
}

overlay.addEventListener('pointerdown', async (e) => {
  const color = S.color;
  const p0 = toWorld(e.clientX, e.clientY);
  const pt = (p) => [Math.round(p.x), Math.round(p.y)];
  if (S.tool === 'text') {
    const text = await prompt('Texto no canvas', '');
    if (text) { S.ws.drawings.push({ id: uid('d-'), kind: 'text', points: [pt(p0)], text, color, size: 14 + S.stroke * 8 }); renderDrawings(); saveWs(); updateEmpty(); }
    setTool('select');
    return;
  }
  const d = { id: uid('d-'), kind: S.tool, color, width: S.stroke, points: [pt(p0), pt(p0)] };
  overlay.setPointerCapture(e.pointerId);
  let live = drawingEl(d);
  drawSvg.append(live);
  const move = (ev) => {
    const p = pt(toWorld(ev.clientX, ev.clientY));
    if (d.kind === 'pen') d.points.push(p); else d.points[1] = p;
    const next = drawingEl(d);
    live.replaceWith(next); live = next;
  };
  const up = () => {
    overlay.removeEventListener('pointermove', move);
    overlay.removeEventListener('pointerup', up);
    if (d.kind === 'pen' && d.points.length > 2) d.points.shift();
    const [[x1, y1], [x2, y2]] = [d.points[0], d.points[d.points.length - 1]];
    if (d.kind !== 'pen' && Math.hypot(x2 - x1, y2 - y1) < 4) { live.remove(); return; }
    S.ws.drawings.push(d);
    saveWs();
    updateEmpty();
  };
  overlay.addEventListener('pointermove', move);
  overlay.addEventListener('pointerup', up);
});

// ---------- interações do canvas ----------

function isBackground(t) {
  return t === viewport || t === pan || t === world || t === nodesLayer || t === edgesSvg || t === drawSvg;
}

function drag(e, onMove, onUp) {
  const sx = e.clientX, sy = e.clientY;
  document.body.classList.add('dragging');
  const move = (ev) => onMove((ev.clientX - sx) / S.ws.view.zoom, (ev.clientY - sy) / S.ws.view.zoom, ev);
  const up = (ev) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    document.body.classList.remove('dragging');
    onUp?.(ev);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

viewport.addEventListener('pointerdown', (e) => {
  const t = e.target;
  // Pan: botão do meio, espaço+arrastar ou arrastar o fundo.
  if (e.button === 1 || (e.button === 0 && (S.space || isBackground(t)))) {
    e.preventDefault();
    if (isBackground(t)) { select(null); S.selectedEdge = null; renderEdges(); document.activeElement?.blur(); }
    const v = { ...S.ws.view };
    viewport.classList.add('panning');
    const sx = e.clientX, sy = e.clientY;
    document.body.classList.add('dragging');
    const move = (ev) => setView(v.x + ev.clientX - sx, v.y + ev.clientY - sy, v.zoom);
    const up = () => { viewport.classList.remove('panning'); document.body.classList.remove('dragging'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return;
  }
  if (e.button !== 0) return;
  const nodeEl = t.closest('.node');
  if (!nodeEl) return;
  const f = S.frames.get(nodeEl.dataset.id);
  const n = f.node;

  if (t.classList.contains('handle')) {
    e.preventDefault();
    const preview = svg('path', { class: 'preview' });
    edgesSvg.append(preview);
    let target = null;
    drag(e, (_dx, _dy, ev) => {
      const p = toWorld(ev.clientX, ev.clientY);
      const start = { x: n.x + n.w, y: n.y + n.h / 2, dx: 1, dy: 0 };
      preview.setAttribute('d', curve(start, { x: p.x, y: p.y, dx: -1, dy: 0 }));
      document.body.classList.remove('dragging');
      const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.node');
      document.body.classList.add('dragging');
      target?.classList.remove('connect-target');
      target = under && under !== nodeEl ? under : null;
      target?.classList.add('connect-target');
    }, () => {
      preview.remove();
      if (target) { target.classList.remove('connect-target'); connect(n.id, target.dataset.id); }
    });
    return;
  }

  if (t.classList.contains('resize')) {
    e.preventDefault();
    const w0 = n.w, h0 = n.h;
    drag(e, (dx, dy) => {
      n.w = Math.max(260, Math.round(w0 + dx));
      n.h = Math.max(140, Math.round(h0 + dy));
      position(f); renderEdges();
    }, () => { saveWs(); f.view.refit?.(); });
    return;
  }

  if (t.closest('.node-head') && !t.closest('button,select,input,[contenteditable=true]')) {
    e.preventDefault();
    const x0 = n.x, y0 = n.y;
    drag(e, (dx, dy, ev) => {
      // Shift: alinha numa grade de 20px.
      const snap = (v) => (ev.shiftKey ? Math.round(v / 20) * 20 : Math.round(v));
      n.x = snap(x0 + dx); n.y = snap(y0 + dy);
      position(f); renderEdges();
    }, () => saveWs());
  }
});

viewport.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0022));
    return;
  }
  // Rolagem dentro de terminais/notas/portais pertence a eles.
  if (e.target.closest('.node-body')) return;
  e.preventDefault();
  const v = S.ws.view;
  setView(v.x - e.deltaX, v.y - e.deltaY, v.zoom);
}, { passive: false });

viewport.addEventListener('dblclick', (e) => {
  if (!isBackground(e.target)) return;
  const p = toWorld(e.clientX, e.clientY);
  menu(e.clientX, e.clientY, [
    ...S.state.agents.map((a) => ({ label: `▣ ${a.label}`, action: () => { const n = addTerminal(a.id); moveTo(n, p); } })),
    'sep',
    { label: '✎ Nota', action: () => moveTo(addNote(), p) },
    { label: '◎ Portal', action: async () => { const n = await addPortal(); if (n) moveTo(n, p); } },
  ]);
});

function moveTo(n, p) {
  n.x = Math.round(p.x - n.w / 2); n.y = Math.round(p.y - 16);
  position(S.frames.get(n.id)); renderEdges(); saveWs();
}

// ---------- teclado ----------

function isGlobalShortcut(e) {
  const k = e.key;
  if (e.ctrlKey && !e.altKey && /^[1-9]$/.test(k)) return true;
  if (e.ctrlKey && (k === 'Tab' || k === 'PageUp' || k === 'PageDown')) return true;
  if (e.ctrlKey && !e.shiftKey && (k === '0' || k === 'Enter' || k === '=' || k === '-' || k === '+')) return true;
  if (e.altKey && !e.ctrlKey && k.startsWith('Arrow')) return true;
  if (e.ctrlKey && e.shiftKey && ['KeyT', 'KeyN', 'KeyP', 'KeyF'].includes(e.code)) return true;
  if (e.ctrlKey && !e.shiftKey && ['KeyL', 'KeyP', 'KeyB'].includes(e.code)) return true;
  return false;
}

function jump(dir) {
  const cur = S.ws.nodes.find((n) => n.id === S.selected);
  if (!cur) { if (S.ws.nodes[0]) zoomToNode(S.ws.nodes[0]); return; }
  const c = { x: cur.x + cur.w / 2, y: cur.y + cur.h / 2 };
  const v = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[dir];
  let best = null, bestScore = Infinity;
  for (const n of S.ws.nodes) {
    if (n === cur) continue;
    const dx = n.x + n.w / 2 - c.x, dy = n.y + n.h / 2 - c.y;
    const along = dx * v[0] + dy * v[1];
    if (along <= 0) continue;
    const across = Math.abs(dx * v[1] - dy * v[0]);
    const score = along + across * 2;
    if (score < bestScore) { bestScore = score; best = n; }
  }
  if (best) zoomToNode(best);
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !isTyping()) S.space = true;
  if (!isGlobalShortcut(e)) {
    if (isTyping()) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (S.selectedEdge) removeEdge(S.selectedEdge);
      else if (S.selected) { const n = S.ws.nodes.find((x) => x.id === S.selected); if (n && n.type !== 'terminal') removeNode(n); }
      return;
    }
    const tools = { v: 'select', p: 'pen', a: 'arrow', r: 'rect', t: 'text', e: 'erase', Escape: 'select' };
    if (!e.ctrlKey && !e.altKey && tools[e.key]) setTool(tools[e.key]);
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const k = e.key;
  if (e.ctrlKey && /^[1-9]$/.test(k)) { const w = S.state.workspaces[+k - 1]; if (w) showWorkspace(w.id); }
  else if (e.ctrlKey && (k === 'Tab' || k === 'PageUp' || k === 'PageDown')) cycleWorkspace(k === 'PageUp' || (k === 'Tab' && e.shiftKey) ? -1 : 1);
  else if (e.ctrlKey && k === '0') fitAll();
  else if (e.ctrlKey && k === 'Enter') { const n = S.ws.nodes.find((x) => x.id === S.selected); if (n) zoomToNode(n); }
  else if (e.ctrlKey && (k === '=' || k === '+')) { const r = viewport.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2); }
  else if (e.ctrlKey && k === '-') { const r = viewport.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.2); }
  else if (e.altKey && k.startsWith('Arrow')) jump(k);
  else if (!e.shiftKey && e.code === 'KeyP') palette();
  else if (!e.shiftKey && e.code === 'KeyB') toggleSidebar();
  else if (e.code === 'KeyT') { const b = $('#btn-add-term').getBoundingClientRect(); terminalMenu(b.left, b.bottom + 4); }
  else if (e.code === 'KeyN') addNote();
  else if (e.code === 'KeyF') createFloor();
  else if (e.code === 'KeyL') toggleLog();
  else if (e.code === 'KeyP') addPortal();
}, true);
window.addEventListener('keyup', (e) => { if (e.code === 'Space') S.space = false; });

function isTyping() {
  const a = document.activeElement;
  return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.isContentEditable || a.tagName === 'WEBVIEW' || a.closest?.('.xterm'));
}

// ---------- log de mensagens ----------

function toggleLog(force) {
  const log = $('#log');
  log.hidden = force !== undefined ? !force : !log.hidden;
  $('#btn-log').classList.toggle('active', !log.hidden);
  if (!log.hidden) renderLog();
}

function nodeTitle(id) {
  for (const w of S.state.workspaces) { const n = w.nodes.find((x) => x.id === id); if (n) return n.title; }
  return '?';
}

function renderLog() {
  const list = $('#log-list');
  if ($('#log').hidden) return;
  const kinds = { send: 'msg', ask: 'tarefa', reply: 'resposta' };
  list.replaceChildren(...S.log.slice(-200).reverse().map((m) => el('div', { class: 'msg' },
    el('div', { class: 'who' }, el('b', {}, nodeTitle(m.from)), ' → ', el('b', {}, nodeTitle(m.to)), el('span', { class: 'kind ' + m.kind }, kinds[m.kind] || m.kind),
      ' ', new Date(m.at).toLocaleTimeString()),
    el('pre', {}, m.text))));
  if (!S.log.length) list.append(el('div', { class: 'hint' }, 'Nenhuma mensagem ainda. Conecte dois agentes e peça para um delegar ao outro com "regente ask".'));
}

// ---------- modais: papéis, partituras, configurações ----------

function rolesModal() {
  const roles = structuredClone(S.state.roles);
  modal((close) => {
    const list = el('div', { class: 'list' });
    const render = () => list.replaceChildren(...roles.map((r, i) => el('div', { class: 'card' },
      el('div', { class: 'row' },
        el('input', { type: 'text', value: r.name, oninput: (e) => { r.name = e.target.value; } }),
        el('button', { class: 'danger', onclick: () => { roles.splice(i, 1); render(); } }, 'Excluir')),
      el('textarea', { value: r.prompt, oninput: (e) => { r.prompt = e.target.value; } }))));
    render();
    return [
      el('h3', {}, 'Papéis'),
      el('div', { class: 'hint' }, 'Instruções reutilizáveis que definem a responsabilidade de um agente. Entram no system prompt ao iniciar (Claude Code) ou como primeira mensagem (outros CLIs).'),
      list,
      el('div', { class: 'actions' },
        el('button', { onclick: () => { roles.push({ id: uid('r-'), name: 'Novo papel', prompt: '' }); render(); } }, '＋ Papel'),
        el('span', { class: 'spacer', style: { flex: 1 } }),
        el('button', { onclick: close }, 'Cancelar'),
        el('button', { class: 'primary', onclick: () => { S.state.roles = roles; api.patchState({ roles }); close(); toast('Papéis salvos'); } }, 'Salvar')),
    ];
  });
}

async function saveScore(close) {
  const name = await prompt('Nome da partitura', S.ws.name);
  if (!name) return;
  const notes = {};
  for (const n of S.ws.nodes) if (n.type === 'note') notes[n.id] = await api.noteRead(n.id);
  const base = S.ws.cwd;
  const nodes = S.ws.nodes.map((n) => {
    const c = structuredClone(n);
    delete c.statusText;
    // cwd relativo ao workspace para a partitura funcionar em outro projeto.
    if (c.cwd && base && (c.cwd === base || c.cwd.startsWith(base + '/'))) c.cwd = '.' + c.cwd.slice(base.length);
    return c;
  });
  S.state.scores.push({ id: uid('s-'), name, nodes, edges: structuredClone(S.ws.edges), drawings: structuredClone(S.ws.drawings), notes, at: Date.now() });
  api.patchState({ scores: S.state.scores });
  toast(`Partitura "${name}" salva`);
  close();
  scoresModal();
}

async function applyScore(score, quiet) {
  const map = new Map();
  const xs = S.ws.nodes.map((n) => n.x + n.w);
  const minX = Math.min(...score.nodes.map((n) => n.x), ...score.drawings.flatMap((d) => d.points.map((p) => p[0])));
  const minY = Math.min(...score.nodes.map((n) => n.y));
  const offX = (xs.length ? Math.max(...xs) + 120 : 0) - (isFinite(minX) ? minX : 0);
  const offY = S.ws.nodes.length ? Math.min(...S.ws.nodes.map((n) => n.y)) - minY : -minY;
  for (const sn of score.nodes) {
    const n = structuredClone(sn);
    n.id = uid('n-');
    map.set(sn.id, n.id);
    n.x += offX; n.y += offY;
    if (n.agent === '$default') n.agent = settings().defaultAgent || 'claude';
    if (S.ws.nodes.some((o) => o.title.toLowerCase() === n.title.toLowerCase())) n.title = uniqueTitle(n.title);
    if (n.cwd?.startsWith('.')) n.cwd = S.ws.cwd + n.cwd.slice(1);
    if (n.type === 'note') await api.noteWrite(n.id, score.notes?.[sn.id] || '');
    S.ws.nodes.push(n);
  }
  for (const e of score.edges) if (map.has(e.from) && map.has(e.to)) S.ws.edges.push({ id: uid('e-'), from: map.get(e.from), to: map.get(e.to) });
  for (const d of score.drawings) S.ws.drawings.push({ ...structuredClone(d), id: uid('d-'), points: d.points.map(([x, y]) => [x + offX, y + offY]) });
  await api.saveWorkspace(S.ws);
  showWorkspace(S.ws.id);
  fitAll();
  if (!quiet) toast(`"${score.name}" aplicada`);
}

function templateCard(t, onPick, selected) {
  return el('div', { class: 'choice' + (selected ? ' on' : ''), onclick: () => onPick(t) },
    el('div', { class: 'choice-head' }, ic(t.icon), el('b', {}, t.name)),
    el('div', { class: 'hint' }, t.description),
    t.nodes.length ? el('div', { class: 'tiny' }, `${t.nodes.filter((n) => n.type === 'terminal').length} agentes · ${t.nodes.filter((n) => n.type !== 'terminal').length} notas/portais`) : null);
}

// ---------- assistente de configuração inicial ----------

const EMPTY_TEMPLATE = { id: 't-empty', name: 'Canvas vazio', icon: 'square', description: 'Começar do zero.', nodes: [], edges: [], drawings: [], notes: {} };

async function onboarding() {
  const st = settings();
  const draft = {
    theme: st.theme || 'light', defaultAgent: st.defaultAgent || 'claude', agents: structuredClone(S.state.agents),
    cwd: S.ws.cwd, wsName: S.ws.name, template: S.ws.nodes.length ? EMPTY_TEMPLATE : TEMPLATES[1], skill: true,
  };
  let step = 0;
  let detected = null;
  api.detectAgents().then((d) => {
    detected = d;
    if (!d[draft.defaultAgent]) draft.defaultAgent = ['claude', 'codex', 'gemini', 'opencode'].find((id) => d[id]) || draft.defaultAgent;
    render();
  });
  const STEPS = ['Boas-vindas', 'Tema', 'Agentes', 'Projeto', 'Arranjo', 'Pronto'];
  let box, close;
  const go = (d) => { step = Math.max(0, Math.min(STEPS.length - 1, step + d)); render(); };

  const body = () => {
    switch (step) {
      case 0: return [
        el('div', { class: 'hero' }, ic('music-4', 'big'), el('h2', {}, 'Bem-vindo ao Regente')),
        el('p', { class: 'lead' }, 'Um canvas onde seus agentes de IA trabalham lado a lado. Ligue dois agentes com uma linha e eles passam a conversar, delegar tarefas, anotar o progresso e testar no navegador.'),
        el('div', { class: 'bullets' },
          el('div', {}, ic('square-terminal'), el('span', {}, el('b', {}, 'Agentes'), ' em terminais reais: Claude Code, Codex, Gemini, OpenCode ou shell')),
          el('div', {}, ic('move-up-right'), el('span', {}, el('b', {}, 'Conexões'), ' definem quem conversa com quem')),
          el('div', {}, ic('sticky-note'), el('span', {}, el('b', {}, 'Notas e portais'), ' que os agentes leem, escrevem e controlam')),
          el('div', {}, ic('layers-2'), el('span', {}, el('b', {}, 'Andares'), ' para experimentar numa branch isolada'))),
        el('p', { class: 'hint' }, 'Vamos configurar em 1 minuto. Tudo pode ser mudado depois em Configurações.'),
      ];
      case 1: return [
        el('h2', {}, 'Escolha o tema'),
        el('div', { class: 'choices three' }, [['light', 'Claro', 'sun'], ['dark', 'Escuro', 'moon'], ['system', 'Seguir o sistema', 'app-window']].map(([v, label, icon]) =>
          el('div', { class: 'choice theme-' + v + (draft.theme === v ? ' on' : ''), onclick: () => { draft.theme = v; applyTheme(v); render(); } },
            el('div', { class: 'swatch-preview' }, el('span'), el('span'), el('span')),
            el('div', { class: 'choice-head' }, ic(icon), el('b', {}, label))))),
      ];
      case 2: return [
        el('h2', {}, 'Seus agentes'),
        el('p', { class: 'hint' }, 'Detectei os CLIs instalados. Escolha o agente padrão dos modelos e ajuste o comando de inicialização, se quiser.'),
        el('div', { class: 'agents' }, draft.agents.map((a) => {
          const found = detected?.[a.id];
          // O card inteiro seleciona o agente; só o campo do comando fica de fora.
          const pick = (e) => { if (a.id === 'shell' || e.target.matches('input[type=text]')) return; draft.defaultAgent = a.id; render(); };
          return el('div', { class: 'agent-row' + (draft.defaultAgent === a.id ? ' on' : '') + (a.id === 'shell' ? '' : ' pickable'), onclick: pick },
            el('input', { type: 'radio', name: 'def', checked: draft.defaultAgent === a.id, disabled: a.id === 'shell' }),
            el('div', { class: 'agent-info' },
              el('div', {}, el('b', {}, a.label), ' ',
                detected == null ? el('span', { class: 'tag' }, 'verificando…')
                  : found ? el('span', { class: 'tag ok' }, ic('check', 'sm'), ' instalado') : el('span', { class: 'tag no' }, 'não encontrado')),
              found ? el('small', {}, found) : INSTALL_HINTS[a.id] && detected ? el('small', {}, 'Para instalar: ', el('code', {}, INSTALL_HINTS[a.id])) : null),
            a.id !== 'shell' && el('input', { type: 'text', value: a.launch, title: 'Comando de inicialização', oninput: (e) => { a.launch = e.target.value; } }));
        })),
      ];
      case 3: return [
        el('h2', {}, 'Seu primeiro projeto'),
        el('p', { class: 'hint' }, 'Os agentes deste workspace abrem nesta pasta. Se for um repositório git, você poderá criar andares (branches isoladas).'),
        el('label', {}, 'Nome do workspace'),
        el('input', { type: 'text', value: draft.wsName, oninput: (e) => { draft.wsName = e.target.value; }, onkeydown: (e) => e.stopPropagation() }),
        el('label', {}, 'Pasta do projeto'),
        el('div', { class: 'row' }, el('input', { type: 'text', value: draft.cwd, oninput: (e) => { draft.cwd = e.target.value; }, onkeydown: (e) => e.stopPropagation() }),
          el('button', { class: 'outline', onclick: async () => { const d = await api.pickDir(draft.cwd); if (d) { draft.cwd = d; render(); } } }, ic('folder'), 'Escolher…')),
      ];
      case 4: return [
        el('h2', {}, 'Comece com um arranjo'),
        el('p', { class: 'hint' }, `Modelos prontos usando ${draft.agents.find((a) => a.id === draft.defaultAgent)?.label || draft.defaultAgent}. Ficam também em Partituras → Modelos.`),
        el('div', { class: 'choices' }, [...TEMPLATES, EMPTY_TEMPLATE].map((t) => templateCard(t, (x) => { draft.template = x; render(); }, draft.template.id === t.id))),
      ];
      default: return [
        el('div', { class: 'hero' }, ic('rocket', 'big'), el('h2', {}, 'Tudo pronto')),
        el('div', { class: 'bullets' },
          el('div', {}, ic('move-up-right'), el('span', {}, 'Arraste o ', el('b', {}, '●'), ' da borda de um nó até outro para conectá-los')),
          el('div', {}, ic('pencil'), el('span', {}, el('b', {}, 'Ctrl+I'), ' num terminal abre o compositor com @menções e imagens')),
          el('div', {}, ic('command'), el('span', {}, el('b', {}, 'Ctrl+P'), ' busca tudo; ', el('b', {}, 'Ctrl+0'), ' mostra tudo; ', el('b', {}, 'Alt+setas'), ' pula entre agentes')),
          el('div', {}, ic('message-square-more'), el('span', {}, 'Peça a um agente: ', el('i', {}, '"use regente ask para pedir ao Revisor que revise suas mudanças"')))),
        el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: draft.skill, onchange: (e) => { draft.skill = e.target.checked; } }),
          ' Instalar a skill "regente" em ~/.claude/skills e ~/.agents/skills (ensina qualquer sessão de agente a usar o canvas)'),
      ];
    }
  };

  const finish = async () => {
    S.state.agents = draft.agents;
    Object.assign(st, { theme: draft.theme, defaultAgent: draft.defaultAgent, onboarded: true });
    await api.patchState({ agents: draft.agents, settings: st });
    if (draft.wsName.trim()) { S.ws.name = draft.wsName.trim(); }
    S.ws.cwd = draft.cwd;
    await api.saveWorkspace(S.ws);
    if (draft.skill) api.skillInstall().catch(() => {});
    close();
    if (draft.template.nodes.length) await applyScore(draft.template, true);
    renderTabs();
    toast('Bem-vindo ao Regente!');
  };

  const render = () => {
    if (!box) return;
    box.replaceChildren(
      el('div', { class: 'steps' }, STEPS.map((label, i) => el('span', { class: i === step ? 'on' : i < step ? 'done' : '' }, label))),
      el('div', { class: 'wizard-body' }, ...body().filter(Boolean)),
      el('div', { class: 'actions' },
        step === 0 ? el('button', { class: 'ghost', onclick: () => { st.onboarded = true; api.patchState({ settings: st }); close(); } }, 'Pular') : el('button', { onclick: () => go(-1) }, 'Voltar'),
        el('span', { class: 'spacer' }),
        step < STEPS.length - 1 ? el('button', { class: 'primary', onclick: () => go(1) }, step === 0 ? 'Começar' : 'Continuar') : el('button', { class: 'primary', onclick: finish }, 'Abrir o canvas')),
    );
  };
  close = modal(() => { box = el('div', { class: 'wizard' }); return box; });
  box.closest('.modal').classList.add('wide');
  render();
}

function scoresModal() {
  modal((close) => [
    el('h3', {}, 'Partituras'),
    el('div', { class: 'hint' }, 'Salve o arranjo inteiro (agentes com papéis, notas, portais, desenhos e conexões) e restaure em qualquer workspace ou andar.'),
    el('div', { class: 'list' }, S.state.scores.length ? S.state.scores.map((s) => el('div', { class: 'card' },
      el('div', { class: 'row' },
        el('b', { style: { flex: 1 } }, s.name),
        el('span', { class: 'hint' }, `${s.nodes.length} nós · ${s.edges.length} conexões`),
        el('button', { class: 'primary', onclick: () => { close(); applyScore(s); } }, 'Aplicar aqui'),
        el('button', { class: 'danger', onclick: () => { S.state.scores = S.state.scores.filter((x) => x !== s); api.patchState({ scores: S.state.scores }); close(); scoresModal(); } }, 'Excluir')),
    )) : el('div', { class: 'hint' }, 'Nenhuma partitura salva ainda.')),
    el('h3', { style: { marginTop: '10px' } }, 'Modelos'),
    el('div', { class: 'choices' }, TEMPLATES.map((t) => templateCard(t, () => { close(); applyScore(t); }))),
    el('div', { class: 'actions' }, el('button', { onclick: close }, 'Fechar'), el('button', { class: 'primary', onclick: () => saveScore(close) }, 'Salvar arranjo atual')),
  ]);
  document.querySelector('.modal:last-child')?.classList.add('wide');
}

function settingsModal() {
  const agents = structuredClone(S.state.agents);
  const st = { ...S.state.settings };
  modal((close) => {
    const list = el('div', { class: 'list' });
    const render = () => list.replaceChildren(...agents.map((a, i) => el('div', { class: 'card' },
      el('div', { class: 'row' },
        el('input', { type: 'text', value: a.label, title: 'Nome', oninput: (e) => { a.label = e.target.value; } }),
        el('code', {}, a.id),
        !['claude', 'codex', 'gemini', 'opencode', 'shell'].includes(a.id) && el('button', { class: 'danger', onclick: () => { agents.splice(i, 1); render(); } }, 'Excluir')),
      el('input', { type: 'text', value: a.launch, placeholder: 'comando (vazio = só o shell)', oninput: (e) => { a.launch = e.target.value; } }))));
    render();
    return [
      el('h3', {}, 'Configurações'),
      el('label', {}, 'Agentes — comando de inicialização. $REGENTE_SYSTEM_PROMPT contém o papel + instruções de orquestração.'),
      list,
      el('div', { class: 'row' }, el('button', { onclick: async () => {
        const id = await prompt('Id do novo agente (ex.: aider)');
        if (id) { agents.push({ id: id.toLowerCase().replace(/\W+/g, '-'), label: id, launch: id }); render(); }
      } }, '＋ Agente personalizado')),
      el('div', { class: 'row' }, el('label', {}, 'Fonte do terminal'),
        el('input', { type: 'text', value: st.fontSize || 13, style: { width: '60px', flex: 'none' }, oninput: (e) => { st.fontSize = +e.target.value || 13; } })),
      el('div', { class: 'row' }, el('label', {}, el('input', { type: 'checkbox', checked: st.notifications !== false, onchange: (e) => { st.notifications = e.target.checked; } }), ' Notificar quando um agente terminar ou pedir permissão (com a janela sem foco)')),
      el('div', { class: 'row' }, el('label', {}, 'Tema'), el('select', { onchange: (e) => { st.theme = e.target.value; } },
        [['light', 'Claro'], ['dark', 'Escuro'], ['system', 'Sistema']].map(([v, l]) => el('option', { value: v, selected: (st.theme || 'light') === v }, l)))),
      el('div', { class: 'row' }, el('button', { class: 'outline', onclick: () => { close(); onboarding(); } }, ic('wand-sparkles'), 'Abrir o assistente de configuração')),
      (st.trustedHosts || []).length ? el('div', { class: 'row' }, el('label', {}, 'Sites confiáveis (certificado):'),
        ...(st.trustedHosts || []).map((h) => el('button', { class: 'outline', title: 'Remover', onclick: (e) => { st.trustedHosts = st.trustedHosts.filter((x) => x !== h); e.currentTarget.remove(); } }, h, ic('x', 'sm')))) : null,
      el('h3', { style: { marginTop: '8px' } }, 'Ponto (assistente)'),
      el('div', { class: 'hint' }, 'Quando um agente termina um turno, o Ponto resume o que aconteceu e sugere próximos passos clicáveis. Usa um CLI de LLM local ao seu gosto (recebe o prompt no stdin, devolve JSON).'),
      el('div', { class: 'row' }, el('label', {}, el('input', { type: 'checkbox', checked: !!st.assistant?.enabled, onchange: (e) => { st.assistant = { ...st.assistant, enabled: e.target.checked }; } }), ' Ativar resumos automáticos')),
      el('div', { class: 'row' }, el('label', {}, 'Comando'), el('input', { type: 'text', value: st.assistant?.command || 'claude -p --model haiku', oninput: (e) => { st.assistant = { ...st.assistant, command: e.target.value }; } })),
      el('div', { class: 'hint' }, 'Alternativas: ', el('code', {}, 'ollama run llama3.2'), ', ', el('code', {}, 'codex exec -'), '.'),
      el('h3', { style: { marginTop: '8px' } }, 'Integração com agentes'),
      el('div', { class: 'row' },
        el('button', { class: 'outline', onclick: async () => { const d = await api.skillInstall(); toast('Skill instalada em:\n' + d.join('\n')); } }, ic('sparkles'), 'Instalar skill "regente" (~/.claude/skills e ~/.agents/skills)')),
      el('h3', { style: { marginTop: '8px' } }, 'Atualizações'),
      el('div', { class: 'row' }, el('label', {}, el('input', { type: 'checkbox', checked: st.autoUpdate !== false, onchange: (e) => { st.autoUpdate = e.target.checked; } }), ' Procurar novas versões automaticamente')),
      el('div', { class: 'row' }, el('span', { class: 'hint', style: { flex: 1 } }, `Versão ${S.state.version}`),
        el('button', { class: 'outline', onclick: async () => {
          const s = await api.updateCheck();
          toast({ disabled: 'Atualização automática só funciona no app instalado', none: 'Você já está na versão mais recente',
            error: `Falha ao procurar atualização: ${s.message}` }[s.state] || `Versão ${s.version} disponível`, s.state === 'error');
        } }, 'Verificar agora')),
      el('h3', { style: { marginTop: '8px' } }, 'Backups'),
      el('div', { class: 'hint' }, 'Um backup automático por hora (os 48 mais recentes ficam guardados).'),
      el('div', { class: 'row' },
        el('button', { class: 'outline', onclick: async () => { await api.backupNow(); toast('Backup criado'); } }, 'Fazer backup agora'),
        el('button', { class: 'outline', onclick: async () => {
          const files = await api.backupList();
          if (!files.length) return toast('Nenhum backup ainda', true);
          close();
          modal((c2) => [el('h3', {}, 'Restaurar backup'), el('div', { class: 'hint' }, 'O estado atual é salvo antes de restaurar. Os terminais são reiniciados.'),
            el('div', { class: 'list' }, files.slice(0, 20).map((f) => el('div', { class: 'card' }, el('div', { class: 'row' }, el('span', { style: { flex: 1 } }, f),
              el('button', { class: 'outline', onclick: () => { c2(); api.backupRestore(f); } }, 'Restaurar'))))),
            el('div', { class: 'actions' }, el('button', { onclick: c2 }, 'Fechar'))]);
        } }, 'Restaurar…')),
      el('div', { class: 'hint' }, 'MCP: para dar as ferramentas do Regente como tools nativas a um agente, rode dentro do terminal dele: ', el('code', {}, 'claude mcp add regente -- regente mcp'), '. Dados locais em ', el('code', {}, S.state.dataDir), '.'),
      el('div', { class: 'actions' }, el('button', { onclick: close }, 'Cancelar'),
        el('button', { class: 'primary', onclick: () => {
          S.state.agents = agents; S.state.settings = st;
          api.patchState({ agents, settings: st }); applyTheme(st.theme); close(); toast('Configurações salvas (fonte vale para novos terminais)');
        } }, 'Salvar')),
    ];
  });
}

// ---------- eventos do processo principal ----------

function mergeWorkspace(next) {
  const ws = S.state.workspaces.find((w) => w.id === next.id);
  if (!ws) { S.state.workspaces.push(next); renderTabs(); return; }
  const existing = new Map(ws.nodes.map((n) => [n.id, n]));
  ws.nodes = next.nodes.map((n) => (existing.has(n.id) ? Object.assign(existing.get(n.id), n) : n));
  ws.edges = next.edges;
  ws.drawings = next.drawings;
  if (ws !== S.ws) return;
  renderDrawings();
  for (const n of ws.nodes) {
    if (!S.frames.has(n.id) || !S.frames.get(n.id).el.isConnected) {
      const f = frameFor(n);
      nodesLayer.append(f.el);
      f.view.attach();
    } else position(S.frames.get(n.id));
  }
  renderEdges();
  updateEmpty();
}

function findNode(id) {
  for (const w of S.state.workspaces) { const n = w.nodes.find((x) => x.id === id); if (n) return n; }
  return null;
}

// Aviso fixo quando há versão nova: pronta para instalar (Linux/Windows) ou só disponível (macOS).
function updateBanner(s) {
  if (s.state !== 'ready' && s.state !== 'available') return;
  document.querySelector('.toast.update')?.remove();
  const ready = s.state === 'ready';
  document.body.append(el('div', { class: 'toast update' },
    `Regente ${s.version} ${ready ? 'baixado' : 'disponível'}`,
    el('button', { class: 'primary', onclick: () => api.updateInstall() }, ready ? 'Reiniciar e atualizar' : 'Baixar'),
    el('button', { onclick: (e) => e.currentTarget.parentElement.remove() }, 'Depois')));
}

function wireEvents() {
  api.onTermData(({ id, data }) => S.frames.get(id)?.view.write(data));
  api.onTermStatus(({ id, status }) => setStatus(id, status));
  api.onTermTitle(({ id, title }) => { S.titles[id] = title; refreshMeta(id); });
  api.onTermExit(({ id, code }) => S.frames.get(id)?.view.showExit?.(code));
  api.onWorkspaceReplace((ws) => mergeWorkspace(ws));
  api.onAssistantCard((c) => showCard(c));
  api.onUpdateStatus(updateBanner);
  api.updateStatus().then(updateBanner);
  api.onFocusNode(({ id, workspaceId }) => {
    if (S.ws.id !== workspaceId) showWorkspace(workspaceId);
    const n = S.ws.nodes.find((x) => x.id === id);
    if (n) zoomToNode(n);
  });
  api.onBusEvent((ev) => {
    switch (ev.event) {
      case 'message':
        S.log.push(ev);
        if (S.log.length > 500) S.log.shift();
        pulse(ev.from, ev.to);
        renderLog();
        break;
      case 'pending':
        if (ev.open) S.pending.set(ev.msgId, `${ev.from}|${ev.to}`); else S.pending.delete(ev.msgId);
        renderEdges();
        break;
      case 'note': S.frames.get(ev.id)?.view.external(ev.text); break;
      case 'nodePatch': { const n = findNode(ev.id); if (n) Object.assign(n, ev.patch); refreshMeta(ev.id); break; }
      case 'queue': S.queues[ev.id] = ev.size; refreshMeta(ev.id); break;
    }
  });
}

// ---------- barra superior ----------

function toggleSidebar(force) {
  const hidden = force !== undefined ? !force : !document.body.classList.contains('side-hidden');
  document.body.classList.toggle('side-hidden', hidden);
  $('#btn-show-side').hidden = !hidden;
  settings().sidebarHidden = hidden;
  api.patchState({ settings: settings() });
}

function applyTheme(theme) {
  const t = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = t || 'light';
  $('#btn-theme').replaceChildren(ic(t === 'dark' ? 'sun' : 'moon'));
  for (const f of S.frames.values()) if (f.view.term) f.view.term.options.theme = termTheme();
}

function renderDrawbar() {
  $('#swatches').replaceChildren(...SWATCHES.map((c) => el('span', {
    class: 'swatch' + (c === S.color ? ' on' : ''), style: { background: c },
    onclick: () => { S.color = c; renderDrawbar(); },
  })));
  $('#stroke-size').textContent = S.stroke;
}

function wireToolbar() {
  hydrateIcons();
  $('#btn-new-ws').onclick = () => newWorkspace();
  $('#btn-new-group').onclick = async () => {
    const g = await prompt('Novo grupo (projeto)', 'Novo projeto');
    if (!g) return;
    settings().groups = [...new Set([...(settings().groups || []), g])];
    api.patchState({ settings: settings() });
    renderTabs();
  };
  $('#ws-filter').oninput = (e) => { S.filter = e.target.value; renderTabs(); };
  $('#ws-filter').onkeydown = (e) => e.stopPropagation();
  $('#btn-hide-side').onclick = () => toggleSidebar(false);
  $('#btn-show-side').onclick = () => toggleSidebar(true);
  $('#btn-theme').onclick = () => {
    settings().theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    api.patchState({ settings: settings() });
    applyTheme(settings().theme);
  };
  $('#btn-add-term').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); terminalMenu(r.left, r.bottom + 8); };
  $('#btn-add-note').onclick = () => addNote();
  $('#btn-add-portal').onclick = () => addPortal();
  $('#btn-floor').onclick = (e) => {
    const root = S.ws.parentId || S.ws.id;
    const floors = S.state.workspaces.filter((w) => w.floor && w.parentId === root);
    menuBelow(e.currentTarget, [
      { label: 'Novo andar deste workspace', hint: 'Ctrl+Shift+F', action: () => createFloor() },
      ...(floors.length ? ['sep', ...floors.map((w) => ({ label: w.name, hint: w.floor.branch || 'cópia', action: () => showWorkspace(w.id) }))] : []),
    ]);
  };
  $('#btn-palette').onclick = () => palette();
  $('#btn-scores').onclick = scoresModal;
  $('#btn-roles').onclick = rolesModal;
  $('#btn-routines').onclick = routinesModal;
  $('#btn-settings').onclick = settingsModal;
  $('#btn-log').onclick = () => toggleLog();
  $('#log-close').onclick = () => toggleLog(false);
  $('#btn-fit').onclick = fitAll;
  const center = () => { const r = viewport.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  $('#btn-zoom-in').onclick = () => zoomAt(...center(), 1.2);
  $('#btn-zoom-out').onclick = () => zoomAt(...center(), 1 / 1.2);
  $('#zoom-indicator').ondblclick = () => { const [x, y] = center(); zoomAt(x, y, 1 / S.ws.view.zoom); };
  $('#stroke-minus').onclick = () => { S.stroke = Math.max(1, S.stroke - 1); renderDrawbar(); };
  $('#stroke-plus').onclick = () => { S.stroke = Math.min(12, S.stroke + 1); renderDrawbar(); };
  for (const b of document.querySelectorAll('#toolbar button[data-tool]')) b.onclick = () => setTool(b.dataset.tool);
  renderDrawbar();
  setTool('select');
}

// ---------- Batuta: busca global (Ctrl+P) ----------

function palette() {
  let scope = 'all';
  let sel = 0;
  let results = [];
  modal((close) => {
    const input = el('input', { type: 'text', placeholder: 'Buscar agentes, notas, portais, workspaces…  (">" busca dentro das notas)' });
    const list = el('div', { class: 'results' });
    const scopes = el('div', { class: 'scopes' });
    const go = (r) => { close(); r.action(); };
    const search = async () => {
      const q = input.value.trim().toLowerCase();
      const out = [];
      if (q.startsWith('>')) {
        const term = q.slice(1).trim();
        for (const w of S.state.workspaces) for (const n of w.nodes.filter((x) => x.type === 'note')) {
          const text = (await api.noteRead(n.id)) || '';
          const i = term ? text.toLowerCase().indexOf(term) : -1;
          if (i >= 0) out.push({ icon: 'file-text', label: n.title, hint: `${w.name} · …${text.slice(Math.max(0, i - 20), i + 40).replace(/\n/g, ' ')}…`, action: () => focusNode(w.id, n.id) });
        }
      } else {
        for (const w of S.state.workspaces) {
          if (scope === 'all' && (!q || w.name.toLowerCase().includes(q))) out.push({ icon: w.floor ? 'layers-2' : 'app-window', label: w.name, hint: 'workspace', action: () => showWorkspace(w.id) });
          for (const n of w.nodes) {
            const st = S.statuses[n.id];
            if (scope === 'waiting' && st !== 'waiting') continue;
            if (scope === 'working' && st !== 'working') continue;
            const hay = `${n.title} ${n.agent || ''} ${n.url || ''} ${S.titles[n.id] || ''}`.toLowerCase();
            if (q && !hay.includes(q)) continue;
            out.push({ icon: { terminal: 'square-terminal', note: 'sticky-note', portal: 'globe' }[n.type], label: n.title, hint: `${w.name}${st ? ' · ' + st : ''}`, action: () => focusNode(w.id, n.id) });
          }
        }
      }
      results = out.slice(0, 60);
      sel = Math.min(sel, Math.max(0, results.length - 1));
      list.replaceChildren(...results.map((r, i) => el('div', { class: 'res' + (i === sel ? ' on' : ''), onclick: () => go(r) }, ic(r.icon), el('span', {}, r.label), el('small', {}, r.hint))));
      if (!results.length) list.append(el('div', { class: 'hint', style: { padding: '8px 10px' } }, 'Nada encontrado.'));
    };
    const renderScopes = () => scopes.replaceChildren(...[['all', 'Tudo'], ['waiting', 'Precisam de você'], ['working', 'Trabalhando']].map(([k, label]) =>
      el('button', { class: scope === k ? 'active' : '', onclick: () => { scope = k; renderScopes(); search(); input.focus(); } }, label)));
    input.addEventListener('input', () => { sel = 0; search(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % Math.max(1, results.length); search(); }
      if (e.key === 'Enter' && results[sel]) go(results[sel]);
    });
    renderScopes();
    search();
    return [input, scopes, list];
  });
  document.querySelector('.modal:last-child')?.classList.add('palette');
}

function focusNode(wsId, nodeId) {
  if (S.ws.id !== wsId) showWorkspace(wsId);
  const n = S.ws.nodes.find((x) => x.id === nodeId);
  if (n) zoomToNode(n);
}

// ---------- Rotinas ----------

async function routinesModal() {
  const list = await api.routineList();
  const terms = S.state.workspaces.flatMap((w) => w.nodes.filter((n) => n.type === 'terminal').map((n) => ({ ...n, wsName: w.name })));
  modal((close) => {
    const form = { target: S.selected && terms.find((t) => t.id === S.selected) ? S.selected : terms[0]?.id, kind: 'every', when: '30m', prompt: '' };
    const targetSel = el('select', { onchange: (e) => { form.target = e.target.value; } },
      el('option', { value: '__reminder' }, '🔔 Lembrete (notificação)'),
      terms.map((t) => el('option', { value: t.id, selected: t.id === form.target }, `${t.title} — ${t.wsName}`)));
    const kindSel = el('select', { onchange: (e) => { form.kind = e.target.value; whenIn.placeholder = { every: '30m, 2h, 1h30m', daily: '09:00', weekly: 'mon,fri@18:00', once: '10m' }[form.kind]; } },
      el('option', { value: 'every' }, 'A cada'), el('option', { value: 'daily' }, 'Todo dia às'), el('option', { value: 'weekly' }, 'Semanal'), el('option', { value: 'once' }, 'Uma vez daqui a'));
    const whenIn = el('input', { type: 'text', value: form.when, oninput: (e) => { form.when = e.target.value; } });
    const promptIn = el('textarea', { placeholder: 'Prompt entregue ao agente (ex.: "rode os testes e me avise se algo quebrou")', oninput: (e) => { form.prompt = e.target.value; } });
    return [
      el('h3', {}, 'Rotinas'),
      el('div', { class: 'hint' }, 'Prompts agendados entregues a um agente. Se o agente estiver ocupado, o disparo é pulado. Agentes também criam rotinas com ', el('code', {}, 'regente routine add'), '.'),
      el('div', { class: 'list' }, list.length ? list.map((r) => el('div', { class: 'card' },
        el('div', { class: 'row' },
          el('b', { style: { flex: 1 } }, r.reminder ? 'Lembrete' : terms.find((t) => t.id === r.target)?.title || '(terminal removido)'),
          el('span', { class: 'hint' }, r.every ? `a cada ${Math.round(r.every / 60000)} min` : r.daily ? `diário ${r.daily}` : r.weekly ? r.weekly : 'uma vez'),
          el('span', { class: 'hint' }, r.enabled ? `próx. ${new Date(r.next).toLocaleTimeString()}` : 'pausada'),
          el('button', { class: 'outline', onclick: async () => { await api.routineUpdate(r.id, { enabled: !r.enabled }); close(); routinesModal(); } }, r.enabled ? 'Pausar' : 'Ativar'),
          el('button', { class: 'danger', onclick: async () => { await api.routineRemove(r.id); close(); routinesModal(); } }, ic('x'))),
        el('div', {}, r.prompt),
        r.lastResult && el('div', { class: 'hint' }, `${r.runs} execuções · último: ${r.lastResult}`))) : el('div', { class: 'hint' }, 'Nenhuma rotina.')),
      el('h3', { style: { marginTop: '8px' } }, 'Nova rotina'),
      el('div', { class: 'row' }, targetSel),
      el('div', { class: 'row' }, kindSel, whenIn),
      promptIn,
      el('div', { class: 'actions' }, el('button', { onclick: close }, 'Fechar'), el('button', {
        class: 'primary',
        onclick: async () => {
          if (!form.prompt.trim()) return toast('Escreva o prompt', true);
          try {
            const reminder = form.target === '__reminder';
            await api.routineAdd({ target: reminder ? null : form.target, reminder, prompt: form.prompt.trim(), [form.kind]: form.when });
            close(); routinesModal(); toast('Rotina criada');
          } catch (e) { toast(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), true); }
        },
      }, 'Criar rotina')),
    ];
  });
}

// ---------- Ponto (assistente) ----------

async function askAssistant(id) {
  toast('Ponto está lendo o terminal…');
  try { await api.assistantAsk(id); } catch (e) { toast(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), true); }
}

function showCard(c) {
  const box = $('#cards');
  const card = el('div', { class: 'card' },
    el('div', { class: 'head' }, ic('sparkles'), el('span', { style: { flex: 1 } }, c.title), el('button', { class: 'ghost', onclick: () => card.remove() }, ic('x', 'sm'))),
    el('div', {}, c.summary),
    el('div', { class: 'chips' }, c.followups.map((f) => el('button', { class: 'chip', onclick: () => { api.termSubmit(c.id, f); card.remove(); toast(`Enviado para ${c.title}`); } }, f))),
    el('button', { class: 'ghost', style: { alignSelf: 'flex-start', padding: '2px 0' }, onclick: () => { focusNode(c.workspaceId, c.id); } }, 'Ir para o agente →'));
  box.append(card);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => card.remove(), 120000);
}

async function init() {
  S.state = await api.getState();
  S.statuses = await api.termStatuses();
  applyTheme(settings().theme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(settings().theme));
  wireEvents();
  wireToolbar();
  if (settings().sidebarHidden) toggleSidebar(false);
  showWorkspace(S.state.activeWorkspace);
  window.addEventListener('resize', refitVisible);
  if (!settings().onboarded) onboarding();
}

init();
