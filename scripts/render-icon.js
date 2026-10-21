// Gera os PNGs do ícone a partir de build/icon.svg, renderizando offscreen no próprio Electron.
// Uso: env -u ELECTRON_RUN_AS_NODE npx electron scripts/render-icon.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// build/icons/NxN.png é o conjunto do Linux: sem ele o .deb/.rpm só instala hicolor/1024x1024, que os temas não varrem.
const LINUX = [16, 24, 32, 48, 64, 128, 256, 512].map((s) => [`build/icons/${s}x${s}.png`, s]);
const OUT = [['build/icon.png', 1024], ['src/assets/icon.png', 512], ...LINUX];

app.disableHardwareAcceleration();
app.on('window-all-closed', () => {}); // não encerrar entre um tamanho e outro
app.whenReady().then(async () => {
  fs.mkdirSync(path.join(ROOT, 'build/icons'), { recursive: true });
  const svg = fs.readFileSync(path.join(ROOT, 'build/icon.svg')).toString('base64');
  for (const [file, size] of OUT) {
    const win = new BrowserWindow({ width: size, height: size, show: false, transparent: true, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
    const html = `<body style="margin:0"><img src="data:image/svg+xml;base64,${svg}" width="${size}" height="${size}" style="display:block"></body>`;
    await win.loadURL('data:text/html;base64,' + Buffer.from(html).toString('base64'));
    await new Promise((r) => setTimeout(r, 300));
    const img = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
    fs.writeFileSync(path.join(ROOT, file), img.resize({ width: size, height: size }).toPNG());
    console.log(`${file} (${size}px)`);
    win.destroy();
  }
  app.quit();
});
