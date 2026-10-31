// External homework (link + screenshot) and the tidier assignment form. Real app code (tests/app-harness.js) + the real server
// upload route with a fake KV. No network. Run: node tests/hw-external.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'get AG(){return AG},get AS(){return AS},openForm:openForm,formHTML:formHTML,renderAsg:renderAsg,saveAsg:saveAsg,get localAsg(){return localAsg},setAsg:function(a){localAsg=a},' +
  'setHw:function(h){localHwdone=h},homeworkHTML:homeworkHTML,hwRows:hwRows,hwStatus:hwStatus,extSubsHTML:extSubsHTML,setRoster:function(r){rosterDocs=r},isExt:isExt,safeLink:safeLink,allAsgs:allAsgs';
const DAY = 864e5, now = Date.now();
const ROSTER = [{ email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }, { email: 'minh@x.com', name: 'Minh', cls: '7h30', role: 'student' }];
const EXT = { id: 'e1', cls: '7h30', name: 'HW SUN', start: now - DAY, due: now + 2 * DAY, ex: [], type: 'external', link: 'https://forms.example.com/abc', src: 'Google Form', note: 'Do all 20 questions.' };
const stu = (em) => { const B = boot({ hooks: HOOKS, user: { name: 'Lan', email: em || 'lan@x.com', role: 'student', cls: '7h30' } }); B.T.setRoster(ROSTER); return B; };
const tea = () => { const B = boot({ hooks: HOOKS }); B.T.setRoster(ROSTER); return B; };

(async () => {
  await t('form: Assignment details → Exercises from Library + External tasks (both addable, no type switch) → footer "Save assignment"', () => {
    const B = tea(); B.T.openForm('7h30'); B.T.AG.cur = '7h30'; let h = B.T.formHTML();
    assert.ok(!/aria-label="Assignment type"|data-act="asg-type"/.test(h), 'no either / or switch');
    assert.ok(h.includes('>Assignment details<') && h.includes('>Exercises from Library<') && h.includes('>External tasks<') && h.includes('class="pk"') && h.includes('data-act="ax-add"') && h.includes('>Save assignment<') && !h.includes('id="fXl0"'));
    assert.ok(h.includes('>Nothing added yet<'), 'one empty summary in the footer');
    B.T.renderAsg(); B.press({ act: 'ax-add' }); h = B.T.formHTML();
    assert.ok(h.includes('id="fXl0"') && h.includes('id="fXs0"') && h.includes('id="fXn0"') && h.includes('class="pk"') && /screenshot/.test(h), 'the external task is added next to the picker, not instead of it');
  });
  await t('save External only: link required (http/https only); saved record = ext [{x1, link, note, source}], ex [], type external', () => {
    const B = tea(); B.T.AG.cur = '7h30'; B.T.openForm('7h30'); B.T.renderAsg(); B.press({ act: 'ax-add' });
    B.el('fSd').value = '2026-11-01'; B.el('fDd').value = '2026-11-08'; B.el('fDt').value = '22:00'; B.el('fNm').value = 'Form 1'; B.el('fXl0').value = 'javascript:alert(1)'; B.el('fXn0').value = 'Take a screenshot.'; B.el('fXs0').value = 'Google Form';
    B.T.saveAsg(); assert.ok(/External task 1: paste the full link, starting with https/.test(B.el('asgMsg').textContent) && !B.T.localAsg.length, 'unsafe link refused');
    B.el('fXl0').value = 'https://forms.example.com/x'; B.T.saveAsg(); const r = B.T.localAsg[0];
    assert.ok(r && r.type === 'external' && r.ext.length === 1 && r.ext[0].id === 'x1' && r.ext[0].link === 'https://forms.example.com/x' && r.ext[0].note === 'Take a screenshot.' && r.ext[0].src === 'Google Form' && r.ex.length === 0 && r.cls === '7h30' && r.link === 'https://forms.example.com/x');
  });
  await t('old assignments (no type) still work as Mini Drills; a saved Mini Drills one gets type mini', () => {
    const B = tea(); B.T.setAsg([{ id: 'o1', cls: '7h30', start: now - DAY, due: now + DAY, ex: ['l1'] }]); const a = B.T.allAsgs().find((x) => x.id === 'o1');
    assert.ok(a && !B.T.isExt(a) && B.T.hwStatus(a).ids.length === 1);
  });
  await t('student: external card = name, due, instructions, Open link (new tab, safe href), "Not submitted", Upload screenshot', () => {
    const B = stu(); B.T.setAsg([EXT]); const h = B.T.homeworkHTML();
    assert.ok(h.includes('class="hw hwext"') && h.includes('href="https://forms.example.com/abc" target="_blank" rel="noopener noreferrer">Open link') && h.includes('Do all 20 questions.') && h.includes('>Not submitted<') && h.includes('data-act="hw-shot" data-asg="e1"') && h.includes('type="file" accept="image/*"'));
    B.T.setAsg([Object.assign({}, EXT, { link: 'javascript:alert(1)' })]); assert.ok(!/href="javascript/.test(B.T.homeworkHTML()), 'never a javascript: link');
  });
  await t('after an upload (hwdone with a screenshot): Submitted + time + thumbnail + Replace; survives a reload (same record); late upload says so', () => {
    const B = stu(); B.T.setAsg([EXT]); B.T.setHw([{ id: 'lan-x-com_e1', email: 'lan@x.com', asgId: 'e1', ts: now, status: 'submitted', shot: { id: 'a'.repeat(22), url: '/api/image/' + 'a'.repeat(22), ts: now }, updatedAt: now }]);
    let h = B.T.homeworkHTML(); assert.ok(/>Submitted · /.test(h) && h.includes('<img src="/api/image/' + 'a'.repeat(22)) && h.includes('>Replace screenshot<'));
    const L = Object.assign({}, EXT, { id: 'e2', start: now - 5 * DAY, due: now - DAY }); B.T.setAsg([L]); assert.ok(/Missing/.test(B.T.homeworkHTML()), 'overdue + no screenshot = Missing');
    B.T.setHw([{ email: 'lan@x.com', asgId: 'e2', ts: now, shot: { id: 'b'.repeat(22), url: '/api/image/' + 'b'.repeat(22), ts: now } }]); assert.ok(!B.T.homeworkHTML().includes('hwext'), 'submitted after the deadline: no longer listed as to-do');
  });
  await t('teacher: per student Submitted / Not submitted / Missing, time, screenshot link; progress = submitted students', () => {
    const B = tea(); B.T.setAsg([EXT]); B.T.setHw([{ email: 'lan@x.com', asgId: 'e1', ts: now, shot: { id: 'a'.repeat(22), url: '/api/image/' + 'a'.repeat(22), ts: now } }]);
    const h = B.T.extSubsHTML(EXT); assert.ok(h.includes('<b>1</b> of 2 students submitted') && /Lan<\/td><td><span class="pill ok">Submitted</.test(h) && /Minh<\/td><td><span class="pill">Not submitted</.test(h) && h.includes('href="/api/image/' + 'a'.repeat(22)));
    assert.strictEqual(B.T.hwStatus(EXT).pct, 50); const R = B.T.hwRows(EXT).rows; assert.ok(R.find((r) => r.email === 'lan@x.com').all && !R.find((r) => r.email === 'minh@x.com').all);
    const over = Object.assign({}, EXT, { due: now - DAY }); assert.ok(/Minh<\/td><td><span class="pill bad">Missing</.test(B.T.extSubsHTML(over)));
  });
  await t('server: /api/image needs a signed-in user, an image type and the hwshot kind; stores outside Firestore; serves it back', async () => {
    const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest');
    const KV = {}, env = { MD_KV: { get: async (k) => (k in KV ? KV[k].v : null), put: async (k, v, o) => { KV[k] = { v, m: o && o.metadata }; }, delete: async (k) => { delete KV[k]; }, getWithMetadata: async (k) => (k in KV ? { value: KV[k].v, metadata: KV[k].m } : null) } };
    const ctx = vm.createContext({ console: { log() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; this.headers = (o && o.headers) || {}; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, Date, Math, JSON, Uint8Array, ArrayBuffer });
    vm.runInContext(SRC + ';this.T={imageUpload,imageServe};this.setWho=function(w){idUser=async function(){return w}};', ctx);
    const req = (type, n) => ({ headers: { get: (h) => (h === 'Content-Type' ? type : h === 'Content-Length' ? String(n) : null) }, arrayBuffer: async () => new Uint8Array(n).buffer, method: 'GET' });
    const u = new URL('https://x/api/image?kind=hwshot'), bad = new URL('https://x/api/image?kind=other');
    ctx.setWho(null); let r = await ctx.T.imageUpload(env, req('image/png', 5000), u, '1.1.1.1'); assert.strictEqual(r.status, 401, 'signed out');
    ctx.setWho({ em: 'lan@x.com', role: 'student' });
    r = await ctx.T.imageUpload(env, req('image/png', 5000), bad, '1.1.1.1'); assert.strictEqual(r.status, 400);
    r = await ctx.T.imageUpload(env, req('text/html', 5000), u, '1.1.1.1'); assert.strictEqual(r.status, 415, 'not an image');
    r = await ctx.T.imageUpload(env, req('image/png', 6 * 1024 * 1024), u, '1.1.1.1'); assert.strictEqual(r.status, 413);
    r = await ctx.T.imageUpload(env, req('image/png', 5000), u, '1.1.1.1'); const d = JSON.parse(r.body); assert.ok(r.status === 200 && /^\/api\/image\/[A-Za-z0-9_-]{22}$/.test(d.url) && KV['img:' + d.id]);
    const s = await ctx.T.imageServe(env, { method: 'GET' }, d.id); assert.ok(s.status === 200 && s.headers['Content-Type'] === 'image/png' && s.headers['X-Content-Type-Options'] === 'nosniff');
    assert.strictEqual((await ctx.T.imageServe(env, { method: 'GET' }, 'z'.repeat(22))).status, 404);
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
