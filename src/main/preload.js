const { contextBridge, ipcRenderer } = require('electron');

const on = (ch) => (fn) => {
  const h = (_e, p) => fn(p);
  ipcRenderer.on(ch, h);
  return () => ipcRenderer.removeListener(ch, h);
};

contextBridge.exposeInMainWorld('regente', {
  getState: () => ipcRenderer.invoke('state:get'),
  patchState: (p) => ipcRenderer.invoke('state:patch', p),
  saveWorkspace: (ws) => ipcRenderer.invoke('ws:save', ws),
  createWorkspace: (o) => ipcRenderer.invoke('ws:create', o),
  deleteWorkspace: (id) => ipcRenderer.invoke('ws:delete', id),
  renameWorkspace: (o) => ipcRenderer.invoke('ws:rename', o),

  termStart: (o) => ipcRenderer.invoke('term:start', o),
  termInput: (id, data) => ipcRenderer.send('term:input', { id, data }),
  termSubmit: (id, text) => ipcRenderer.send('term:submit', { id, text }),
  termResize: (id, cols, rows) => ipcRenderer.send('term:resize', { id, cols, rows }),
  termKill: (id) => ipcRenderer.invoke('term:kill', id),
  termStatuses: () => ipcRenderer.invoke('term:statuses'),

  noteRead: (id) => ipcRenderer.invoke('note:read', id),
  noteWrite: (id, text) => ipcRenderer.invoke('note:write', { id, text }),
  notePath: (id) => ipcRenderer.invoke('note:path', id),

  portalRegister: (id, wcId) => ipcRenderer.send('portal:register', { id, wcId }),
  portalTrust: (host) => ipcRenderer.invoke('portal:trust', host),
  detectAgents: () => ipcRenderer.invoke('agents:detect'),

  floorCreate: (o) => ipcRenderer.invoke('floor:create', o),
  floorLand: (id) => ipcRenderer.invoke('floor:land', id),
  floorDiscard: (id) => ipcRenderer.invoke('floor:discard', id),

  pickDir: (def) => ipcRenderer.invoke('dialog:dir', def),
  clipboardImage: () => ipcRenderer.invoke('clipboard:image'),
  openPath: (p) => ipcRenderer.invoke('open:path', p),

  routineList: () => ipcRenderer.invoke('routine:list'),
  routineAdd: (spec) => ipcRenderer.invoke('routine:add', spec),
  routineRemove: (id) => ipcRenderer.invoke('routine:remove', id),
  routineUpdate: (id, patch) => ipcRenderer.invoke('routine:update', { id, patch }),
  backupList: () => ipcRenderer.invoke('backup:list'),
  backupNow: () => ipcRenderer.invoke('backup:now'),
  backupRestore: (f) => ipcRenderer.invoke('backup:restore', f),
  assistantAsk: (id) => ipcRenderer.invoke('assistant:ask', { id }),
  skillInstall: () => ipcRenderer.invoke('skill:install'),
  captureRegion: (wcId, rect) => ipcRenderer.invoke('portal:capture', { wcId, rect }),

  onTermData: on('term:data'),
  onAssistantCard: on('assistant:card'),
  onTermStatus: on('term:status'),
  onTermTitle: on('term:title'),
  onTermExit: on('term:exit'),
  onBusEvent: on('bus:event'),
  onWorkspaceReplace: on('ws:replace'),
  onFocusNode: on('focus:node'),
});
