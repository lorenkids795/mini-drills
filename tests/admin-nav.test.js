// Admin navigation (11/2026): one row of four group menus; the current page is marked; menus open / close; every page reachable.
// Plus: admin/assistants is routed on the server, and a 404 from an older server names the versions. Real app + server code.
// Run: node tests/admin-nav.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'get AD(){return AD},get ADN(){return ADN},renderAdmin:renderAdmin,adNavHTML:adNavHTML,AD_NAV:AD_NAV';
const SUBS = [['guide', 'Guide'], ['users', 'Users'], ['teachers', 'Teachers'], ['students', 'Students'], ['sheet', 'Google Sheet'], ['xp', 'XP'], ['season', 'Season'], ['aitest', 'AI test'], ['rdcheck', 'Reading check'], ['samples', 'Library samples'], ['assist', 'Assistants'], ['me', 'My account']];
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

t('four group menu buttons in one nav; each opens a menu with its pages; nothing else is a tab row', () => {
  const B = boot({ hooks: HOOKS }); const h = B.T.adNavHTML(SUBS);
  assert.strictEqual((h.match(/class="adngb"/g) || []).length, 4);
  ['People', 'Classes &amp; data', 'Gamification', 'Tools'].forEach((g) => assert.ok(h.includes('<span class="adngl">' + g + '</span>'), g));
  assert.ok(/aria-haspopup="menu" aria-expanded="false" aria-controls="adngm0"/.test(h) && /<ul class="adngm" id="adngm0" role="menu" aria-labelledby="adngb0" hidden>/.test(h));
  ['users', 'teachers', 'assist', 'students', 'sheet', 'xp', 'season', 'aitest', 'rdcheck', 'samples', 'guide', 'me'].forEach((k) => assert.ok(h.includes('role="menuitem" data-act="ad-sub" data-v="' + k + '"'), k));
  assert.ok(h.includes('role="menuitem" data-act="tab" data-tab="prize"'), 'Prizes opens the Prizes page');
  assert.ok(!/subtabs|role="tablist"/.test(h));
});
t('the current page is marked: group "on" + "People · Assistants" + ✓ aria-current in the menu', () => {
  const B = boot({ hooks: HOOKS }); B.T.AD.sub = 'assist'; const h = B.T.adNavHTML(SUBS);
  assert.ok(/<div class="adng on"><button type="button" class="adngb" id="adngb0"/.test(h) && h.includes('<span class="adngc"> · Assistants</span>'));
  assert.ok(/data-v="assist" aria-current="page" class="on"><span class="adngk" aria-hidden="true">✓<\/span>Assistants/.test(h));
  assert.strictEqual((h.match(/class="adng on"/g) || []).length, 1);
});
t('pressing a group opens it, pressing again closes it; choosing a page closes the menu and is remembered for reload', () => {
  const B = boot({ hooks: HOOKS });
  B.press({ act: 'ad-nav', g: '3', _in: ['.adnav'] }); assert.strictEqual(B.T.ADN, 3);
  B.press({ act: 'ad-nav', g: '3', _in: ['.adnav'] }); assert.strictEqual(B.T.ADN, -1);
  B.press({ act: 'ad-nav', g: '0', _in: ['.adnav'] }); B.press({ act: 'ad-sub', v: 'teachers', _in: ['.adnav'] });
  assert.strictEqual(B.T.ADN, -1); assert.strictEqual(B.T.AD.sub, 'teachers'); assert.strictEqual(B.W.localStorage.getItem('md-adsub'), 'teachers');
  assert.ok(/var AD=\{sub:\(function\(\)\{var v='';try\{v=localStorage\.getItem\('md-adsub'\)/.test(html), 'restored on reload (only known pages)');
});
t('menus close on outside click, Escape (focus back), Tab; arrows move inside; CSS: dropdown above content, two columns on phones', () => {
  assert.ok(/document\.addEventListener\('click',function\(e\)\{if\(ADN>=0&&!\(e\.target\.closest&&e\.target\.closest\('\.adnav'\)\)\)adNavSet\(-1\)\}\)/.test(html));
  assert.ok(/if\(e\.key==='Escape'\)\{var g=ADN;adNavSet\(-1\);var b=document\.getElementById\('adngb'\+g\);if\(b\)b\.focus\(\)/.test(html) && /e\.key==='ArrowDown'\|\|e\.key==='ArrowUp'/.test(html));
  assert.ok(/\.adngm\{position:absolute;[^}]*z-index:40/.test(html) && /@media \(max-width:640px\)\{\.adnav\{display:grid;grid-template-columns:1fr 1fr\}/.test(html));
  assert.ok(!/\.adnav\{display:flex;flex-wrap:wrap;gap:10px 22px/.test(html), 'old multi-row layout removed');
});
t('server: admin/assistants is routed behind the admin key (add / list / set / remove); the app shows both versions on a 404', () => {
  const srv = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8');
  const i = srv.indexOf("if (route.indexOf('admin/') === 0) {"), j = srv.indexOf("if (route === 'admin/assistants') return await adminAssistants(env, body);");
  assert.ok(i > 0 && j > i && srv.slice(i, j).includes('adminKeyOk'), 'inside the admin-key block');
  ["op === 'list'", "op === 'add'", "op === 'set'", "op === 'remove'"].forEach((o) => assert.ok(srv.includes(o), o));
  assert.ok(/This email is already a Homework Assistant\.', 409/.test(srv), 'a retry never makes a second account');
  assert.ok(/The site runs server '\+\(AD\.ver\|\|'\(older, no version number\)'\)\+' and app '\+APP_VERSION/.test(html));
});

out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
