// Utilitários de DOM: criação de elementos, menus, modais e toasts.

// Tradução (src/shared/i18n.js, carregado antes dos módulos).
export const t = (key, vars) => window.RegenteI18n.t(key, vars);

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && k !== 'list') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : String(c));
  return e;
}

export function toast(msg, error = false) {
  const t = el('div', { class: 'toast' + (error ? ' error' : '') }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), error ? 6000 : 2800);
}

let openMenu = null;
export function closeMenu() { openMenu?.remove(); openMenu = null; }

// Caixa flutuante posicionada em (x, y), fechada ao clicar fora. Base de menus e seletores.
export function popover(x, y, content, cls = 'menu') {
  closeMenu();
  const m = el('div', { class: cls }, content);
  document.body.append(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
  openMenu = m;
  setTimeout(() => document.addEventListener('pointerdown', function h(e) {
    // Outro popover já tomou o lugar deste (ex.: item de menu que abre um seletor): só sai.
    if (openMenu !== m) document.removeEventListener('pointerdown', h, true);
    else if (!m.contains(e.target)) { closeMenu(); document.removeEventListener('pointerdown', h, true); }
  }, true));
  return m;
}

// items: [{ label, hint, checked, action } | 'sep']
export function menu(x, y, items) {
  const nodes = items.map((it) => (it === 'sep' ? el('div', { class: 'sep' })
    : el('div', { class: 'item' + (it.checked ? ' checked' : ''), onclick: () => { closeMenu(); it.action(); } },
      el('span', {}, it.label), it.hint ? el('small', {}, it.hint) : it.checked ? ic('check', 'sm') : null)));
  return popover(x, y, nodes);
}

// Paleta de cores: amostras prontas + seletor livre (input color nativo).
export function colorPicker(x, y, colors, current, onPick) {
  const pick = (c) => { closeMenu(); onPick(c); };
  const custom = el('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(current || '') ? current : colors[0], onchange: (e) => pick(e.target.value) });
  return popover(x, y, [
    el('div', { class: 'color-grid' }, colors.map((c) => el('span', {
      class: 'swatch' + (c.toLowerCase() === (current || '').toLowerCase() ? ' on' : ''), style: { background: c }, title: c, onclick: () => pick(c),
    }))),
    el('label', { class: 'color-custom' }, custom, el('span', {}, t('Cor personalizada…'))),
  ], 'menu color-picker');
}

export function menuBelow(button, items) {
  const r = button.getBoundingClientRect();
  menu(r.left, r.bottom + 4, items);
}

// Modal genérico; build(close) devolve o conteúdo.
export function modal(build) {
  const back = el('div', { class: 'modal-back' });
  const box = el('div', { class: 'modal' });
  const close = () => back.remove();
  back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  box.append(...[].concat(build(close)));
  back.append(box);
  document.getElementById('modal-root').append(back);
  box.querySelector('input,textarea')?.focus();
  return close;
}

// Substitui window.prompt (não existe no Electron).
export function prompt(title, value = '', { hint } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); close(); } };
    const input = el('input', { type: 'text', value, onkeydown: (e) => { if (e.key === 'Enter') finish(input.value.trim() || null); } });
    const close = modal(() => [
      el('h3', {}, title),
      hint ? el('div', { class: 'hint' }, hint) : null,
      input,
      el('div', { class: 'actions' },
        el('button', { onclick: () => finish(null) }, t('Cancelar')),
        el('button', { class: 'primary', onclick: () => finish(input.value.trim() || null) }, t('OK'))),
    ].filter(Boolean));
    input.select();
    const obs = new MutationObserver(() => { if (!input.isConnected) { obs.disconnect(); finish(null); } });
    obs.observe(document.getElementById('modal-root'), { childList: true });
  });
}

export function confirmBox(title, text) {
  return new Promise((resolve) => {
    const close = modal((c) => [
      el('h3', {}, title),
      el('div', { class: 'hint' }, text),
      el('div', { class: 'actions' },
        el('button', { onclick: () => { c(); resolve(false); } }, t('Cancelar')),
        el('button', { class: 'primary', onclick: () => { c(); resolve(true); } }, t('Confirmar'))),
    ]);
    void close;
  });
}

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export const uid = (p) => p + Math.random().toString(16).slice(2, 12);

// Ícones lucide (ISC) aplicados como máscara CSS, herdando a cor do texto.
// URL absoluta: url() relativo dentro de variável CSS resolveria contra o styles.css.
const ICON_BASE = new URL('../../node_modules/lucide-static/icons/', location.href).href;
export function ic(name, cls = '') {
  const i = document.createElement('i');
  i.className = 'ic ' + cls;
  i.style.setProperty('--ic', `url(${ICON_BASE}${name}.svg)`);
  return i;
}

export function hydrateIcons(root = document) {
  for (const i of root.querySelectorAll('i[data-ic]')) i.style.setProperty('--ic', `url(${ICON_BASE}${i.dataset.ic}.svg)`);
}
