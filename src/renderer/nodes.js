// Conteúdo dos nós: terminal (xterm + compositor), nota (Markdown) e portal (webview).
import { el, debounce, toast, ic, modal, menuBelow, t } from './ui.js';

const api = window.regente;

const DARK = {
  background: '#0f1014', foreground: '#e6e8ee', cursor: '#5b8cff', cursorAccent: '#0f1014',
  selectionBackground: '#3a4a7a', black: '#1b1d24', brightBlack: '#5b6070',
  red: '#ff6b6b', green: '#3ecf8e', yellow: '#f5b544', blue: '#7c9cff', magenta: '#c792ea', cyan: '#5fd7e6', white: '#d8dbe5',
  brightRed: '#ff8a8a', brightGreen: '#6ee7b0', brightYellow: '#ffd27a', brightBlue: '#a3baff', brightMagenta: '#dcb0f5', brightCyan: '#8eeaf5', brightWhite: '#ffffff',
};
const LIGHT = {
  background: '#ffffff', foreground: '#1d1d1f', cursor: '#2f6df6', cursorAccent: '#ffffff',
  selectionBackground: '#b9d0ff', black: '#1d1d1f', brightBlack: '#8b8b93',
  red: '#d7263d', green: '#1a9a55', yellow: '#b07800', blue: '#2f6df6', magenta: '#a23fc9', cyan: '#0f8ea1', white: '#6e6e76',
  brightRed: '#e5383b', brightGreen: '#26b36b', brightYellow: '#c98d00', brightBlue: '#4f86ff', brightMagenta: '#b95ee0', brightCyan: '#1aa7bb', brightWhite: '#3a3a40',
};
export const termTheme = () => (document.documentElement.dataset.theme === 'dark' ? DARK : LIGHT);

export class TerminalView {
  constructor(node, ctx) {
    this.node = node;
    this.ctx = ctx;
    this.body = el('div', { class: 'node-body term-body' });
    this.term = new window.Terminal({
      fontFamily: '"JetBrains Mono", "Fira Code", "DejaVu Sans Mono", monospace',
      fontSize: ctx.settings().fontSize || 13, lineHeight: 1.15, theme: termTheme(), scrollback: 10000,
      allowProposedApi: true, macOptionIsMeta: true, cursorBlink: true,
    });
    this.fit = new window.FitAddon.FitAddon();
    this.term.loadAddon(this.fit);
    this.opened = false;
    this.starting = false;
    this.draft = '';
    this.term.onData((d) => api.termInput(node.id, d));
    this.term.attachCustomKeyEventHandler((e) => this.keyHandler(e));
    this.ro = new ResizeObserver(debounce(() => this.refit(), 60));
    this.ro.observe(this.body);
  }

  keyHandler(e) {
    if (e.type !== 'keydown') return true;
    if (this.ctx.isGlobalShortcut(e)) return false;
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
      const sel = this.term.getSelection();
      if (sel) navigator.clipboard.writeText(sel);
      return false;
    }
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyV') {
      navigator.clipboard.readText().then((t) => t && this.term.paste(t));
      return false;
    }
    if (e.ctrlKey && e.code === 'KeyI') { this.toggleComposer(); return false; }
    return true;
  }

  attach() {
    if (!this.opened) {
      this.term.open(this.body);
      this.opened = true;
      this.start(false);
    } else {
      this.refit();
    }
  }

  async start(restart) {
    this.starting = true;
    this.refit(true);
    const r = await api.termStart({ id: this.node.id, cols: this.term.cols, rows: this.term.rows, restart });
    if (restart) this.term.reset();
    if (r?.replay) this.term.write(r.replay);
    if (r) this.ctx.setStatus(this.node.id, r.status);
    this.starting = false;
    this.body.querySelector('.exit-overlay')?.remove();
  }

  write(data) { if (!this.starting) this.term.write(data); }

  refit(local) {
    if (!this.opened || !this.body.isConnected || this.body.clientWidth < 20) return;
    try { this.fit.fit(); } catch {}
    if (!local) api.termResize(this.node.id, this.term.cols, this.term.rows);
  }

  focus() { this.term.focus(); }

  showExit(code) {
    if (this.body.querySelector('.exit-overlay')) return;
    this.body.append(el('div', { class: 'exit-overlay' }, t('processo encerrado ({code})', { code }),
      el('button', { onclick: () => this.start(true) }, t('Reiniciar'))));
  }

  headerExtras() {
    // Seletor próprio em vez de <select>: o popup nativo ignora o tema do app.
    const label = el('span');
    const roleBtn = el('button', { class: 'role-pick', title: t('Papel do agente'), onclick: () => menuBelow(roleBtn, [
      { label: t('sem papel'), checked: !this.node.roleId, action: () => setRole(null) },
      'sep',
      ...this.ctx.roles().map((r) => ({ label: t(r.name), checked: r.id === this.node.roleId, action: () => setRole(r) })),
    ]) }, label, ic('chevron-down', 'sm'));
    const paint = () => {
      const role = this.ctx.roles().find((r) => r.id === this.node.roleId);
      label.textContent = role ? t(role.name) : t('sem papel');
      roleBtn.classList.toggle('set', !!role);
    };
    const setRole = (role) => {
      this.node.roleId = role?.id;
      this.ctx.save();
      paint();
      if (role) {
        // O agente já está rodando: entrega o novo papel como mensagem.
        api.termSubmit(this.node.id, t('[Regente] A partir de agora seu papel é "{name}":\n{prompt}', { name: t(role.name), prompt: t(role.prompt) }));
        toast(t('Papel "{name}" enviado ao agente', { name: t(role.name) }));
      }
    };
    paint();
    return [
      roleBtn,
      el('button', { title: t('Compositor (Ctrl+I)'), onclick: () => this.toggleComposer() }, ic('pencil')),
      el('button', { title: t('Ponto: resumir e sugerir próximos passos'), onclick: () => this.ctx.askAssistant(this.node.id) }, ic('sparkles')),
      el('button', { title: t('Reiniciar agente'), onclick: () => this.start(true) }, ic('rotate-cw')),
    ];
  }

  // ---------- compositor de prompt ----------

  toggleComposer(force) {
    const open = force ?? !this.composer;
    if (!open) {
      if (this.composer) { this.draft = this.composer.querySelector('textarea').value; this.composer.remove(); this.composer = null; }
      this.term.focus();
      return;
    }
    if (this.composer) return this.composer.querySelector('textarea').focus();
    const ta = el('textarea', { placeholder: t('Escreva para o agente…  Enter envia · Shift+Enter quebra linha · @ menciona conectados · cole imagens'), value: this.draft });
    const menuBox = el('div', { class: 'mention-menu', hidden: true });
    let options = [];
    let sel = 0;
    const renderMenu = () => {
      menuBox.replaceChildren(...options.map((o, i) => el('div', { class: i === sel ? 'on' : '', onpointerdown: (e) => { e.preventDefault(); pick(i); } }, `${o.title}  ·  ${o.type}`)));
      menuBox.hidden = !options.length;
    };
    const mentionQuery = () => {
      const m = ta.value.slice(0, ta.selectionStart).match(/@([\wÀ-ſ -]*)$/);
      return m ? m[1] : null;
    };
    const pick = (i) => {
      const q = mentionQuery();
      const o = options[i];
      if (q == null || !o) return;
      const start = ta.selectionStart - q.length - 1;
      ta.setRangeText(`@${o.title} `, start, ta.selectionStart, 'end');
      options = []; renderMenu(); ta.focus();
    };
    ta.addEventListener('input', () => {
      const q = mentionQuery();
      options = q == null ? [] : this.ctx.neighbors(this.node.id).filter((n) => n.title.toLowerCase().startsWith(q.toLowerCase()));
      sel = 0; renderMenu();
      this.draft = ta.value;
    });
    ta.addEventListener('keydown', (e) => {
      if (options.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length; renderMenu(); e.preventDefault(); return; }
      if (options.length && (e.key === 'Tab' || e.key === 'Enter')) { pick(sel); e.preventDefault(); return; }
      if (e.key === 'Escape') { this.toggleComposer(false); e.preventDefault(); return; }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendComposer(ta); }
      e.stopPropagation();
    });
    ta.addEventListener('paste', async (e) => {
      if ([...e.clipboardData.items].some((i) => i.type.startsWith('image/'))) {
        e.preventDefault();
        const file = await api.clipboardImage();
        if (file) ta.setRangeText(` ${file} `, ta.selectionStart, ta.selectionEnd, 'end');
      }
    });
    this.composer = el('div', { class: 'composer', onpointerdown: (e) => e.stopPropagation() },
      menuBox, ta,
      el('div', { class: 'row' }, el('span', {}, t('para {name}', { name: this.node.title })), el('span', { class: 'spacer' }),
        el('button', { onclick: () => this.toggleComposer(false) }, t('Fechar')),
        el('button', { class: 'active', onclick: () => this.sendComposer(ta) }, t('Enviar ⏎'))));
    this.body.append(this.composer);
    ta.focus();
  }

  sendComposer(ta) {
    let text = ta.value.trim();
    if (!text) return;
    // Menções viram referências que o agente sabe resolver com a CLI.
    const refs = [];
    for (const n of this.ctx.neighbors(this.node.id)) {
      if (text.includes('@' + n.title)) {
        const how = n.type === 'note' ? `regente note "${n.title}" read` : n.type === 'portal' ? `regente portal "${n.title}" snapshot` : `regente read "${n.title}"`;
        refs.push(`- @${n.title} (${n.type}): \`${how}\``);
      }
    }
    if (refs.length) text += `\n\n${t('Referências no canvas:')}\n${refs.join('\n')}`;
    api.termSubmit(this.node.id, text);
    ta.value = '';
    this.draft = '';
  }

  dispose() { this.ro.disconnect(); this.term.dispose(); }
}

export class NoteView {
  constructor(node, ctx) {
    this.node = node;
    this.ctx = ctx;
    this.body = el('div', { class: 'node-body note-body' });
    this.text = '';
    this.editing = false;
    this.saveSoon = debounce(() => api.noteWrite(node.id, this.text), 300);
    api.noteRead(node.id).then((t) => { this.text = t || ''; this.editing = !this.text; this.render(); });
  }

  render() {
    if (this.editing) {
      const ta = el('textarea', {
        value: this.text, placeholder: t('Markdown… agentes conectados podem escrever aqui (regente note)'),
        oninput: () => { this.text = ta.value; this.saveSoon(); },
        onkeydown: (e) => { if (e.key === 'Escape') { this.editing = false; this.render(); } e.stopPropagation(); },
        onblur: () => { if (this.text) { this.editing = false; this.render(); } },
      });
      this.body.replaceChildren(ta);
      if (this.body.isConnected) ta.focus();
    } else {
      const md = el('div', { class: 'md', ondblclick: () => { this.editing = true; this.render(); } });
      md.innerHTML = window.marked.parse(this.text || t('_vazia — duplo clique para editar_'));
      // Checkboxes de tarefas clicáveis.
      md.querySelectorAll('input[type=checkbox]').forEach((cb, i) => {
        cb.disabled = false;
        cb.addEventListener('change', () => { this.toggleTask(i, cb.checked); });
      });
      md.querySelectorAll('a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); window.open(a.href); }));
      this.body.replaceChildren(md);
    }
  }

  toggleTask(index, checked) {
    let i = -1;
    this.text = this.text.replace(/^(\s*[-*] )\[( |x)\]/gim, (m, p) => (++i === index ? `${p}[${checked ? 'x' : ' '}]` : m));
    this.saveSoon();
  }

  external(text) {
    this.text = text;
    const ta = this.body.querySelector('textarea');
    // Editando agora: atualiza o texto no lugar, preservando o cursor.
    if (ta && document.activeElement === ta) {
      const pos = ta.selectionStart;
      ta.value = text;
      ta.setSelectionRange(pos, pos);
      return;
    }
    if (this.editing && !text) return this.render();
    this.editing = false;
    this.render();
  }

  headerExtras() {
    return [
      el('button', { title: t('Editar / visualizar'), onclick: () => { this.editing = !this.editing; this.render(); } }, ic('pencil')),
      el('button', { title: t('Abrir arquivo .md'), onclick: async () => api.openPath(await api.notePath(this.node.id)) }, ic('external-link')),
    ];
  }

  attach() {}
  focus() { if (this.editing) this.body.querySelector('textarea')?.focus(); }
  dispose() {}
}

export class PortalView {
  constructor(node, ctx) {
    this.node = node;
    this.ctx = ctx;
    this.url = el('input', {
      type: 'text', value: node.url || '',
      onkeydown: (e) => { e.stopPropagation(); if (e.key === 'Enter') this.go(this.url.value); },
    });
    this.view = el('webview', { src: node.url || 'about:blank', partition: 'persist:regente', allowpopups: true });
    this.view.addEventListener('dom-ready', () => {
      api.portalRegister(node.id, this.view.getWebContentsId());
      this.syncZoom();
    });
    const nav = (e) => {
      this.url.value = e.url;
      if (node.url !== e.url) { node.url = e.url; ctx.save(); }
    };
    this.view.addEventListener('did-navigate', nav);
    this.view.addEventListener('did-navigate-in-page', (e) => e.isMainFrame && nav(e));
    this.view.addEventListener('page-title-updated', (e) => { this.title = e.title; ctx.refreshMeta(node.id); });
    this.view.addEventListener('did-start-loading', () => this.body.querySelector('.portal-error')?.remove());
    this.view.addEventListener('did-fail-load', (e) => {
      // -3 = navegação abortada (normal ao trocar de página rápido).
      if (!e.isMainFrame || e.errorCode === -3) return;
      this.showError(e.validatedURL || this.url.value, e.errorCode, e.errorDescription);
    });
    this.body = el('div', { class: 'node-body portal-body' },
      el('div', { class: 'portal-bar', onpointerdown: (e) => e.stopPropagation() },
        el('button', { title: t('Voltar'), onclick: () => this.view.canGoBack() && this.view.goBack() }, ic('arrow-left')),
        el('button', { title: t('Recarregar'), onclick: () => this.view.reload() }, ic('rotate-cw')),
        this.url,
        el('button', { title: t('Apontar e perguntar: recorte uma área e envie a um agente'), onclick: () => this.startLasso() }, ic('crosshair'))),
      this.view);
  }

  // Página de erro no lugar do branco: explica o problema e, para certificados, oferece confiar no host.
  showError(url, code, desc) {
    this.body.querySelector('.portal-error')?.remove();
    let host = '';
    try { host = new URL(url).host; } catch {}
    const cert = code <= -200 && code > -300;
    const box = el('div', { class: 'portal-error', onpointerdown: (e) => e.stopPropagation() },
      ic(cert ? 'shield-alert' : 'wifi-off', 'big'),
      el('h3', {}, cert ? t('Certificado não confiável') : t('Não foi possível abrir a página')),
      el('p', {}, cert
        ? t('O certificado HTTPS de {host} não é reconhecido ({desc}). É comum em ambientes de desenvolvimento e homologação com certificado próprio.', { host, desc })
        : `${url} — ${desc} (${code})`),
      el('div', { class: 'row' },
        cert && el('button', {
          class: 'primary',
          onclick: async () => { this.ctx.settings().trustedHosts = await api.portalTrust(host); toast(t('{host} marcado como confiável', { host })); this.view.loadURL(url); },
        }, t('Confiar em {host} e abrir', { host })),
        el('button', { class: 'outline', onclick: () => this.view.loadURL(url) }, t('Tentar de novo'))),
      cert && el('small', {}, t('A exceção vale só para este host e pode ser removida em Configurações.')));
    this.body.append(box);
  }

  go(u) {
    let url = u.trim();
    if (!url) return;
    if (!/^[a-z]+:/i.test(url)) url = (/^localhost|^\d+\.\d+|^[\w-]+:\d+/.test(url) ? 'http://' : 'https://') + url;
    this.view.loadURL(url);
  }

  // O conteúdo do webview não acompanha o zoom CSS do canvas; espelha o fator manualmente.
  syncZoom() {
    try { this.view.setZoomFactor(this.ctx.zoom()); } catch {}
  }

  headerExtras() { return []; }

  // Recorta uma região da página: imagem + elementos sob ela vão para um agente conectado.
  startLasso() {
    const layer = el('div', { class: 'lasso' });
    const box = el('div', { class: 'rect' });
    layer.append(box);
    this.body.append(layer);
    const vr = () => this.view.getBoundingClientRect();
    let start = null;
    layer.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      layer.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY };
    });
    layer.addEventListener('pointermove', (e) => {
      if (!start) return;
      const z = this.ctx.zoom();
      const lr = layer.getBoundingClientRect();
      Object.assign(box.style, {
        left: (Math.min(start.x, e.clientX) - lr.left) / z + 'px', top: (Math.min(start.y, e.clientY) - lr.top) / z + 'px',
        width: Math.abs(e.clientX - start.x) / z + 'px', height: Math.abs(e.clientY - start.y) / z + 'px',
      });
    });
    layer.addEventListener('pointerup', async (e) => {
      layer.remove();
      if (!start) return;
      const r = vr();
      const sel = {
        x: Math.round(Math.max(0, Math.min(start.x, e.clientX) - r.left)), y: Math.round(Math.max(0, Math.min(start.y, e.clientY) - r.top)),
        width: Math.round(Math.abs(e.clientX - start.x)), height: Math.round(Math.abs(e.clientY - start.y)),
      };
      if (sel.width < 6 || sel.height < 6) return;
      const file = await api.captureRegion(this.view.getWebContentsId(), sel);
      const f = this.ctx.zoom();
      const elements = await this.view.executeJavaScript(`(() => {
        const R = { l: ${sel.x / f}, t: ${sel.y / f}, r: ${(sel.x + sel.width) / f}, b: ${(sel.y + sel.height) / f} };
        const out = [];
        for (const e of document.body.querySelectorAll('*')) {
          const b = e.getBoundingClientRect();
          if (b.width < 2 || b.height < 2 || b.right < R.l || b.left > R.r || b.bottom < R.t || b.top > R.b) continue;
          const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').slice(0, 60);
          const tid = e.getAttribute('data-testid') || e.id;
          if (!own && !tid && !/^(button|a|input|img|select|textarea)$/i.test(e.tagName)) continue;
          out.push(e.tagName.toLowerCase() + (tid ? '#' + tid : '') + (own ? ' "' + own + '"' : '') + ' [' + [b.left, b.top, b.width, b.height].map(Math.round).join(',') + ']');
          if (out.length >= 24) break;
        }
        return out;
      })()`);
      this.sendLasso(file, elements);
    });
  }

  sendLasso(file, elements) {
    const targets = this.ctx.neighbors(this.node.id).filter((n) => n.type === 'terminal');
    if (!targets.length) { toast(t('Conecte este portal a um agente para enviar recortes'), true); return; }
    modal((close) => {
      const ta = el('textarea', { placeholder: t('O que o agente deve fazer com esta área? (ex.: "este botão está desalinhado")') });
      const sel = el('select', {}, targets.map((t) => el('option', { value: t.id }, t.title)));
      return [
        el('h3', {}, t('Apontar e perguntar')),
        el('div', { class: 'hint' }, t('{n} elementos na região · imagem: {file}', { n: elements.length, file })),
        ta,
        el('div', { class: 'row' }, el('label', {}, t('Enviar para')), sel),
        el('div', { class: 'actions' }, el('button', { onclick: close }, t('Cancelar')), el('button', {
          class: 'primary',
          onclick: () => {
            const text = t('[Regente] Recorte do portal "{name}" ({url}):\n{comment}\n\nImagem do recorte: {file}\nElementos na região (tag#id "texto" [x,y,w,h]):\n{elements}', {
              name: this.node.title, url: this.view.getURL(), comment: ta.value.trim() || t('(sem comentário)'), file, elements: elements.map((x) => '- ' + x).join('\n'),
            });
            api.termSubmit(sel.value, text);
            close();
            toast(t('Recorte enviado'));
          },
        }, t('Enviar'))),
      ];
    });
  }

  attach() { this.syncZoom(); }
  focus() { this.url.focus(); }
  dispose() {}
}
