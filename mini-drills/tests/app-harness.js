// Shared test harness: runs the REAL app script of index.html in Node with a small fake DOM.
// boot({user, hooks, demo}) → {W, T, el, press, change, input, flush}. T = the internal functions named in `hooks`.
// Node built-ins only. Used by tests/reading.test.js (admin-kick.test.js keeps its own copy).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a0 = html.indexOf("<script>\n(function(){"), b0 = html.indexOf('</script>', a0);
const BASE = html.slice(a0 + 8, b0), END = BASE.lastIndexOf('})();');
const STATIC_IDS = new Set((html.slice(0, a0).match(/id="([\w-]+)"/g) || []).map((m) => m.slice(4, -1)));

function boot(opt) {
  opt = opt || {};
  const hooks = opt.hooks || '';
  const SRC = BASE.slice(0, END) + ';window.__T={setU:function(u){U=u},showTab:showTab' + (hooks ? ',' + hooks : '') + '};\n' + BASE.slice(END);
  const els = {}, handlers = {}, store = {};
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', hidden: false, value: '', style: { setProperty() {} }, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, appendChild() {}, remove() {},
    focus() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], closest: () => null, options: [], scrollIntoView() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }), insertAdjacentHTML() {} });
  const exists = (id) => STATIC_IDS.has(id) || Object.keys(els).some((k) => String(els[k].innerHTML).indexOf('id="' + id + '"') >= 0);
  const body = el('body'); body.appendChild = (n) => { n.parentNode = body; if (n.id) els[n.id] = n; return n; };
  const doc = { readyState: 'complete', documentElement: el('html'), body, head: el('head'), getElementById: (id) => (exists(id) ? el(id) : null),
    querySelector: (s) => (/^#[\w-]+$/.test(s) ? (exists(s.slice(1)) ? el(s.slice(1)) : null) : null), querySelectorAll: () => [],
    createElement: () => el('tmp' + Math.random()), addEventListener: (ty, f, c) => { (handlers[ty] = handlers[ty] || []).push({ f, c: !!c }); }, removeEventListener() {}, hidden: false, visibilityState: 'visible', elementFromPoint: () => null };
  const user = opt.user || { name: 'Admin', email: 'admin@x.com', role: 'teacher', adm: true };
  const W = { document: doc, console: { log() {}, error() {}, warn() {} }, setTimeout: (f, ms) => (ms === 250 || ms === 600 ? setTimeout(f, 0) : 0), clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, key: () => null, length: 0 },
    sessionStorage: { getItem: () => 'key', setItem() {}, removeItem() {} }, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), addEventListener() {},
    location: { reload() {}, hash: '', search: '' }, navigator: { userAgent: 'node' }, confirm: () => true, alert() {}, prompt: () => null, scrollTo() {}, scrollY: 0, innerWidth: 1280, innerHeight: 800, getComputedStyle: () => ({}),
    MD_CONFIG: { demo: !!opt.demo, teachers: [], api: '/api' }, MD_USER: { name: user.name, email: user.email, role: user.role, adm: !!user.adm }, claude: { use: () => new Promise(() => {}) } };
  W.window = W; W.calls = []; W.reply = () => ({ status: 200, body: { ok: true } });
  W.fetch = (url, o) => { W.calls.push({ url, opt: o }); const r = W.reply(url, o); return Promise.resolve({ ok: r.status < 400, status: r.status, json: () => Promise.resolve(JSON.parse(JSON.stringify(r.body))) }); };
  const ctx = vm.createContext(W);
  ['md-chart.js', 'lm-content.js', 'lm-engine.js', 'lm-unit2.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx));
  vm.runInContext(SRC, ctx, { filename: 'index.html#app' });
  const T = W.__T; T.setU(Object.assign({ cls: '' }, user));
  const press = (dataset) => { const btn = { tagName: 'BUTTON', id: '', dataset, disabled: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] || null; }, closest(s) { return s === '[data-act]' ? this : null; } };
    const ev = { target: btn, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() { ev._stop = true; } }; (handlers.click || []).forEach((h) => { if (!ev._stop) h.f(ev); }); return btn; };
  const fire = (ty) => (target) => { const ev = { target, preventDefault() {} }; (handlers[ty] || []).forEach((h) => h.f(ev)); };
  const flush = async () => { for (let k = 0; k < 3; k++) { await new Promise((r) => setTimeout(r, 5)); for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r)); } };
  return { W, T, el, press, change: fire('change'), input: fire('input'), flush, toast: () => el('toast').textContent };
}
module.exports = { boot, html, ROOT };
