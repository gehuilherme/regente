// Controle de portais (webviews) pelos agentes: snapshot de elementos com refs, clique, digitação, screenshot.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { webContents } = require('electron');

// Injetado na página: numera elementos interativos visíveis e devolve uma árvore textual compacta.
const SNAPSHOT_JS = `(() => {
  const sel = 'a,button,input,textarea,select,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=menuitem],[contenteditable=""],[contenteditable=true],[onclick],h1,h2,h3,label';
  let n = 0; const out = [];
  document.querySelectorAll('[data-rg-ref]').forEach(e => e.removeAttribute('data-rg-ref'));
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (r.width < 2 || r.height < 2 || st.visibility === 'hidden' || st.display === 'none') continue;
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role') || tag;
    const name = (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || el.title || el.alt || '').trim().replace(/\\s+/g, ' ').slice(0, 80);
    if (/^h[1-3]$|^label$/.test(tag)) { if (name) out.push('  ' + tag + ': ' + name); continue; }
    const ref = ++n; el.setAttribute('data-rg-ref', ref);
    let extra = '';
    if (tag === 'input') extra = ' type=' + (el.type || 'text') + (el.value ? ' value="' + String(el.value).slice(0, 40) + '"' : '') + (el.checked ? ' checked' : '');
    if (tag === 'a' && el.href) extra = ' href=' + el.getAttribute('href').slice(0, 80);
    if (el.disabled) extra += ' disabled';
    out.push('[' + ref + '] ' + role + ' "' + name + '"' + extra + (r.top > innerHeight || r.bottom < 0 ? ' (fora da tela)' : ''));
  }
  return 'URL: ' + location.href + '\\nTítulo: ' + document.title + '\\n' + out.join('\\n');
})()`;

const refRect = (ref) => `(() => {
  const el = document.querySelector('[data-rg-ref="${Number(ref)}"]');
  if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center' });
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
})()`;

class Portals {
  constructor() { this.byNode = new Map(); }

  register(nodeId, wcId) { this.byNode.set(nodeId, wcId); }

  wc(nodeId) {
    const id = this.byNode.get(nodeId);
    const wc = id != null && webContents.fromId(id);
    if (!wc || wc.isDestroyed()) throw new Error('portal não está aberto na tela (abra o workspace dele)');
    return wc;
  }

  async click(wc, ref) {
    const p = await wc.executeJavaScript(refRect(ref));
    if (!p) throw new Error(`ref ${ref} não encontrada; rode "portal snapshot" de novo`);
    for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) {
      wc.sendInputEvent({ type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    }
    return `clicou em [${ref}]`;
  }

  async run(nodeId, action, a = {}) {
    const wc = this.wc(nodeId);
    switch (action) {
      case 'url': return wc.getURL();
      case 'goto': {
        let url = String(a.url || '');
        if (!/^[a-z]+:/i.test(url)) url = 'http://' + url;
        try {
          await wc.loadURL(url);
        } catch (e) {
          if (/ERR_CERT/.test(e.message)) throw new Error(`certificado HTTPS inválido em ${url}. Peça ao usuário para clicar em "Confiar" no portal.`);
          throw e;
        }
        return `abriu ${wc.getURL()}`;
      }
      case 'back': wc.navigationHistory.goBack(); return 'voltou';
      case 'reload': wc.reload(); return 'recarregou';
      case 'snapshot': return wc.executeJavaScript(SNAPSHOT_JS);
      case 'text': return (await wc.executeJavaScript('document.body.innerText')).slice(0, a.max || 20000);
      case 'click': return this.click(wc, a.ref);
      case 'type': {
        if (a.ref != null) {
          await this.click(wc, a.ref);
          await wc.executeJavaScript(`(() => { const e = document.querySelector('[data-rg-ref="${Number(a.ref)}"]'); if (e && 'value' in e && ${!!a.clear}) e.value = ''; })()`);
        }
        await wc.insertText(String(a.text ?? ''));
        if (a.submit) this.key(wc, 'Enter');
        return 'digitou';
      }
      case 'key': this.key(wc, a.key); return `tecla ${a.key}`;
      case 'scroll': await wc.executeJavaScript(`scrollBy(0, ${Number(a.dy) || 600})`); return 'rolou';
      case 'eval': return JSON.stringify(await wc.executeJavaScript(String(a.js)), null, 2) ?? 'undefined';
      case 'screenshot': {
        const img = await wc.capturePage();
        const file = a.path || path.join(os.tmpdir(), `regente-portal-${Date.now()}.png`);
        fs.writeFileSync(file, img.toPNG());
        return file;
      }
      default: throw new Error(`ação de portal desconhecida: ${action}`);
    }
  }

  key(wc, key) {
    const keyCode = String(key);
    wc.sendInputEvent({ type: 'keyDown', keyCode });
    if (keyCode.length === 1) wc.sendInputEvent({ type: 'char', keyCode });
    wc.sendInputEvent({ type: 'keyUp', keyCode });
  }
}

module.exports = { Portals };
