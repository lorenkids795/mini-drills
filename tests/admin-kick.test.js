// Admin › Users › Kick: the REAL app script from index.html run in Node with a small fake DOM.
// Click → handler → confirm box → one POST /api/admin/kick → list update / error message. Also the other Users buttons.
// Run: node tests/admin-kick.test.js   (Node built-ins only; no browser, no network)
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a0 = html.indexOf("<script>\n(function(){"), b0 = html.indexOf('</script>', a0);
let SRC = html.slice(a0 + 8, b0);
const END = SRC.lastIndexOf('})();');
SRC = SRC.slice(0, END) + ';window.__T={get AD(){return AD},setU:function(u){U=u},renderAdmin:renderAdmin,showTab:showTab};\n' + SRC.slice(END);

const STATIC_IDS = new Set((html.slice(0, a0).match(/id="([\w-]+)"/g) || []).map((m) => m.slice(4, -1)));
const USERS = () => [
  { email: 'lorenkids795@gmail.com', name: 'Admin', role: 'admin', status: 'active', hasPassword: true },
  { email: 'nghiatucayfai75@gmail.com', name: 'Teacher', role: 'teacher', src: 'admin', status: 'active', hasPassword: true },
  { email: 'tester@gmail.com', name: 'Tester', role: 'student', cls: 'Test', tester: true, status: 'active', hasPassword: true },
  { email: '3667@gmail.com', name: 'TESTER', role: 'student', cls: 'Test', status: 'active', hasPassword: true },
  { email: 'nghiatucayfai@gmail.com', name: 'QUANG KHANG', role: 'student', cls: '17h', status: 'active', hasPassword: true },
];
function boot() {
  const els = {}, handlers = {}, store = {};
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', hidden: false, value: '', style: { setProperty() {} }, dataset: {}, focused: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, appendChild() {}, remove() {},
    focus() { this.focused = true; }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], closest: () => null, options: [], scrollIntoView() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }), insertAdjacentHTML() {} });
  // an #id "exists" when it is in the static page or in HTML the app has rendered (like a real DOM)
  const exists = (id) => STATIC_IDS.has(id) || Object.keys(els).some((k) => String(els[k].innerHTML).indexOf('id="' + id + '"') >= 0);
  const doc = { readyState: 'complete', documentElement: el('html'), body: el('body'), head: el('head'), getElementById: el,
    querySelector: (s) => (/^#[\w-]+$/.test(s) ? (exists(s.slice(1)) ? el(s.slice(1)) : null) : /^#adModal \[data-act="(ad-close|ad-ok)"\]$/.test(s) ? el('btn:' + RegExp.$1) : null), querySelectorAll: () => [],
    createElement: () => el('tmp' + Math.random()), addEventListener: (ty, f, c) => { (handlers[ty] = handlers[ty] || []).push({ f, c: !!c }); }, removeEventListener() {}, hidden: false, visibilityState: 'visible' };
  const W = { document: doc, console: { log() {}, error() {}, warn() {} }, setTimeout: (f, ms) => (ms === 250 ? setTimeout(f, 0) : 0), clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, key: () => null, length: 0 },
    sessionStorage: { getItem: () => 'admin-key-123', setItem() {}, removeItem() {} }, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), addEventListener() {},
    location: { reload() {}, hash: '', search: '' }, navigator: { userAgent: 'node' }, confirm: () => true, alert() {}, scrollTo() {}, scrollY: 0, innerWidth: 1280, innerHeight: 800, getComputedStyle: () => ({}),
    MD_CONFIG: { demo: false, teachers: [], api: '/api' }, MD_USER: { name: 'Admin', email: 'lorenkids795@gmail.com', role: 'teacher', adm: true }, claude: { use: () => new Promise(() => {}) } };
  W.window = W;
  W.calls = []; W.reply = () => ({ status: 200, body: { ok: true } });
  W.fetch = (url, opt) => { W.calls.push({ url, opt }); const r = W.reply(url); if (r === 'offline') return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve({ ok: r.status < 400, status: r.status, json: () => (r.body === 'html' ? Promise.reject(new Error('not json')) : Promise.resolve(JSON.parse(JSON.stringify(r.body)))) }); };
  const ctx = vm.createContext(W);
  ['md-chart.js', 'lm-content.js', 'lm-engine.js', 'lm-unit2.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx));
  vm.runInContext(SRC, ctx, { filename: 'index.html#app' });
  const T = W.__T;
  T.setU({ name: 'Admin', email: 'lorenkids795@gmail.com', role: 'teacher', adm: true, cls: '' });
  const AD = T.AD; AD.sub = 'users'; AD.locked = false; AD.ver = '2026-10-23d'; AD.users = USERS();
  T.showTab('admin');
  const press = (dataset, tag) => {
    const btn = { tagName: tag || 'BUTTON', id: '', dataset, disabled: false, textContent: '', checked: false, attrs: {},
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] || null; }, closest(s) { return s === '[data-act]' ? this : null; } };
    if (btn.disabled) return btn;
    const ev = { target: btn, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() { ev._stop = true; } };
    (handlers.click || []).slice().sort((x, y) => (y.c ? 1 : 0) - (x.c ? 1 : 0)).forEach((h) => { if (!ev._stop) h.f(ev); });
    return btn;
  };
  const key = (k) => { const ev = { key: k, target: el('body'), preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() { ev._stop = true; } }; (handlers.keydown || []).forEach((h) => { if (!ev._stop) h.f(ev); }); };
  const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r)); };
  return { W, T, AD, el, press, key, flush, view: () => el('v-admin').innerHTML, toast: () => el('toast').textContent };
}
const kicks = (B) => B.W.calls.filter((c) => /\/api\/admin\/kick$/.test(c.url));

(async () => {
  await t('Users list renders a Kick button for each non-admin account (data-email escaped)', () => {
    const B = boot(); const v = B.view();
    assert.strictEqual((v.match(/data-act="ad-kick"/g) || []).length, 4); assert.ok(v.includes('data-act="ad-kick" data-email="3667@gmail.com"'));
    assert.ok(!/data-act="ad-kick" data-email="lorenkids795/.test(v), 'admin must have no Kick');
  });
  await t('Kick opens the confirm box with the right name and email', () => {
    const B = boot(); B.press({ act: 'ad-kick', email: '3667@gmail.com' });
    assert.ok(B.AD.modal && /Kick this student/.test(B.AD.modal.title)); const v = B.view();
    assert.ok(v.includes('id="adModal"') && v.includes('TESTER (3667@gmail.com)') && v.includes('data-act="ad-ok"'));
  });
  await t('the confirm box takes the keyboard focus (Cancel, because Kick is dangerous)', () => { const B = boot(); B.press({ act: 'ad-kick', email: '3667@gmail.com' }); assert.ok(B.el('btn:ad-close').focused); });
  await t('Cancel closes it and sends nothing', async () => { const B = boot(); B.W.calls.length = 0; B.press({ act: 'ad-kick', email: '3667@gmail.com' }); B.press({ act: 'ad-close' }); await B.flush();
    assert.strictEqual(B.AD.modal, null); assert.strictEqual(B.W.calls.length, 0); assert.ok(!B.view().includes('id="adModal"')); });
  await t('Escape closes it and sends nothing', async () => { const B = boot(); B.W.calls.length = 0; B.press({ act: 'ad-kick', email: '3667@gmail.com' }); B.key('Escape'); await B.flush(); assert.strictEqual(B.AD.modal, null); assert.strictEqual(kicks(B).length, 0); });
  await t('confirm sends exactly one POST /api/admin/kick with X-Admin-Key, even when pressed twice', async () => {
    const B = boot(); B.W.reply = (u) => (/users$/.test(u) ? { status: 200, body: { users: USERS().filter((x) => x.email !== '3667@gmail.com'), ver: '2026-10-23d' } } : { status: 200, body: { ok: true, role: 'student' } });
    B.press({ act: 'ad-kick', email: '3667@gmail.com' }); B.press({ act: 'ad-ok' }); B.press({ act: 'ad-ok' }); await B.flush();
    const k = kicks(B); assert.strictEqual(k.length, 1); assert.strictEqual(k[0].opt.method, 'POST'); assert.strictEqual(k[0].opt.headers['X-Admin-Key'], 'admin-key-123');
    assert.deepStrictEqual(JSON.parse(k[0].opt.body), { email: '3667@gmail.com' });
  });
  await t('success: box closes, row leaves the list, list is re-read from the server, others untouched', async () => {
    const B = boot(); B.W.reply = (u) => (/users$/.test(u) ? { status: 200, body: { users: USERS().filter((x) => x.email !== '3667@gmail.com'), ver: '2026-10-23d' } } : { status: 200, body: { ok: true, role: 'student' } });
    B.press({ act: 'ad-kick', email: '3667@gmail.com' }); B.press({ act: 'ad-ok' }); await B.flush();
    assert.strictEqual(B.AD.modal, null); assert.ok(!B.AD.users.some((x) => x.email === '3667@gmail.com'));
    assert.ok(B.W.calls.some((c) => /admin\/users$/.test(c.url)), 'list re-read'); assert.ok(/was kicked/.test(B.toast()));
    ['nghiatucayfai75@gmail.com', 'tester@gmail.com', 'lorenkids795@gmail.com', 'nghiatucayfai@gmail.com'].forEach((e) => assert.ok(B.AD.users.some((x) => x.email === e), e + ' kept'));
  });
  const failCase = (label, reply, re) => t(label, async () => {
    const B = boot(); B.W.reply = () => reply;
    B.press({ act: 'ad-kick', email: 'nghiatucayfai@gmail.com' }); B.press({ act: 'ad-ok' }); await B.flush();
    assert.ok(B.AD.users.some((x) => x.email === 'nghiatucayfai@gmail.com'), 'row must stay'); assert.ok(!/was kicked/.test(B.toast()), 'no success message');
    if (re.lock) { assert.strictEqual(B.AD.locked, true); return; }
    assert.ok(B.AD.modal, 'box stays open'); assert.ok(re.test(B.el('adMMsg').textContent), 'message: ' + B.el('adMMsg').textContent);
    B.W.reply = () => ({ status: 200, body: { ok: true } }); B.press({ act: 'ad-ok' }); await B.flush(); assert.strictEqual(B.AD.modal, null, 'retry works');
  });
  await failCase('500 from the server: error shown in the box, row kept, Try again works', { status: 500, body: { error: 'Firestore write failed.' } }, /Firestore write failed/);
  await failCase('403: error shown, row kept', { status: 403, body: { error: 'The admin account cannot be kicked.' } }, /cannot be kicked/);
  await failCase('404 from an old server (no route): says to deploy functions/', { status: 404, body: { error: 'Not found.' } }, /Deploy the latest version/);
  await failCase('HTML instead of JSON (old deploy): says to deploy', { status: 200, body: 'html' }, /Deploy the latest version/);
  await failCase('no connection: says so', 'offline', /No connection/);
  await failCase('401 admin key expired: asks for the admin password again', { status: 401, body: { error: 'Enter your admin password to continue.', needUnlock: true } }, { lock: true });
  await t('an error inside a button handler is shown, never silent', async () => {
    const B = boot(); B.AD.users = [{ get email() { throw new Error('broken row'); } }];
    B.press({ act: 'ad-kick', email: 'x@y.z' }); assert.ok(/Something went wrong \(ad-kick: broken row\)/.test(B.toast()), B.toast());
  });
  // regression: the other Users / Admin buttons still open their boxes or send their request
  await t('Change password opens its box', () => { const B = boot(); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); assert.ok(B.AD.modal && /Change password/.test(B.AD.modal.title)); });
  await t('Edit class opens its box', () => { const B = boot(); B.press({ act: 'ad-cls', email: 'nghiatucayfai@gmail.com' }); assert.ok(B.AD.modal && /Edit class/.test(B.AD.modal.title)); });
  await t('Resume sends admin/active', async () => { const B = boot(); B.AD.users[4].status = 'paused'; B.W.calls.length = 0; B.press({ act: 'ad-on', email: 'nghiatucayfai@gmail.com' }); await B.flush(); assert.ok(B.W.calls.some((c) => /admin\/active$/.test(c.url))); });
  await t('Teachers and My account tabs render', () => { const B = boot(); B.press({ act: 'ad-sub', v: 'teachers' }); assert.ok(B.view().length > 100); B.press({ act: 'ad-sub', v: 'me' }); assert.ok(B.view().length > 100); });
  await t('Users shows the app version next to the server version', () => { const B = boot(); assert.ok(/ · app \d{4}-\d\d-\d\d\w? · server 2026-10-23d/.test(B.view())); });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
