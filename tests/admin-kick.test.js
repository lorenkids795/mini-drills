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
SRC = SRC.slice(0, END) + ';window.__T={get AD(){return AD},setU:function(u){U=u},renderAdmin:renderAdmin,showTab:showTab,get AG(){return AG},setRoster:function(r){rosterDocs=r},renderAsg:renderAsg,renderPrize:renderPrize,prizeList:prizeList,imgMap:imgMap,setRFV:function(v){RFV=v},clsStatus:clsStatus,classListAll:classListAll,setLocalImg:function(k,v){localImg[k]=v}};\n' + SRC.slice(END);

const STATIC_IDS = new Set((html.slice(0, a0).match(/id="([\w-]+)"/g) || []).map((m) => m.slice(4, -1)));
const USERS = () => [
  { email: 'lorenkids795@gmail.com', name: 'Admin', role: 'admin', status: 'active', hasPassword: true },
  { email: 'nghiatucayfai75@gmail.com', name: 'Teacher', role: 'teacher', src: 'admin', status: 'active', hasPassword: true },
  { email: 'tester@gmail.com', name: 'Tester', role: 'student', cls: 'Test', tester: true, status: 'active', hasPassword: true },
  { email: '3667@gmail.com', name: 'TESTER', role: 'student', cls: 'Test', status: 'active', hasPassword: true },
  { email: 'nghiatucayfai@gmail.com', name: 'QUANG KHANG', role: 'student', cls: '17h', status: 'active', hasPassword: true },
];
function boot(opt) {
  opt = opt || {};
  const els = {}, handlers = {}, store = {};
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', hidden: false, value: '', style: { setProperty() {} }, dataset: {}, focused: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, appendChild() {}, remove() {},
    focus() { this.focused = true; }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], closest: () => null, options: [], scrollIntoView() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }), insertAdjacentHTML() {} });
  // an #id "exists" when it is in the static page or in HTML the app has rendered (like a real DOM)
  const exists = (id) => STATIC_IDS.has(id) || Object.keys(els).some((k) => String(els[k].innerHTML).indexOf('id="' + id + '"') >= 0);
  const body = el('body'); body.appendChild = (n) => { n.parentNode = body; if (n.id) els[n.id] = n; return n; };
  const doc = { readyState: 'complete', documentElement: el('html'), body, head: el('head'), getElementById: el,
    querySelector: (s) => (/^\[data-(pw|pzc|pzt)="([^"]+)"\]$/.test(s) ? el('attr:' + RegExp.$1 + ':' + RegExp.$2) : /^#[\w-]+$/.test(s) ? (exists(s.slice(1)) ? el(s.slice(1)) : null) : /^#adModal \[data-act="(ad-close|ad-ok)"\]$/.test(s) ? el('btn:' + RegExp.$1) : null), querySelectorAll: () => [],
    createElement: () => el('tmp' + Math.random()), addEventListener: (ty, f, c) => { (handlers[ty] = handlers[ty] || []).push({ f, c: !!c }); }, removeEventListener() {}, hidden: false, visibilityState: 'visible' };
  const W = { document: doc, console: { log() {}, error() {}, warn() {} }, setTimeout: (f, ms) => (ms === 250 || (ms === 150 && opt.check) ? setTimeout(f, 0) : 0), clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, key: () => null, length: 0 },
    sessionStorage: { getItem: () => 'admin-key-123', setItem() {}, removeItem() {} }, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), addEventListener() {},
    location: { reload() {}, hash: '', search: '' }, navigator: { userAgent: 'node' }, confirm: () => true, alert() {}, scrollTo() {}, scrollY: 0, innerWidth: 1280, innerHeight: 800, getComputedStyle: () => ({}),
    MD_CONFIG: { demo: false, teachers: [], api: '/api' }, MD_USER: { name: 'Admin', email: 'lorenkids795@gmail.com', role: 'teacher', adm: true }, claude: { use: () => new Promise(() => {}) } };
  W.window = W;
  W.confirm = () => (W.asked = (W.asked || 0) + 1, opt.answer !== false); W.alert = (m) => { W.alerted = m; }; W.prompt = (msg, def) => { W.prompted = (W.prompted || 0) + 1; return 'answer' in opt ? (typeof opt.answer === 'string' ? opt.answer : opt.answer === false ? null : def) : def; };
  // opt.visible: the box has a size and is on top where it is drawn (like a normal screen)
  doc.elementFromPoint = () => (opt.visible ? { inModal: true } : null);
  const md = el('adModal'); md.querySelector = (s) => (s === '.mbox' ? { getBoundingClientRect: () => (opt.visible ? { left: 100, top: 100, width: 400, height: 200 } : { left: 0, top: 0, width: 0, height: 0 }) } : null);
  md.contains = (n) => !!(n && n.inModal);
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
  const flush = async () => { for (let k = 0; k < 3; k++) { await new Promise((r) => setTimeout(r, 5)); for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r)); } };
  const change = (target) => { const ev = { target, preventDefault() {} }; (handlers.change || []).forEach((h) => h.f(ev)); };
  const input = (target) => { const ev = { target, preventDefault() {} }; (handlers.input || []).forEach((h) => h.f(ev)); };
  return { W, T, AD, el, press, key, flush, change, input, view: () => el('v-admin').innerHTML, modal: () => el('adModalRoot').innerHTML, toast: () => el('toast').textContent };
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
    assert.ok(B.AD.modal && /Kick this student/.test(B.AD.modal.title)); const v = B.modal();
    assert.ok(v.includes('id="adModal"') && v.includes('TESTER (3667@gmail.com)') && v.includes('data-act="ad-ok"'));
  });
  await t('the confirm box takes the keyboard focus (Cancel, because Kick is dangerous)', () => { const B = boot(); B.press({ act: 'ad-kick', email: '3667@gmail.com' }); assert.ok(B.el('btn:ad-close').focused); });
  await t('Cancel closes it and sends nothing', async () => { const B = boot(); B.W.calls.length = 0; B.press({ act: 'ad-kick', email: '3667@gmail.com' }); B.press({ act: 'ad-close' }); await B.flush();
    assert.strictEqual(B.AD.modal, null); assert.strictEqual(B.W.calls.length, 0); assert.ok(!B.modal().includes('id="adModal"')); });
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
  await t('the confirm box is drawn under <body> (#adModalRoot), not inside the Admin page', () => { const B = boot(); B.press({ act: 'ad-kick', email: '3667@gmail.com' }); assert.ok(B.modal().includes('id="adModal"')); assert.ok(!B.view().includes('id="adModal"')); });
  await t('box visible on screen: no browser dialog, normal flow', async () => { const B = boot({ check: true, visible: true }); B.press({ act: 'ad-kick', email: '3667@gmail.com' }); await B.flush(); assert.ok(!B.W.asked); assert.ok(B.AD.modal); });
  await t('box NOT visible (hidden by something on this device): browser dialog asks, then the account is kicked', async () => {
    const B = boot({ check: true, visible: false }); B.W.reply = (u) => (/users$/.test(u) ? { status: 200, body: { users: USERS().filter((x) => x.email !== '3667@gmail.com'), ver: '2026-10-23d' } } : { status: 200, body: { ok: true, role: 'student' } });
    B.press({ act: 'ad-kick', email: '3667@gmail.com' }); await B.flush();
    assert.strictEqual(B.W.asked, 1); const k = kicks(B); assert.strictEqual(k.length, 1); assert.deepStrictEqual(JSON.parse(k[0].opt.body), { email: '3667@gmail.com' });
    assert.ok(!B.AD.users.some((x) => x.email === '3667@gmail.com')); assert.ok(/was kicked/.test(B.toast()));
  });
  await t('browser dialog answered Cancel: nothing is sent', async () => { const B = boot({ check: true, visible: false, answer: false }); B.press({ act: 'ad-kick', email: '3667@gmail.com' }); await B.flush(); assert.strictEqual(B.W.asked, 1); assert.strictEqual(kicks(B).length, 0); });
  await t('browser dialog + server error: the error is shown (alert + message), row kept', async () => {
    const B = boot({ check: true, visible: false }); B.W.reply = () => ({ status: 500, body: { error: 'Firestore write failed.' } });
    B.press({ act: 'ad-kick', email: 'nghiatucayfai@gmail.com' }); await B.flush(); assert.ok(/Firestore write failed/.test(B.W.alerted)); assert.ok(B.AD.users.some((x) => x.email === 'nghiatucayfai@gmail.com'));
  });
  await t('leaving Admin closes its confirm box', () => { const B = boot(); B.press({ act: 'ad-kick', email: '3667@gmail.com' }); B.T.showTab('dash'); assert.strictEqual(B.AD.modal, null); assert.ok(!B.modal().includes('adModal')); });
  // ---- Change password (same robustness as Kick) ----
  const pws = (B) => B.W.calls.filter((c) => /\/api\/admin\/password$/.test(c.url));
  await t('Change password: box opens with name/email and a password field', () => { const B = boot(); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); const v = B.modal(); assert.ok(v.includes('QUANG KHANG (nghiatucayfai@gmail.com)') && v.includes('id="adNewPw"')); });
  await t('Change password: Save sends one POST /api/admin/password with the typed password', async () => {
    const B = boot(); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); B.el('adNewPw').value = '  hello123 '; B.press({ act: 'ad-ok' }); B.press({ act: 'ad-ok' }); await B.flush();
    const k = pws(B); assert.strictEqual(k.length, 1); assert.deepStrictEqual(JSON.parse(k[0].opt.body), { email: 'nghiatucayfai@gmail.com', newPassword: 'hello123' }); assert.strictEqual(k[0].opt.headers['X-Admin-Key'], 'admin-key-123');
    assert.strictEqual(B.AD.modal, null); assert.ok(/Password changed for QUANG KHANG/.test(B.toast()));
  });
  await t('Change password: under 6 characters = message, nothing sent', async () => { const B = boot(); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); B.el('adNewPw').value = 'abc'; B.press({ act: 'ad-ok' }); await B.flush(); assert.strictEqual(pws(B).length, 0); assert.ok(/at least 6/.test(B.el('adMMsg').textContent)); assert.ok(B.AD.modal); });
  await t('Change password: Generate fills the field', () => { const B = boot(); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); B.press({ act: 'ad-gen', for: 'adNewPw' }); assert.ok(B.el('adNewPw').value.length >= 6); });
  await t('Change password: server error stays in the box', async () => { const B = boot(); B.W.reply = () => ({ status: 500, body: { error: 'KV write failed.' } }); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); B.el('adNewPw').value = 'hello123'; B.press({ act: 'ad-ok' }); await B.flush(); assert.ok(B.AD.modal && /KV write failed/.test(B.el('adMMsg').textContent)); });
  await t('Change password: box visible = no browser prompt', async () => { const B = boot({ check: true, visible: true }); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); await B.flush(); assert.ok(!B.W.prompted); assert.ok(B.AD.modal); });
  await t('Change password: box NOT visible = browser prompt (prefilled), password changed, new password shown', async () => {
    const B = boot({ check: true, visible: false }); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); await B.flush();
    assert.strictEqual(B.W.prompted, 1); const k = pws(B); assert.strictEqual(k.length, 1); const sent = JSON.parse(k[0].opt.body);
    assert.strictEqual(sent.email, 'nghiatucayfai@gmail.com'); assert.ok(sent.newPassword.length >= 6); assert.ok(B.W.alerted.includes(sent.newPassword), 'new password shown to the admin');
  });
  await t('Change password: prompt with a typed password', async () => { const B = boot({ check: true, visible: false, answer: ' mypass99 ' }); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); await B.flush(); assert.strictEqual(JSON.parse(pws(B)[0].opt.body).newPassword, 'mypass99'); });
  await t('Change password: prompt Cancel = nothing sent', async () => { const B = boot({ check: true, visible: false, answer: false }); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); await B.flush(); assert.strictEqual(B.W.prompted, 1); assert.strictEqual(pws(B).length, 0); });
  await t('Change password: prompt with a short password = refused, nothing sent', async () => { const B = boot({ check: true, visible: false, answer: 'abc' }); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); await B.flush(); assert.strictEqual(pws(B).length, 0); assert.ok(/at least 6/.test(B.W.alerted)); });
  await t('Change password: prompt + server error = error shown', async () => { const B = boot({ check: true, visible: false }); B.W.reply = () => ({ status: 500, body: { error: 'KV write failed.' } }); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); await B.flush(); assert.ok(/KV write failed/.test(B.W.alerted)); });
  // ---- Kick deletes data (text) · class status · delete class · remove frame · custom prizes + live chance ----
  await t('Kick box says ALL learning data are deleted for good; toast confirms', async () => {
    const B = boot(); B.W.reply = (u) => (/users$/.test(u) ? { status: 200, body: { users: USERS(), ver: 'x' } } : { status: 200, body: { ok: true, role: 'student', purged: { attempts: 3 } } });
    B.press({ act: 'ad-kick', email: '3667@gmail.com' }); assert.ok(/ALL their learning data are deleted for good/.test(B.AD.modal.text) && /cannot be undone/.test(B.AD.modal.text));
    B.press({ act: 'ad-ok' }); await B.flush(); assert.ok(/was kicked and their data deleted/.test(B.toast()), B.toast());
  });
  const ROSTER = [{ email: 'a@x.com', name: 'An', cls: '17h', role: 'student' }, { email: 'b@x.com', name: 'Binh', cls: '17h', role: 'student' }, { email: 'tst@x.com', name: 'Tst', cls: '17h', role: 'student', tester: true }, { email: 'c@x.com', name: 'Chi', cls: '7h30', role: 'student' }];
  const cls = (o) => { const B = boot(o); B.T.setRoster(ROSTER.map((r) => Object.assign({}, r))); B.AD.sheet = { classes: [{ cls: '17h' }, { cls: '7h30' }, { cls: '9h' }] }; B.T.showTab('asg'); return B; };
  await t('class status: classes with students are Active; Sheet-only classes are Pending', () => {
    const B = cls(); assert.deepStrictEqual(B.T.classListAll().slice().sort().join(), '17h,7h30,9h'); assert.strictEqual(B.T.clsStatus('17h'), 'active'); assert.strictEqual(B.T.clsStatus('9h'), 'pending');
    const v = B.el('v-asg').innerHTML; assert.ok(/<h4 class="cgh">Pending/.test(v) && /data-cls="9h"/.test(v) && /<span class="pill cst pending">Pending<\/span>/.test(v));
  });
  await t('pending turns Active by itself when the first student joins', () => {
    const B = cls(); assert.strictEqual(B.T.clsStatus('9h'), 'pending'); B.T.setRoster(ROSTER.concat([{ email: 'n@x.com', name: 'New', cls: '9h', role: 'student' }])); assert.strictEqual(B.T.clsStatus('9h'), 'active');
  });
  await t('admin sets Archived in Class settings: the class folds into "Archived"', () => {
    const B = cls(); B.press({ act: 'cls-set', cls: '7h30' }); assert.ok(B.el('v-asg').innerHTML.includes('id="csStatus"'));
    B.el('csStatus').value = 'archived'; B.press({ act: 'cs-status' }); assert.strictEqual(B.T.clsStatus('7h30'), 'archived');
    B.press({ act: 'cls-back' }); const v = B.el('v-asg').innerHTML; assert.ok(/<details class="cgarc"><summary>Archived \(1\)<\/summary>[\s\S]*data-cls="7h30"/.test(v));
  });
  await t('a teacher (not admin) has no Status and no Delete class', () => {
    const B = cls(); B.T.setU({ name: 'T', email: 't@x.com', role: 'teacher', adm: false, cls: '' }); B.press({ act: 'cls-set', cls: '17h' }); const v = B.el('v-asg').innerHTML;
    assert.ok(!v.includes('id="csStatus"') && !v.includes('data-act="cs-del"'));
  });
  await t('Delete class: type DELETE → kicks each non-tester student one by one, then admin/classdel', async () => {
    const B = cls({ answer: 'DELETE' }); B.W.reply = (u) => (/classdel$/.test(u) ? { status: 200, body: { ok: true, assignments: 2, remaining: 1 } } : { status: 200, body: { ok: true, role: 'student' } });
    B.press({ act: 'cls-set', cls: '17h' }); B.W.calls.length = 0; B.press({ act: 'cs-del' }); await B.flush(); await B.flush();
    const seq = B.W.calls.map((c) => c.url.replace('/api/', '') + (c.opt && c.opt.body ? ' ' + JSON.parse(c.opt.body).email || '' : ''));
    assert.deepStrictEqual(B.W.calls.map((c) => c.url), ['/api/admin/kick', '/api/admin/kick', '/api/admin/classdel'], seq.join(' | '));
    assert.deepStrictEqual(B.W.calls.slice(0, 2).map((c) => JSON.parse(c.opt.body).email), ['a@x.com', 'b@x.com']); assert.strictEqual(JSON.parse(B.W.calls[2].opt.body).cls, '17h');
    assert.ok(/deleted: 2 student\(s\) kicked, 2 assignment/.test(B.toast()), B.toast()); assert.strictEqual(B.T.AG.cur, null);
  });
  await t('Delete class: anything but DELETE (or Cancel) sends nothing', async () => {
    for (const ans of ['delete', false]) { const B = cls({ answer: ans }); B.press({ act: 'cls-set', cls: '17h' }); B.W.calls.length = 0; B.press({ act: 'cs-del' }); await B.flush(); assert.strictEqual(B.W.calls.length, 0, String(ans)); }
  });
  await t('Delete class: a failed kick stops and says how far it got', async () => {
    const B = cls({ answer: 'DELETE' }); let n = 0; B.W.reply = () => (++n === 2 ? { status: 500, body: { error: 'KV busy.' } } : { status: 200, body: { ok: true } });
    B.press({ act: 'cls-set', cls: '17h' }); B.W.calls.length = 0; B.press({ act: 'cs-del' }); await B.flush(); await B.flush();
    assert.ok(!B.W.calls.some((c) => /classdel$/.test(c.url))); assert.ok(/Stopped: KV busy\. 1 of 2/.test(B.el('csDelMsg').textContent), B.el('csDelMsg').textContent);
  });
  await t('Live Avatar Preview: "Remove frame" next to Reset only when a frame exists; removing clears it', () => {
    const B = boot(); B.T.setRFV(0); B.T.showTab('prize'); assert.ok(!B.el('v-prize').innerHTML.includes('data-act="rf-del"'));
    B.T.setLocalImg('frame0', 'data:image/png;base64,AAAA'); B.T.renderPrize(); const v = B.el('v-prize').innerHTML;
    assert.ok(/data-act="rf-reset">Reset<\/button><button class="btn sm bad" type="button" data-act="rf-del">Remove frame<\/button>/.test(v));
    B.press({ act: 'rf-del' }); assert.strictEqual(B.T.imgMap().frame0, ''); assert.ok(!B.el('v-prize').innerHTML.includes('data-act="rf-del"')); assert.ok(B.W.asked >= 1);
  });
  await t('Prizes: Type has "Custom / Other…"; choosing it shows the custom name field', () => {
    const B = boot(); B.T.showTab('prize'); const v = B.el('v-prize').innerHTML; assert.ok(v.includes('<option value="custom">Custom / Other…</option>') && /id="prCustomL" hidden/.test(v));
    B.change({ id: 'prType', value: 'custom' }); assert.strictEqual(B.el('prCustomL').hidden, false); B.change({ id: 'prType', value: 'pen' }); assert.strictEqual(B.el('prCustomL').hidden, true);
  });
  await t('Prizes: add a custom prize (tier, name on the wheel, link, weight) → list + chance', () => {
    const B = boot(); B.T.showTab('prize'); const n0 = B.T.prizeList().length;
    Object.assign(B.el('prType'), { value: 'custom' }); B.el('prTier').value = '4'; B.el('prName').value = 'T-shirt'; B.el('prCustom').value = 'Mini Drills T-shirt'; B.el('prLink').value = ''; B.el('prW').value = '100';
    B.press({ act: 'pr-add' }); const L = B.T.prizeList(), x = L[L.length - 1];
    assert.strictEqual(L.length, n0 + 1); assert.deepStrictEqual([x.kind, x.tier, x.label, x.text, x.weight], ['custom', 4, 'T-shirt', 'Mini Drills T-shirt', 100]);
    const v = B.el('v-prize').innerHTML; assert.ok(v.includes('Custom: Mini Drills T-shirt')); assert.ok(/total weight 200/.test(v)); // 60 + 30 + 10 + 100
    assert.ok(new RegExp('data-pzc="' + x.id + '">2.5%<').test(v), 'chance = 5% × 100/200');
  });
  await t('Prizes: custom without its name is refused; wheel name falls back to the custom name', () => {
    const B = boot(); B.T.showTab('prize'); const n0 = B.T.prizeList().length;
    B.el('prType').value = 'custom'; B.el('prTier').value = '3'; B.el('prName').value = ''; B.el('prCustom').value = ''; B.press({ act: 'pr-add' }); assert.strictEqual(B.T.prizeList().length, n0); assert.ok(/name of the custom prize/.test(B.toast()));
    B.el('prCustom').value = 'Free Mock Test Reading'; B.press({ act: 'pr-add' }); const x = B.T.prizeList().slice(-1)[0]; assert.strictEqual(x.label, 'Free Mock Test Reading');
  });
  await t('Prizes: Chance and tier total update while a weight is typed (no reload)', () => {
    const B = boot(); B.T.showTab('prize'); B.el('attr:pw:p1').value = '100'; ['p2', 'p3', 'p4'].forEach((id) => { B.el('attr:pw:' + id).value = String({ p2: 22, p3: 22, p4: 18 }[id]); });
    B.input({ dataset: { pw: 'p1' } }); assert.strictEqual(B.el('attr:pzc:p1').textContent, '30.86%'); assert.strictEqual(B.el('attr:pzc:p4').textContent, '5.56%'); assert.strictEqual(B.el('attr:pzt:1').textContent, 'tier 50% · total weight 162');
  });
  await t('Prizes: removing a prize recalculates the tier', () => {
    const B = boot(); B.T.showTab('prize'); B.press({ act: 'pr-rm', id: 'p12' }); const v = B.el('v-prize').innerHTML; assert.ok(/total weight 90/.test(v)); assert.ok(/data-pzc="p10">3.33%</.test(v), '5% × 60/90');
  });
  // regression: the other Users / Admin buttons still open their boxes or send their request
  await t('Change password opens its box', () => { const B = boot(); B.press({ act: 'ad-pw', email: 'nghiatucayfai@gmail.com' }); assert.ok(B.AD.modal && /Change password/.test(B.AD.modal.title)); });
  await t('Edit class opens its box', () => { const B = boot(); B.press({ act: 'ad-cls', email: 'nghiatucayfai@gmail.com' }); assert.ok(B.AD.modal && /Edit class/.test(B.AD.modal.title)); });
  await t('Resume sends admin/active', async () => { const B = boot(); B.AD.users[4].status = 'paused'; B.W.calls.length = 0; B.press({ act: 'ad-on', email: 'nghiatucayfai@gmail.com' }); await B.flush(); assert.ok(B.W.calls.some((c) => /admin\/active$/.test(c.url))); });
  await t('Teachers and My account tabs render', () => { const B = boot(); B.press({ act: 'ad-sub', v: 'teachers' }); assert.ok(B.view().length > 100); B.press({ act: 'ad-sub', v: 'me' }); assert.ok(B.view().length > 100); });
  await t('Users shows the app version next to the server version', () => { const B = boot(); assert.ok(/ · app \d{4}-\d\d-\d\d\w? · server 2026-10-23d/.test(B.view())); });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
