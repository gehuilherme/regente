// Atualização automática via GitHub Releases (electron-updater lê os latest*.yml publicados pelo build).
// Linux (deb/rpm) e Windows baixam e instalam sozinhos. No macOS o app só tem assinatura ad-hoc e o
// Squirrel.Mac recusa instalar, então lá apenas avisa e abre a página da release.
const { app, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

const RELEASES = 'https://github.com/gehuilherme/regente/releases/latest';
const EVERY = 6 * 60 * 60 * 1000;
const notifyOnly = process.platform === 'darwin';

class Updater {
  constructor(send) {
    this.send = send;
    // Só no app empacotado: em `npm start` e nos testes não há app-update.yml nem o que atualizar.
    this.enabled = app.isPackaged && !process.env.REGENTE_TEST_SCRIPT;
    this.status = { state: this.enabled ? 'idle' : 'disabled', notifyOnly };
    if (!this.enabled) return;
    autoUpdater.autoDownload = !notifyOnly;
    autoUpdater.autoInstallOnAppQuit = !notifyOnly;
    autoUpdater.on('checking-for-update', () => this.set({ state: 'checking' }));
    autoUpdater.on('update-not-available', () => this.set({ state: 'none' }));
    autoUpdater.on('update-available', (i) => this.set({ state: notifyOnly ? 'available' : 'downloading', version: i.version }));
    autoUpdater.on('download-progress', (p) => this.set({ ...this.status, state: 'downloading', percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (i) => this.set({ state: 'ready', version: i.version }));
    autoUpdater.on('error', (e) => { console.error('[updater]', e.message); this.set({ state: 'error', message: e.message }); });
  }

  set(s) { this.status = { ...s, notifyOnly }; this.send('update:status', this.status); }

  // Checagem periódica; `allowed()` é relido a cada vez para respeitar a configuração atual.
  start(allowed) {
    if (!this.enabled) return;
    const tick = () => allowed() && this.check();
    setTimeout(tick, 15_000);
    setInterval(tick, EVERY);
  }

  async check() {
    if (!this.enabled || ['checking', 'downloading', 'ready'].includes(this.status.state)) return this.status;
    try { await autoUpdater.checkForUpdates(); } catch (e) { this.set({ state: 'error', message: e.message }); }
    return this.status;
  }

  install() {
    if (notifyOnly) shell.openExternal(RELEASES);
    else if (this.status.state === 'ready') autoUpdater.quitAndInstall();
  }
}

module.exports = { Updater };
