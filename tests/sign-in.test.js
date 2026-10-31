// Sign-in page v2 (md-backend.js login UI): the real file run in Node with a tiny fake DOM.
// States: student login · first time · teacher · teacher first time; role switched by text links; same /api calls as before.
// Run: node tests/sign-in.test.js   (Node built-ins only)
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }

function mkEl(tag) {
  const e = { tagName: String(tag).toUpperCase(), children: [], attrs: {}, hidden: false, disabled: false, value: '', textContent: '', listeners: {}, style: {}, parentNode: null };
  e.setAttribute = (k, v) => { e.attrs[k] = String(v); if (k === 'hidden') e.hidden = true; if (k === 'disabled') e.disabled = true; if (k === 'id') e.id = String(v); };
  e.getAttribute = (k) => (k in e.attrs ? e.attrs[k] : null);
  e.removeAttribute = (k) => { delete e.attrs[k]; if (k === 'hidden') e.hidden = false; };
  e.appendChild = (c) => { c.parentNode = e; e.children.push(c); if (e.tagName === 'SELECT' && e.children.length === 1) e.value = c.attrs.value || ''; return c; };
  e.insertBefore = (c, ref) => { c.parentNode = e; const i = ref ? e.children.indexOf(ref) : -1; if (i < 0) e.children.push(c); else e.children.splice(i, 0, c); return c; };
  e.addEventListener = (ty, f) => { (e.listeners[ty] = e.listeners[ty] || []).push(f); };
  Object.defineProperty(e, 'innerHTML', { set() { e.children = []; }, get() { return ''; } });
  return e;
}
const walk = (e, f) => { f(e); e.children.forEach((c) => walk(c, f)); };
const text = (e) => { let s = e.textContent || ''; e.children.forEach((c) => { s += text(c); }); return s; };

function boot(fetchFn) {
  const card = mkEl('div'), host = mkEl('form'); host.setAttribute('id', 'loginForm'); card.appendChild(host);
  const byId = (id) => { let f = null; walk(card, (e) => { if (!f && e.id === id) f = e; }); return f; };
  const doc = { readyState: 'complete', head: mkEl('head'), createElement: mkEl, createTextNode: (s) => { const n = mkEl('#text'); n.textContent = s; return n; },
    getElementById: byId, querySelector: (s) => (s === '#v-login .login' ? card : s === '#loginForm' ? host : null), addEventListener() {} };
  const calls = [];
  const W = { document: doc, console, Promise, JSON, Object, Array, String, Error, encodeURIComponent, setInterval: () => 0, location: { reload() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    MD_CONFIG: { demo: false, api: '/api', firebase: {} },
    fetch: (url, opt) => { calls.push({ url, opt }); return fetchFn ? fetchFn(url, opt) : new Promise(() => {}); } };
  W.window = W;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'md-backend.js'), 'utf8'), vm.createContext(W), { filename: 'md-backend.js' });
  const root = byId('mdAuth');
  const visible = () => { const v = []; root.children.forEach((c) => { if (!c.hidden) v.push(c); }); return v; };
  const btn = (label) => { let f = null; walk(root, (e) => { if (!f && e.tagName === 'BUTTON' && e.textContent === label) f = e; }); assert.ok(f, 'no button ' + label); return f; };
  const shown = () => visible().map((c) => (c.tagName === 'FORM' ? 'form:' + c.children.filter((x) => x.attrs.class === 'field').map((x) => x.children[0].textContent).join('|') : c.tagName === 'BUTTON' ? c.attrs.class + ':' + c.textContent : c.tagName));
  return { card, root, byId, btn, shown, calls, W };
}
const flush = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };

(async () => {
  await t('UI is inserted before #loginForm in the .login box', () => { const B = boot(); assert.ok(B.root); assert.strictEqual(B.card.children.indexOf(B.root), 0); });
  await t('no Student / Teacher tab buttons', () => { const B = boot(); let tabs = 0; walk(B.root, (e) => { if (e.tagName === 'BUTTON' && /^(Student|Teacher)$/.test(e.textContent)) tabs++; }); assert.strictEqual(tabs, 0); });
  await t('state 1 (default): Email, Password, Sign in, First time…, link Teacher sign in', () => {
    const B = boot(); assert.deepStrictEqual(B.shown(), ['form:Email|Password', 'P', 'lgalt:First time here? Create your password', 'lglink:Teacher sign in']);
    assert.strictEqual(B.byId('sPass').attrs.placeholder, ''); assert.strictEqual(B.byId('sEmail').attrs.placeholder, 'you@example.com');
  });
  await t('state 3 (teacher): Email, Password, Sign in, link Sign in as student; no teacher first-time link', () => {
    const B = boot(); B.btn('Teacher sign in').onclick();
    assert.deepStrictEqual(B.shown(), ['form:Email|Password', 'P', 'lglink:Sign in as student']);
    B.btn('Sign in as student').onclick(); assert.strictEqual(B.shown()[0], 'form:Email|Password'); assert.ok(B.shown().includes('lglink:Teacher sign in'));
  });
  await t('state 2 (first time): Class, Your name, Your email, Choose a password, Create my password, I already have a password', () => {
    const B = boot(); B.btn('First time here? Create your password').onclick();
    assert.deepStrictEqual(B.shown(), ['form:Class|Your name|Your email|Choose a password', 'P', 'lgalt:I already have a password']);
    assert.strictEqual(B.byId('rPass').attrs.placeholder, 'At least 6 characters');
    B.btn('I already have a password').onclick(); assert.strictEqual(B.shown()[0], 'form:Email|Password');
  });
  await t('name list: disabled "Choose a class first" until a class is chosen; changing class resets the name', async () => {
    const list = [{ id: 'n1', cls: '7h30', name: 'An' }, { id: 'n2', cls: '7h30', name: 'Bình' }, { id: 'n3', cls: '17h', name: 'Chi' }];
    const B = boot((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(list) }));
    B.btn('First time here? Create your password').onclick(); await flush();
    const c = B.byId('rClass'), n = B.byId('rName');
    assert.deepStrictEqual(c.children.map((o) => o.textContent), ['Choose your class', '7h30', '17h', 'My teacher already added my email']);
    assert.strictEqual(n.disabled, true); assert.strictEqual(n.children[0].textContent, 'Choose a class first');
    c.value = '7h30'; c.listeners.change[0](); assert.strictEqual(n.disabled, false); assert.deepStrictEqual(n.children.map((o) => o.textContent), ['Choose your name', 'An', 'Bình']);
    n.value = 'n2'; c.value = '17h'; c.listeners.change[0](); assert.strictEqual(n.value, ''); assert.deepStrictEqual(n.children.map((o) => o.textContent), ['Choose your name', 'Chi']);
    c.value = '__email'; c.listeners.change[0](); assert.strictEqual(n.disabled, true);
  });
  await t('sign in posts /api/login with email + password (unchanged)', async () => {
    const B = boot((url) => (url === '/api/login' ? Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Wrong email or password.' }) }) : new Promise(() => {})));
    B.byId('sEmail').value = 'a@b.c'; B.byId('sPass').value = 'secret1';
    const f = B.root.children.find((c) => c.tagName === 'FORM'); f.onsubmit({ preventDefault() {} }); await flush();
    const k = B.calls.filter((c) => c.url === '/api/login'); assert.strictEqual(k.length, 1); assert.deepStrictEqual(JSON.parse(k[0].opt.body), { email: 'a@b.c', password: 'secret1' });
    assert.strictEqual(B.byId('authMsg').textContent, 'Wrong email or password.');
  });
  await t('first time posts /api/register with nameId (unchanged)', async () => {
    const B = boot((url) => (url === '/api/names' ? Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 'n1', cls: 'A', name: 'An' }]) }) : new Promise(() => {})));
    B.btn('First time here? Create your password').onclick(); await flush();
    B.byId('rClass').value = 'A'; B.byId('rClass').listeners.change[0](); B.byId('rName').value = 'n1'; B.byId('rEmail').value = 'a@b.c'; B.byId('rPass').value = 'secret1';
    B.root.children.filter((c) => c.tagName === 'FORM')[1].onsubmit({ preventDefault() {} }); await flush();
    const k = B.calls.filter((c) => c.url === '/api/register'); assert.strictEqual(k.length, 1); assert.deepStrictEqual(JSON.parse(k[0].opt.body), { nameId: 'n1', email: 'a@b.c', password: 'secret1' });
  });
  await t('no teacher self sign-up anywhere: no setup key field, no "Create your teacher password"; no subtitle; student first time still there', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'md-backend.js'), 'utf8'), html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(!/setupKey|Setup key|Create your teacher password|Create teacher password/.test(src));
    assert.ok(!/Sign in to continue your learning journey/.test(html + src));
    const B = boot(); assert.ok(B.shown().includes('lgalt:First time here? Create your password'));
  });
  await t('server: a teacher email (TEACHERS or added by the admin) cannot create its own password, even with the old setup key', () => {
    const S = require('fs').readFileSync(require('path').join(__dirname, '..', 'functions', 'api', '[[path]].js'), 'utf8');
    assert.ok(/if \(teachers\(env\)\.indexOf\(email\) >= 0 \|\| \(await staffMap\(env\)\)\[email\] \|\| \(await assistMap\(env\)\)\[email\]\) \{\s*return fail\('Teacher accounts are set up by the admin/.test(S));
    assert.ok(!/body\.setupKey|ADMIN_SETUP_KEY\)\.length/.test(S), 'the setup-key route is gone');
  });
  await t('every input and select has an id and a name (autofill)', () => { const B = boot(); walk(B.root, (e) => { if (e.tagName === 'INPUT' || e.tagName === 'SELECT') { assert.ok(e.id, 'id'); assert.strictEqual(e.attrs.name, e.id); } }); });
  await t('index.html: brand panel, slogan, theme button, body.lg', () => {
    const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(h.includes('<div class="lglogo">Mini<b>Drills</b></div>') && h.includes('<h2>A little practice a day keeps <mark>mistakes away</mark></h2>'));
    assert.ok(/class="lgtheme" type="button" data-act="theme" aria-label="Toggle dark mode"/.test(h)); assert.ok(h.includes("document.body.classList.add('lg')") && h.includes("document.body.classList.remove('lg')"));
    assert.ok(/@media \(prefers-reduced-motion:reduce\)\{\.lgart>\.lgshoot\{display:none\}\.lgart::after\{animation:none\}\}/.test(h));
    assert.ok(!/lgart[^{]*\{[^}]*ring/.test(h), 'no ring decoration');
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
