const { app, BrowserWindow, ipcMain, dialog, Notification, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { Store, newWorkspace, uid } = require('./store');
const { SessionManager } = require('./sessions');
const { Portals } = require('./portal');
const { Bus } = require('./bus');
const { Routines } = require('./routines');
const { Assistant } = require('./assistant');
const { Updater } = require('./updater');
const i18n = require('../shared/i18n');

i18n.define(require('../shared/locales'));
// Idioma da configuração (ou do sistema), relido a cada uso para valer assim que o usuário trocar.
const tr = (key, vars) => {
  i18n.setLang(i18n.resolve(store.state.settings.language, app.isReady() ? app.getLocale() : 'pt'));
  return i18n.t(key, vars);
};

app.setName('Regente');
const dataDir = process.env.REGENTE_DATA || path.join(app.getPath('appData'), 'regente');
app.setPath('userData', dataDir);

let win;
const store = new Store(dataDir);
const sessions = new SessionManager();
const portals = new Portals();
const binDir = path.join(dataDir, 'bin');
// Sockets unix têm limite de ~108 bytes no caminho: fica em XDG_RUNTIME_DIR com um hash do dataDir.
const socketPath = path.join(process.env.XDG_RUNTIME_DIR || os.tmpdir(),
  `regente-${require('crypto').createHash('sha1').update(dataDir).digest('hex').slice(0, 10)}.sock`);

const send = (ch, payload) => win && !win.isDestroyed() && win.webContents.send(ch, payload);

// Shim `regente` no PATH dos terminais: usa o próprio Electron como Node, então não depende de node instalado.
function installShim() {
  fs.mkdirSync(binDir, { recursive: true });
  const cli = path.join(__dirname, '..', '..', 'bin', 'regente.js').replace('app.asar', 'app.asar.unpacked');
  const sh = `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec "${process.execPath}" "${cli}" "$@"\n`;
  fs.writeFileSync(path.join(binDir, 'regente'), sh, { mode: 0o755 });
}

const SYSTEM_PROMPT = `# Regente
Você está rodando dentro do Regente, um canvas onde vários agentes de IA trabalham juntos. Seu nome no canvas é "{title}" (workspace "{ws}").
Você conversa com os nós conectados a você (outros agentes, notas e portais de navegador) pela CLI \`regente\` no shell:
- \`regente peers\` lista quem está conectado; \`regente --help\` mostra tudo.
- \`regente ask <nome> "<tarefa>"\` delega e espera a resposta; \`regente send <nome> "<msg>"\` só avisa.
- \`regente note <nota> append "<texto>"\` registra progresso/decisões numa nota conectada.
- \`regente portal <portal> snapshot|click <ref>|type <ref> <texto>|goto <url>\` controla um navegador conectado.
- \`regente spawn claude --name <nome> --task "<tarefa>"\` cria um novo ajudante conectado a você.
Quando chegar uma mensagem "[Regente] Tarefa de ... (id m-...)", faça a tarefa e SEMPRE finalize com \`regente reply <id> "<resultado>"\`.
Se não houver nada conectado, apenas trabalhe normalmente e aguarde instruções do usuário.`;

function systemPrompt(node, ws) {
  const role = node.roleId && store.state.roles.find((r) => r.id === node.roleId);
  const parts = [];
  if (role) parts.push(tr('# Seu papel: {name}', { name: tr(role.name) }) + '\n' + tr(role.prompt));
  parts.push(tr(SYSTEM_PROMPT, { title: node.title, ws: ws.name }));
  return parts.join('\n\n');
}

// Fallback: se o `claude` não estiver instalado no PATH, usa o binário que vem na extensão do VS Code.
function extraPath() {
  const dir = path.join(os.homedir(), '.vscode', 'extensions');
  try {
    const ext = fs.readdirSync(dir).filter((d) => d.startsWith('anthropic.claude-code-'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
    const bin = ext && path.join(dir, ext, 'resources', 'native-binary');
    return bin && fs.existsSync(path.join(bin, 'claude')) ? `:${bin}` : '';
  } catch { return ''; }
}

function startSession(node, ws, cols, rows) {
  const agent = store.state.agents.find((a) => a.id === node.agent) || store.state.agents.find((a) => a.id === 'shell');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  Object.assign(env, {
    TERM: 'xterm-256color', COLORTERM: 'truecolor', TERM_PROGRAM: 'Regente',
    PATH: `${binDir}:${env.PATH || '/usr/bin:/bin'}${extraPath()}`, REGENTE_BIN: binDir, REGENTE_EXTRA_PATH: extraPath(),
    REGENTE_SOCK: socketPath, REGENTE_TOKEN: bus.tokenFor(node.id), REGENTE_NODE: node.id, REGENTE_NAME: node.title,
    REGENTE_SYSTEM_PROMPT: systemPrompt(node, ws),
  });
  let cwd = node.cwd || ws.cwd || os.homedir();
  if (!fs.existsSync(cwd)) cwd = os.homedir();
  return sessions.start({ id: node.id, cwd, env, launch: node.autostart === false ? '' : agent.launch, cols, rows });
}

// Chamado pelo barramento quando algo muda fora da UI.
async function ui(event, payload) {
  if (event === 'spawn') {
    const ws = store.workspace(payload.workspaceId);
    const near = ws.nodes.find((n) => n.id === payload.near);
    const count = store.neighbors(near.id).length;
    const node = {
      id: uid('n-'), w: 720, h: 440,
      x: near.x + near.w + 80, y: near.y + count * 60 - 40,
      ...payload.node,
    };
    ws.nodes.push(node);
    ws.edges.push({ id: uid('e-'), from: near.id, to: node.id });
    store.save();
    startSession(node, ws, 100, 28);
    send('ws:replace', ws);
    return node;
  }
  send('bus:event', { event, ...payload });
}

const bus = new Bus({ store, sessions, portals, ui, socketPath });

function notify(title, body, onClick) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body });
  if (onClick) n.on('click', onClick);
  n.show();
}

const routines = new Routines({ store, sessions, deliver: (node, text) => bus.deliver(node, text), notify: (title, body) => notify(tr(title), body) });
bus.routines = routines;
const assistant = new Assistant({ store, sessions, send, env: () => {
  const env = { ...process.env, PATH: `${process.env.PATH}${extraPath()}` };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
} });
const updater = new Updater(send);

// Ensina os agentes a usar a CLI instalando uma skill em ~/.claude/skills e ~/.agents/skills.
function installSkill() {
  const src = path.join(__dirname, '..', '..', 'skills', 'regente', 'SKILL.md').replace('app.asar', 'app.asar.unpacked');
  const dests = [path.join(os.homedir(), '.claude', 'skills', 'regente'), path.join(os.homedir(), '.agents', 'skills', 'regente')];
  for (const d of dests) { fs.mkdirSync(d, { recursive: true }); fs.copyFileSync(src, path.join(d, 'SKILL.md')); }
  return dests;
}

sessions.on('data', (id, data) => send('term:data', { id, data }));
sessions.on('title', (id, title) => send('term:title', { id, title }));
sessions.on('exit', (id, code) => send('term:exit', { id, code }));
sessions.on('status', (id, status, prev) => {
  send('term:status', { id, status });
  const hit = store.findNode(id);
  if (!hit || store.state.settings.notifications === false) return;
  const focused = win && win.isFocused();
  if (prev === 'working' && status === 'idle') assistant.onTurnEnd(id);
  if (!focused && prev === 'working' && (status === 'idle' || status === 'waiting') && Notification.isSupported()) {
    const n = new Notification({
      title: tr(status === 'waiting' ? '{name} precisa de você' : '{name} terminou', { name: hit.node.title }),
      body: sessions.get(id)?.screenText(6).split('\n').filter((l) => l.trim()).slice(-3).join('\n') || hit.ws.name,
    });
    n.on('click', () => { win.show(); win.focus(); send('focus:node', { id, workspaceId: hit.ws.id }); });
    n.show();
  }
});

// ---------- backups automáticos (a cada hora, guarda os 48 mais recentes) ----------

function backup() {
  try {
    store.flush();
    const dir = path.join(dataDir, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const notes = Object.fromEntries(fs.readdirSync(store.notesDir).map((f) => [f, fs.readFileSync(path.join(store.notesDir, f), 'utf8')]));
    fs.writeFileSync(path.join(dir, `regente-${stamp}.json`), JSON.stringify({ state: store.state, notes }));
    const all = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
    for (const f of all.slice(0, -48)) fs.unlinkSync(path.join(dir, f));
  } catch (e) { console.error('backup falhou', e); }
}
setInterval(backup, 60 * 60 * 1000);

ipcMain.handle('backup:list', () => {
  const dir = path.join(dataDir, 'backups');
  try { return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse(); } catch { return []; }
});
ipcMain.handle('backup:now', () => backup());
ipcMain.handle('backup:restore', (_e, file) => {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, 'backups', path.basename(file)), 'utf8'));
  backup();
  sessions.stopAll();
  store.state = data.state;
  for (const [f, text] of Object.entries(data.notes || {})) fs.writeFileSync(path.join(store.notesDir, path.basename(f)), text);
  store.flush();
  win.reload();
});

ipcMain.handle('routine:list', () => routines.list);
ipcMain.handle('routine:add', (_e, spec) => routines.add(spec));
ipcMain.handle('routine:remove', (_e, id) => routines.remove(id));
ipcMain.handle('routine:update', (_e, { id, patch }) => routines.update(id, patch));

ipcMain.handle('assistant:ask', (_e, { id }) => assistant.summarize(id, true));
ipcMain.handle('skill:install', () => installSkill());
ipcMain.handle('update:status', () => updater.status);
ipcMain.handle('update:check', () => updater.check());
ipcMain.handle('update:install', () => updater.install());

// ---------- IPC ----------

ipcMain.handle('state:get', () => ({ ...store.state, dataDir, version: app.getVersion() }));

ipcMain.handle('ws:save', (_e, ws) => {
  const i = store.state.workspaces.findIndex((w) => w.id === ws.id);
  if (i < 0) return;
  // Mantém campos que só o processo principal escreve (status de agentes).
  const old = new Map(store.state.workspaces[i].nodes.map((n) => [n.id, n]));
  for (const n of ws.nodes) if (old.get(n.id)?.statusText !== undefined && n.statusText === undefined) n.statusText = old.get(n.id).statusText;
  // Encerra sessões de terminais apagados.
  const alive = new Set(ws.nodes.map((n) => n.id));
  for (const id of old.keys()) if (!alive.has(id)) sessions.stop(id);
  store.state.workspaces[i] = ws;
  store.save();
});

ipcMain.handle('state:patch', (_e, patch) => {
  for (const k of ['roles', 'scores', 'agents', 'settings', 'activeWorkspace']) if (k in patch) store.state[k] = patch[k];
  store.save();
});

ipcMain.handle('ws:create', (_e, { name, cwd }) => {
  const ws = newWorkspace(name, cwd);
  store.state.workspaces.push(ws);
  store.save();
  return ws;
});

ipcMain.handle('ws:delete', (_e, id) => {
  const ws = store.workspace(id);
  if (!ws || store.state.workspaces.length === 1) return false;
  for (const n of ws.nodes) sessions.stop(n.id);
  store.state.workspaces = store.state.workspaces.filter((w) => w.id !== id);
  if (store.state.activeWorkspace === id) store.state.activeWorkspace = store.state.workspaces[0].id;
  store.save();
  return true;
});

ipcMain.handle('ws:rename', (_e, { id, name }) => {
  const ws = store.workspace(id);
  if (ws) { ws.name = name; store.save(); }
});

ipcMain.handle('term:start', (_e, { id, cols, rows, restart }) => {
  const hit = store.findNode(id);
  if (!hit) return null;
  let s = sessions.get(id);
  if (restart || !s) s = startSession(hit.node, hit.ws, cols, rows);
  else s.resize(cols, rows);
  return { replay: restart ? '' : s.replay(), status: s.status, title: s.title };
});
ipcMain.on('term:input', (_e, { id, data }) => sessions.get(id)?.write(data));
ipcMain.on('term:submit', (_e, { id, text }) => sessions.get(id)?.submit(text));
ipcMain.on('term:resize', (_e, { id, cols, rows }) => sessions.get(id)?.resize(cols, rows));
ipcMain.handle('term:kill', (_e, id) => sessions.stop(id));
ipcMain.handle('term:statuses', () => Object.fromEntries([...sessions.sessions].map(([id, s]) => [id, s.status])));

ipcMain.handle('note:read', (_e, id) => store.readNote(id));
ipcMain.handle('note:write', (_e, { id, text }) => store.writeNote(id, text));
ipcMain.handle('note:path', (_e, id) => store.notePath(id));

// Recorte de um portal para "apontar e perguntar": salva PNG e devolve o caminho.
ipcMain.handle('portal:capture', async (_e, { wcId, rect }) => {
  const wc = require('electron').webContents.fromId(wcId);
  const img = await wc.capturePage(rect);
  const file = path.join(os.tmpdir(), `regente-recorte-${Date.now()}.png`);
  fs.writeFileSync(file, img.toPNG());
  return file;
});

ipcMain.on('portal:register', (_e, { id, wcId }) => portals.register(id, wcId));

// Certificados inválidos (comuns em ambientes dev/homologação) só passam para hosts que o usuário confiou.
app.on('certificate-error', (event, _wc, url, _error, _cert, callback) => {
  let host = '';
  try { host = new URL(url).host; } catch {}
  if ((store.state.settings.trustedHosts || []).includes(host)) {
    event.preventDefault();
    callback(true);
  } else callback(false);
});
ipcMain.handle('portal:trust', (_e, host) => {
  const s = store.state.settings;
  s.trustedHosts = [...new Set([...(s.trustedHosts || []), host])];
  store.save();
  return s.trustedHosts;
});

// Descobre quais CLIs de agente estão instalados (no PATH do shell interativo do usuário).
ipcMain.handle('agents:detect', async () => {
  const env = { ...process.env, PATH: `${process.env.PATH}${extraPath()}` };
  delete env.ELECTRON_RUN_AS_NODE;
  const shell = process.env.SHELL || '/bin/bash';
  const check = (cmd) => new Promise((resolve) => {
    if (!/^[\w.-]+$/.test(cmd)) return resolve(null);
    execFile('setsid', ['-w', shell, '-ic', `command -v ${cmd}`], { env, timeout: 6000 }, (err, out) => {
      const line = String(out || '').trim().split('\n').pop();
      resolve(!err && line.startsWith('/') ? line : null);
    });
  });
  const result = {};
  await Promise.all(store.state.agents.map(async (a) => {
    const cmd = (a.launch || '').trim().split(/\s+/)[0];
    result[a.id] = cmd ? await check(cmd) : process.env.SHELL || '/bin/sh';
  }));
  return result;
});

ipcMain.handle('dialog:dir', async (_e, def) => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'], defaultPath: def });
  return r.canceled ? null : r.filePaths[0];
});

// Imagem colada no compositor vira arquivo para o agente ler.
ipcMain.handle('clipboard:image', () => {
  const img = clipboard.readImage();
  if (img.isEmpty()) return null;
  const file = path.join(os.tmpdir(), `regente-paste-${Date.now()}.png`);
  fs.writeFileSync(file, img.toPNG());
  return file;
});

ipcMain.handle('open:path', (_e, p) => shell.openPath(p));

// ---------- Andares (cópias isoladas do workspace) ----------

const git = (cwd, args) => new Promise((resolve, reject) =>
  execFile('git', ['-C', cwd, ...args], { maxBuffer: 10 << 20 }, (err, out, errOut) => err ? reject(new Error((errOut || err.message).trim())) : resolve(out.trim())));

function cloneWorkspace(src, name, fromDir, toDir) {
  const ws = JSON.parse(JSON.stringify(src));
  const map = new Map();
  ws.id = uid('w-');
  ws.name = name;
  ws.createdAt = Date.now();
  for (const n of ws.nodes) {
    const nid = uid('n-');
    map.set(n.id, nid);
    if (n.type === 'note') store.writeNote(nid, store.readNote(n.id));
    n.id = nid;
    delete n.statusText;
    if (n.cwd && fromDir && toDir && (n.cwd === fromDir || n.cwd.startsWith(fromDir + '/'))) n.cwd = toDir + n.cwd.slice(fromDir.length);
  }
  ws.edges = ws.edges.filter((e) => map.has(e.from) && map.has(e.to)).map((e) => ({ ...e, id: uid('e-'), from: map.get(e.from), to: map.get(e.to) }));
  if (toDir) ws.cwd = toDir;
  return ws;
}

ipcMain.handle('floor:create', async (_e, { workspaceId, name }) => {
  const src = store.workspace(workspaceId);
  const slug = name.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'andar';
  let root;
  try { root = await git(src.cwd, ['rev-parse', '--show-toplevel']); } catch {}
  let floor;
  if (root) {
    const dir = path.join(path.dirname(root), '.regente-andares', `${path.basename(root)}-${slug}-${Date.now().toString(36)}`);
    const branch = `regente/${slug}`;
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    const base = await git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
    await git(root, ['worktree', 'add', '-b', branch, dir]);
    floor = { kind: 'git', dir, branch, base, root };
    const ws = cloneWorkspace(src, `${src.name} / ${name}`, root, dir);
    ws.parentId = src.id; ws.floor = floor;
    store.state.workspaces.push(ws); store.save();
    return ws;
  }
  // Sem git: cópia do diretório (reflink quando o sistema de arquivos suporta, ex. btrfs/xfs).
  const dir = `${src.cwd.replace(/\/$/, '')}-${slug}`;
  await new Promise((res, rej) => execFile('cp', ['-a', '--reflink=auto', src.cwd, dir], (err) => err ? rej(err) : res()));
  const ws = cloneWorkspace(src, `${src.name} / ${name}`, src.cwd, dir);
  ws.parentId = src.id; ws.floor = { kind: 'copy', dir, root: src.cwd };
  store.state.workspaces.push(ws); store.save();
  return ws;
});

// "Pousar" um andar: faz merge da branch do andar na branch base do repositório original.
ipcMain.handle('floor:land', async (_e, id) => {
  const ws = store.workspace(id);
  if (ws?.floor?.kind !== 'git') throw new Error('só andares git podem ser pousados automaticamente');
  const status = await git(ws.floor.dir, ['status', '--porcelain']);
  if (status) throw new Error('o andar tem mudanças não commitadas; peça a um agente para commitar antes de pousar');
  const cur = await git(ws.floor.root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (cur !== ws.floor.base) throw new Error(`o repositório original está em "${cur}", esperado "${ws.floor.base}"`);
  return git(ws.floor.root, ['merge', '--no-ff', '-m', `Pousa andar ${ws.name}`, ws.floor.branch]);
});

ipcMain.handle('floor:discard', async (_e, id) => {
  const ws = store.workspace(id);
  if (!ws?.floor) throw new Error('não é um andar');
  for (const n of ws.nodes) sessions.stop(n.id);
  if (ws.floor.kind === 'git') {
    await git(ws.floor.root, ['worktree', 'remove', '--force', ws.floor.dir]);
    await git(ws.floor.root, ['branch', '-D', ws.floor.branch]).catch(() => {});
  } else {
    fs.rmSync(ws.floor.dir, { recursive: true, force: true });
  }
  store.state.workspaces = store.state.workspaces.filter((w) => w.id !== id);
  if (store.state.activeWorkspace === id) store.state.activeWorkspace = ws.parentId || store.state.workspaces[0].id;
  store.save();
  return store.state.activeWorkspace;
});

// ---------- janela ----------

function createWindow() {
  win = new BrowserWindow({
    width: 1500, height: 950, backgroundColor: '#0e0f13', title: 'Regente', icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: !process.env.REGENTE_TEST_SCRIPT, paintWhenInitiallyHidden: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, webviewTag: true, sandbox: false, backgroundThrottling: !process.env.REGENTE_TEST_SCRIPT, offscreen: !!process.env.REGENTE_TEST_SCRIPT },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  // Links abertos por terminais/notas vão para o navegador do sistema.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  if (process.env.REGENTE_DEVTOOLS) win.webContents.openDevTools({ mode: 'detach' });
  win.webContents.on('console-message', (e) => {
    if (e.level === 'error' || process.env.REGENTE_TEST_SCRIPT) console.log(`[renderer:${e.level}] ${e.message}`);
  });
  if (process.env.REGENTE_TEST_SCRIPT) runTestScript(process.env.REGENTE_TEST_SCRIPT);
}

// Gancho de teste ponta a ponta: roda um módulo que recebe { win, store, sessions, shot } e encerra o app.
function runTestScript(file) {
  win.webContents.once('did-finish-load', async () => {
    const shot = async (out) => {
      win.webContents.invalidate();
      await new Promise((r) => setTimeout(r, 300));
      // Captura de janela oculta às vezes falha no compositor (UnknownVizError): tenta de novo.
      for (let i = 0; i < 3; i++) {
        try {
          const img = await Promise.race([win.webContents.capturePage(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]);
          fs.writeFileSync(out, img.toPNG());
          return;
        } catch (e) { console.log('captura falhou:', e.message); }
        await new Promise((r) => setTimeout(r, 500));
      }
    };
    try {
      await require(path.resolve(file))({ win, store, sessions, bus, shot, wait: (ms) => new Promise((r) => setTimeout(r, ms)) });
    } catch (e) {
      console.error('TESTE FALHOU:', e);
      process.exitCode = 1;
    }
    app.quit();
  });
}

app.whenReady().then(() => {
  installShim();
  bus.listen();
  createWindow();
  updater.start(() => store.state.settings.autoUpdate !== false);
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { routines.stop(); store.flush(); sessions.stopAll(); bus.close(); });
