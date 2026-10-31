// One assignment with Library exercises AND external tasks: form, save / edit, legacy records, student card, completion rules,
// teacher tracking, filter-scoped bulk select, and the Homework Assistant server route. Real app + server code, no network.
// Run: node tests/hw-mixed.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'get AG(){return AG},get AS(){return AS},openForm:openForm,formHTML:formHTML,renderAsg:renderAsg,saveAsg:saveAsg,get localAsg(){return localAsg},setAsg:function(a){localAsg=a},' +
  'setHw:function(h){localHwdone=h},get localHwdone(){return localHwdone},homeworkHTML:homeworkHTML,hwRows:hwRows,hwStatus:hwStatus,hwMatrixHTML:hwMatrixHTML,asgState:asgState,normAsg:normAsg,allAsgs:allAsgs,' +
  'setRoster:function(r){rosterDocs=r},imDone:imDone,pickIds:pickIds,agSel:agSel,asgSummary:asgSummary,setAttempts:function(a){localAtt=a}';
const DAY = 864e5, now = Date.now(), A22 = 'a'.repeat(22), B22 = 'b'.repeat(22);
const ROSTER = [{ email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }, { email: 'minh@x.com', name: 'Minh', cls: '7h30', role: 'student' }];
const MIX = { id: 'm1', cls: '7h30', name: 'HW MIX', start: now - DAY, due: now + 2 * DAY, ex: ['l1', 'r1'], type: 'mixed',
  ext: [{ id: 'x1', link: 'https://forms.example.com/a', src: 'Google Form', note: 'Do part A.' }, { id: 'x2', link: 'https://quizlet.example.com/b', src: '', note: '' }] };
const tea = () => { const B = boot({ hooks: HOOKS }); B.T.setRoster(ROSTER); return B; };
const stu = () => { const B = boot({ hooks: HOOKS, user: { name: 'Lan', email: 'lan@x.com', role: 'student', cls: '7h30' } }); B.T.setRoster(ROSTER); return B; };
const dates = (B) => { B.el('fSd').value = '2026-11-01'; B.el('fDd').value = '2026-11-08'; B.el('fDt').value = '22:00'; B.el('fNm').value = 'HW'; };
const newForm = (B) => { B.T.AG.cur = '7h30'; B.T.openForm('7h30'); B.T.renderAsg(); dates(B); };
// the fake DOM does not read value="…" from the HTML: copy the form state into the fields, like a real browser shows them
const fill = (B) => { B.T.AG.form.ext.forEach((x, i) => { B.el('fXl' + i).value = x.link; B.el('fXs' + i).value = x.src; B.el('fXn' + i).value = x.note; }); };
const hasAtt = (B) => { try { return B.T.setAttempts; } catch (e) { return null; } };

(async () => {
  await t('1. Library only: saved with ex, ext [], type mini', () => {
    const B = tea(); newForm(B); B.T.AS.sel = { l1: 1, r1: 1 }; B.T.saveAsg(); const r = B.T.localAsg[0];
    assert.ok(r && r.type === 'mini' && r.ex.join() === 'l1,r1' && Array.isArray(r.ext) && !r.ext.length && !r.link);
  });
  await t('2. nothing added → refused with a clear message, nothing saved, fields kept', () => {
    const B = tea(); newForm(B); B.T.saveAsg();
    assert.ok(/Add at least one exercise from the Library or one external task/.test(B.el('asgMsg').textContent) && !B.T.localAsg.length && B.T.AG.form);
  });
  await t('3. Library + one external link → one record, type mixed', () => {
    const B = tea(); newForm(B); B.T.AS.sel = { l1: 1 }; B.press({ act: 'ax-add' }); dates(B); B.el('fXl0').value = 'https://f.example.com/1'; B.T.saveAsg(); const r = B.T.localAsg[0];
    assert.ok(B.T.localAsg.length === 1 && r.type === 'mixed' && r.ex.join() === 'l1' && r.ext.length === 1 && r.ext[0].id === 'x1');
  });
  await t('4. several Library exercises + several links; typed values survive adding a section; ids x1, x2, x3', () => {
    const B = tea(); newForm(B); B.T.AS.sel = { l1: 1, r1: 1, l2: 1 }; B.press({ act: 'ax-add' }); B.el('fXl0').value = 'https://f.example.com/1'; B.el('fXn0').value = 'First';
    B.press({ act: 'ax-add' }); assert.strictEqual(B.T.AG.form.ext[0].note, 'First', 'kept when a task is added');
    B.el('fXl1').value = 'https://f.example.com/2'; B.press({ act: 'ax-add' }); B.el('fXl2').value = 'https://f.example.com/3'; dates(B);
    B.press({ act: 'pk-toggle' }); assert.ok(B.T.AG.form.ext[2].link === 'https://f.example.com/3' && !B.T.AG.form.pick, 'kept when the picker closes');
    B.T.saveAsg(); const r = B.T.localAsg[0];
    assert.ok(r.ex.length === 3 && r.ext.map((x) => x.id).join() === 'x1,x2,x3' && r.ext[0].note === 'First' && r.type === 'mixed');
    assert.strictEqual(B.T.asgSummary(r), '3 exercises · 3 external tasks');
  });
  await t('5. edit a mixed assignment: remove one task and one exercise, the rest (and the task ids) stay; new task gets a new id', () => {
    const B = tea(); B.T.setAsg([MIX]); B.T.AG.cur = '7h30'; B.T.openForm('7h30', B.T.allAsgs().find((a) => a.id === 'm1')); B.T.renderAsg(); dates(B); fill(B);
    B.press({ act: 'ax-rm', i: '0' }); fill(B); B.press({ act: 'pk-rm', id: 'r1' }); fill(B); B.press({ act: 'ax-add' }); fill(B); B.el('fXl1').value = 'https://new.example.com'; dates(B);
    B.T.saveAsg(); const r = B.T.localAsg.find((a) => a.id === 'm1');
    assert.ok(r && B.T.localAsg.length === 1 && r.ex.join() === 'l1' && r.ext.map((x) => x.id).join() === 'x2,x3' && r.ext[0].link === 'https://quizlet.example.com/b');
  });
  await t('6. student: one card, two sections; Library rows open the exercise; each external task has its own link + upload', () => {
    const B = stu(); B.T.setAsg([MIX]); const h = B.T.homeworkHTML();
    assert.strictEqual((h.match(/<div class="hw hwext/g) || []).length, 1, 'one card');
    assert.ok(h.includes('>Exercises from Library<') && h.includes('>External tasks<') && /data-act="nav"[^>]*data-ex="l1"/.test(h) && /data-ex="r1"/.test(h));
    assert.ok(h.includes('data-act="hw-shot" data-asg="m1" data-x="x1"') && h.includes('data-act="hw-shot" data-asg="m1" data-x="x2"') && h.includes('id="hwShot_m1_x2"'));
    assert.ok(h.includes('href="https://forms.example.com/a" target="_blank" rel="noopener noreferrer">Open link') && h.includes('Do part A.') && h.includes('>0 of 4 parts done<'));
  });
  await t('7–8. completion: screenshots alone ≠ complete; Library alone ≠ complete; both = complete; a screenshot is "Submitted", never a score', () => {
    const B = stu(); B.T.setAsg([MIX]); const a = B.T.allAsgs().find((x) => x.id === 'm1');
    B.T.setHw([{ id: 'lan-x-com_m1', email: 'lan@x.com', asgId: 'm1', ts: now, status: 'submitted', shots: { x1: { id: A22, url: '/api/image/' + A22, ts: now }, x2: { id: B22, url: '/api/image/' + B22, ts: now } } }]);
    let S = B.T.asgState(a, 'lan@x.com'); assert.ok(S.extFin && !S.libFin && !S.fin, 'external done, Library not');
    let h = B.T.homeworkHTML(); assert.ok(/>Submitted · /.test(h) && !/score|correct/i.test(h) && !h.includes('All done ✓') && h.includes('>2 of 4 parts done<'));
    B.T.setHw([{ id: 'lan-x-com_m1', email: 'lan@x.com', asgId: 'm1', ts: now, done: true }]);
    S = B.T.asgState(a, 'lan@x.com'); assert.ok(S.libFin && !S.extFin && !S.fin, 'Library turned in, external missing');
    assert.ok(B.T.homeworkHTML().includes('Library exercises done ✓ Upload a screenshot for each external task to finish.'));
    B.T.setHw([{ id: 'lan-x-com_m1', email: 'lan@x.com', asgId: 'm1', ts: now, done: true, shots: { x1: { id: A22, url: '/api/image/' + A22, ts: now }, x2: { id: B22, url: '/api/image/' + B22, ts: now } } }]);
    assert.ok(B.T.asgState(a, 'lan@x.com').fin && B.T.homeworkHTML().includes('All done ✓'));
  });
  await t('8b. "I\'m done!" on a mixed assignment keeps the screenshots in the same record (no duplicate record)', () => {
    const B = stu(); B.T.setAsg([Object.assign({}, MIX, { ex: ['zz-none'] })]); // no real exercise left to do: the Library part can be turned in
    B.T.setHw([{ id: 'lan-x-com_m1', email: 'lan@x.com', asgId: 'm1', ts: now, shots: { x1: { id: A22, url: '/api/image/' + A22, ts: now } } }]);
    B.T.imDone('m1'); const L = B.T.localHwdone.filter((d) => d.asgId === 'm1');
    assert.ok(L.length === 1 && L[0].done === true && L[0].shots.x1.url === '/api/image/' + A22, JSON.stringify(L));
  });
  await t('9. teacher: hwStatus counts parts; matrix shows exercise + task columns, screenshot link, "Complete" only when everything is in', () => {
    const B = tea(); B.T.setAsg([MIX]); B.T.setHw([{ email: 'lan@x.com', asgId: 'm1', ts: now, shots: { x1: { id: A22, url: '/api/image/' + A22, ts: now } } }]);
    const hs = B.T.hwStatus(MIX); assert.strictEqual(hs.pct, Math.round(1 / 8 * 100));
    const h = B.T.hwMatrixHTML(MIX); assert.ok(h.includes('>Link 1 · Google Form<') && h.includes('>Link 2<') && h.includes('href="/api/image/' + A22 + '"') && h.includes('<b>0</b> of 2 students finished everything') && h.includes('>Complete<'));
    const R = B.T.hwRows(MIX).rows.find((r) => r.email === 'lan@x.com'); assert.ok(!R.all && !R.fin && R.cells.length === 4);
  });
  await t('10. legacy records: old external (top-level link) = task x1 with its old "shot"; old Library-only and old "I\'m done" still work', () => {
    const B = stu(); const OLD = { id: 'o1', cls: '7h30', start: now - DAY, due: now + DAY, ex: [], type: 'external', link: 'https://old.example.com', note: 'Old note' };
    B.T.setAsg([OLD, { id: 'o2', cls: '7h30', start: now - DAY, due: now + DAY, ex: ['l1'] }]);
    const n = B.T.allAsgs().find((a) => a.id === 'o1'); assert.ok(n.ext.length === 1 && n.ext[0].id === 'x1' && n.ext[0].link === 'https://old.example.com' && n.ext[0].note === 'Old note');
    B.T.setHw([{ email: 'lan@x.com', asgId: 'o1', ts: now, shot: { id: A22, url: '/api/image/' + A22, ts: now } }, { email: 'lan@x.com', asgId: 'o2', ts: now }]);
    assert.ok(B.T.asgState(n, 'lan@x.com').fin, 'old screenshot counts for x1');
    const o2 = B.T.allAsgs().find((a) => a.id === 'o2'); assert.ok(B.T.asgState(o2, 'lan@x.com').libFin, 'old I\'m done record (no screenshot) = Library turned in');
    const T = tea(); T.T.setAsg([OLD]); T.T.AG.cur = '7h30'; T.T.openForm('7h30', T.T.allAsgs()[0]); T.T.renderAsg(); dates(T); fill(T); T.T.saveAsg();
    const r = T.T.localAsg.find((a) => a.id === 'o1'); assert.ok(r.ext.length === 1 && r.ext[0].id === 'x1' && r.ext[0].link === 'https://old.example.com' && r.type === 'external', 're-saved without losing the task');
  });
  await t('11. bulk select acts on the filtered exercises only; Remove all clears the whole selection (after confirm)', () => {
    const B = tea(); newForm(B); B.T.AS.sel = { r1: 1 }; B.T.AS.pk = { book: 'cam14', test: 'all', skill: 'listening' }; B.T.renderAsg();
    const shown = []; B.T.pickIds().forEach((g) => g.ids.forEach((i) => shown.push(i)));
    assert.ok(shown.length && shown.every((i) => !/^r/.test(i)));
    B.press({ act: 'pk-all' }); assert.ok(shown.every((i) => B.T.AS.sel[i]) && B.T.AS.sel.r1, 'Reading choice untouched');
    B.press({ act: 'pk-none' }); assert.ok(shown.every((i) => !B.T.AS.sel[i]) && B.T.AS.sel.r1, 'unselect only the shown ones');
    B.T.AS.sel.l1 = 1; B.W.confirm = () => false; B.press({ act: 'pk-clear' }); assert.ok(B.T.agSel().length === 2, 'cancel keeps them');
    B.W.confirm = () => true; B.press({ act: 'pk-clear' }); assert.strictEqual(B.T.agSel().length, 0);
  });
  await t('12. layout: no inner scroll box in the picker, sticky footer, no type switch CSS hooks left in the form', () => {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(/\.afsec \.pklist\{max-height:none;overflow:visible/.test(src) && /\.affoot\{position:sticky;bottom:0/.test(src) && !/data-act="asg-type"/.test(src));
  });
  await t('server: assistant saves Library + several links for its own class; bad link refused by position; status needs every part', async () => {
    const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest');
    const KV = { assist: JSON.stringify({ 'as@x.com': { name: 'A', classes: ['7h30'] } }) }, DB = { assignments: {}, roster: {}, classes: {} };
    const env = { MD_KV: { get: async (k, ty) => (k in KV ? (ty === 'json' ? JSON.parse(KV[k]) : KV[k]) : null), put: async (k, v) => { KV[k] = v; } } };
    const ctx = vm.createContext({ console: { log() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, Date, Math, JSON, Uint8Array, ArrayBuffer });
    vm.runInContext(SRC + ';this.T={hwaAsg,hwaStatus,hwaNormAsg};idUser=async function(){return {em:"as@x.com",role:"assistant"}};var DB=null;this.setDB=function(d){DB=d};fsGet=async function(e,c,i){return DB[c]&&DB[c][i]?{data:DB[c][i]}:null};fsPut=async function(e,c,i,o){DB[c][i]=o};', ctx);
    ctx.setDB(DB);
    const call = async (b) => { const r = await ctx.T.hwaAsg(env, {}, b); return { status: r.status, d: JSON.parse(r.body) }; };
    const rec = { cls: '7h30', name: 'M', start: now, due: now + DAY, ex: ['l1'], ext: [{ id: 'x1', link: 'https://a.example.com' }, { id: 'x2', link: 'https://b.example.com', note: 'n' }] };
    let r = await call({ op: 'save', rec }); const saved = DB.assignments[r.d.id];
    assert.ok(r.status === 200 && saved.type === 'mixed' && saved.ext.length === 2 && saved.ext[1].note === 'n' && saved.ex.join() === 'l1');
    r = await call({ op: 'save', rec: Object.assign({}, rec, { ext: [{ link: 'https://ok.example.com' }, { link: 'javascript:alert(1)' }] }) }); assert.ok(r.status === 400 && /External task 2/.test(r.d.error));
    r = await call({ op: 'save', rec: Object.assign({}, rec, { cls: '9h' }) }); assert.strictEqual(r.status, 403);
    r = await call({ op: 'save', rec: Object.assign({}, rec, { ex: [], ext: [] }) }); assert.ok(r.status === 400 && /at least one/.test(r.d.error));
    const a = ctx.T.hwaNormAsg(saved), att = [{ ex: 'l1', ts: now + 10 }];
    assert.strictEqual(ctx.T.hwaStatus(a, att, null, null, now + 2 * DAY).st, 'missing', 'Library alone is not submitted');
    assert.strictEqual(ctx.T.hwaStatus(a, [], { shots: { x1: { url: '/api/image/' + A22, ts: now + 5 }, x2: { url: '/api/image/' + B22, ts: now + 6 } } }, null, now + 2 * DAY).st, 'missing', 'screenshots alone are not');
    assert.strictEqual(ctx.T.hwaStatus(a, att, { shots: { x1: { url: '/api/image/' + A22, ts: now + 5 }, x2: { url: '/api/image/' + B22, ts: now + 6 } } }, null, now + 2 * DAY).st, 'done');
  });
  void hasAtt;
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
