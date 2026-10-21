// Traduções. A chave é o próprio texto em português: o que não tiver tradução aparece como está,
// e dados padrão (papéis, modelos) são traduzidos na exibição enquanto o usuário não os editar.
// Funciona como <script> no renderer (window.RegenteI18n) e como módulo CommonJS no processo principal.
(function (root, factory) {
  const m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.RegenteI18n = m;
})(typeof self !== 'undefined' ? self : this, () => {
  const LANGS = [['pt', 'Português'], ['en', 'English'], ['es', 'Español']];
  const COL = { en: 0, es: 1 };
  let DICT = {};
  let lang = 'pt';

  // 'auto' segue o idioma do sistema; qualquer coisa fora de pt/en/es cai no inglês.
  function resolve(setting, locale) {
    const want = setting && setting !== 'auto' ? setting : String(locale || 'pt').slice(0, 2).toLowerCase();
    return LANGS.some(([c]) => c === want) ? want : 'en';
  }

  function t(key, vars) {
    let s = key;
    if (lang !== 'pt') s = DICT[key]?.[COL[lang]] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    return s;
  }

  return {
    LANGS, resolve, t,
    setLang: (l) => { lang = l; },
    get lang() { return lang; },
    has: (key) => key in DICT,
    define: (d) => { DICT = { ...DICT, ...d }; },
  };
});
