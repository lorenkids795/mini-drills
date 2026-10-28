// Deleted students / classes: Dashboard + Marking only count live students (by email), the orphan clean-up (server, dry run first),
// class cover position editor, Create (one Add button, Hide editor, preview level) and the Reading header.
// Real app script (tests/app-harness.js) + real server source with a fake Firestore. Run: node tests/data-cleanup.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, html, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
const t = async (name, fn) => { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } };

// ---------- server (fake Firestore, same shape as tests/server-purge.test.js) ----------
const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest');
const BASE = 'projects/p1/databases/(default)/documents/';
function server(DB, kv) {
  const res = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
  const toV = (v) => (typeof v === 'string' ? { stringValue: v } : typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'boolean' ? { booleanValue: v } : { nullValue: null });
  const doc = (col, id) => ({ name: BASE + col + '/' + id, fields: Object.fromEntries(Object.entries(DB[col][id]).map(([k, v]) => [k, toV(v)])), updateTime: '2026-01-01T00:00:00Z' });
  const fetch = async (url, opt) => {
    opt = opt || {}; const m = /\/documents(.*)$/.exec(String(url)); if (!m) return res(404, {}); const rest = m[1].split('?')[0];
    if (rest === ':runQuery') { const q = JSON.parse(opt.body).structuredQuery, col = q.from[0].collectionId, f = q.where.fieldFilter;
      return res(200, Object.keys(DB[col] || {}).filter((id) => DB[col][id][f.field.fieldPath] === f.value.stringValue).map((id) => ({ document: doc(col, id) }))); }
    if (rest === ':batchWrite') { JSON.parse(opt.body).writes.forEach((w) => { const [col, id] = w.delete.slice(BASE.length).split('/'); if (DB[col]) delete DB[col][id]; }); return res(200, {}); }
    const [, col, id] = rest.split('/').map(decodeURIComponent), me = opt.method || 'GET';
    if (me === 'GET' && id) return DB[col] && DB[col][id] ? res(200, doc(col, id)) : res(404, {});
    if (me === 'GET') return res(200, { documents: Object.keys(DB[col] || {}).map((i) => doc(col, i)) });
    if (me === 'DELETE') { if (DB[col]) delete DB[col][id]; return res(200, {}); }
    if (me === 'PATCH') { DB[col] = DB[col] || {}; DB[col][id] = { written: true }; return res(200, doc(col, id)); }
    return res(200, {});
  };
  const KV = Object.assign({}, kv || {});
  const env = { FIREBASE_PROJECT_ID: 'p1', ADMIN_EMAIL: 'admin@x.com', TEACHERS: 'teach@x.com', MD_KV: { get: async (k, ty) => (k in KV ? (ty === 'json' ? JSON.parse(KV[k]) : KV[k]) : null), put: async (k, v) => { KV[k] = v; }, delete: async (k) => { delete KV[k]; } } };
  const ctx = vm.createContext({ fetch, console: { log() {}, error() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, Date, Math, JSON });
  vm.runInContext(SRC + '\n;this.T={adminOrphans};accessToken=async()=>"tok";', ctx);
  return { T: ctx.T, env, DB, body: (r) => JSON.parse(r.body), status: (r) => r.status };
}
const world = () => ({
  roster: { 'live@x.com': { email: 'live@x.com', name: 'Cherry', cls: '67PM', role: 'student' }, 'tester@x.com': { email: 'tester@x.com', name: 'TESTER', cls: 'Test', role: 'student', tester: true } },
  attempts: { a1: { email: 'live@x.com', student: 'Cherry', cls: '67PM', ex: 'l1' }, a2: { email: 'Gone@X.com', student: 'Cherry', cls: '67PM', ex: 'w1' }, a3: { email: 'gone@x.com', student: 'Cherry', cls: '67PM', ex: 'l1' },
    a4: { email: 'tester@x.com', student: 'TESTER', cls: 'Test', ex: 'w1' }, a5: { email: 'teach@x.com', student: 'T', cls: '', ex: 'l1' }, a6: { email: 'staff@x.com', student: 'S', cls: '', ex: 'l1' } },
  errors: { e1: { email: 'gone@x.com' }, e2: { email: 'live@x.com' } }, profiles: { 'gone-x-com': { email: 'gone@x.com' }, 'live-x-com': { email: 'live@x.com' } },
});

(async () => {
  await t('server preview (dry run): lists only emails without a roster row that are not staff; same name "Cherry" on a live student is kept; nothing deleted', async () => {
    const S = server(world(), { staff: JSON.stringify({ 'staff@x.com': { name: 'S' } }) }), r = S.body(await S.T.adminOrphans(S.env, { op: 'preview' }));
    assert.deepStrictEqual(r.orphans.map((o) => o.email), ['gone@x.com']); assert.strictEqual(r.orphans[0].attempts, 2); assert.strictEqual(r.scanned, 6);
    assert.ok(S.DB.attempts.a2 && S.DB.errors.e1, 'preview deletes nothing');
  });
  await t('server purge: deletes every spelling of that email in all learning collections + profile, writes an audit row; live student, tester and staff untouched; running again is refused (idempotent)', async () => {
    const S = server(world(), { staff: JSON.stringify({ 'staff@x.com': { name: 'S' } }) }), r = S.body(await S.T.adminOrphans(S.env, { op: 'purge', email: 'gone@x.com' }));
    assert.ok(r.ok && !S.DB.attempts.a2 && !S.DB.attempts.a3 && !S.DB.errors.e1 && !S.DB.profiles['gone-x-com']);
    assert.ok(S.DB.attempts.a1 && S.DB.attempts.a4 && S.DB.attempts.a5 && S.DB.attempts.a6 && S.DB.errors.e2 && S.DB.profiles['live-x-com']);
    assert.ok(Object.keys(S.DB.audit || {}).some((k) => /^orphans_gone-x-com_/.test(k)), 'audit row');
    const again = await S.T.adminOrphans(S.env, { op: 'purge', email: 'gone@x.com' }); assert.strictEqual(S.status(again), 409);
  });
  await t('server purge refuses a live student, a tester, a teacher and a bad email', async () => {
    for (const em of ['live@x.com', 'tester@x.com', 'teach@x.com', 'nope']) { const S = server(world()), r = await S.T.adminOrphans(S.env, { op: 'purge', email: em }); assert.ok(S.status(r) >= 400, em); assert.ok(S.DB.attempts.a1 && S.DB.attempts.a4); }
  });

  // ---------- client: Dashboard + Marking ----------
  const HOOKS = 'renderDash:renderDash,renderMark:renderMark,subsAll:subsAll,liveEmails:liveEmails,setRoster:function(r){rosterDocs=r},setAtt:function(a){attemptDocs=a},setClasses:function(c){classDocs=c},get MK(){return MK},get F(){return F}';
  const att = (id, em, cls, kind) => ({ id, email: em, student: 'Cherry', cls, ex: 'l1', score: 8, total: 10, items: [], ts: 1760000000000 + id.length, kind: kind || undefined });
  const mkT = () => { const B = boot({ hooks: HOOKS }); B.T.setRoster([{ email: 'live@x.com', name: 'Cherry', cls: '67PM', role: 'student' }, { email: 'tester@x.com', name: 'TESTER', cls: 'Test', role: 'student', tester: true }, { email: 'rm@x.com', name: 'Removed', cls: '67PM', role: 'student' }]);
    B.T.setClasses([{ docId: '67pm', cls: '67PM', removed: ['rm@x.com'] }]);
    B.T.setAtt([att('a1', 'live@x.com', '67PM'), att('a2', 'gone@x.com', 'OLD'), att('a3', 'rm@x.com', '67PM'), att('a4', 'tester@x.com', 'Test'), att('s1', 'live@x.com', '67PM', 'submission'), att('s2', 'gone@x.com', 'OLD', 'submission'), att('s3', 'tester@x.com', 'Test', 'submission'), att('s4', 'rm@x.com', '67PM', 'submission')]); return B; };
  await t('one rule for staff views: live = roster student (by email), not removed from a class; testers are live', async () => {
    const B = mkT(), L = B.T.liveEmails(); assert.deepStrictEqual(Object.keys(L).sort(), ['live@x.com', 'tester@x.com']);
  });
  await t('Marking: deleted and removed students\' submissions are gone (cards, counts, class filter); the tester\'s stays', async () => {
    const B = mkT(); B.T.showTab('mark'); const h = B.el('v-mark').innerHTML;
    assert.ok(h.includes('data-id="s1"') && h.includes('data-id="s3"') && !h.includes('data-id="s2"') && !h.includes('data-id="s4"')); assert.ok(/2 submitted/.test(h) && !/<option[^>]*>OLD</.test(h));
  });
  await t('Marking: an open submission whose student was removed closes with a message (no broken modal)', async () => {
    const B = mkT(); B.T.showTab('mark'); B.T.MK.sel = 's2'; B.T.MK.open = true; B.T.renderMark(); assert.ok(!B.T.MK.open && /no longer available/.test(B.toast()));
  });
  await t('Dashboard: attempts, averages, classes and charts only from live students (tester still left out); nothing left -> no fake numbers', async () => {
    const B = mkT(); B.T.showTab('dash'); let h = B.el('v-dash').innerHTML; assert.ok(!/>OLD</.test(h), 'deleted class gone'); assert.ok(h.includes('67PM'));
    const C = boot({ hooks: HOOKS }); C.T.setRoster([]); C.T.setAtt([att('x1', 'gone@x.com', 'OLD')]); C.T.showTab('dash'); h = C.el('v-dash').innerHTML; assert.ok(!/>OLD</.test(h) && !h.includes('gone@x.com') && !/Cherry/.test(h));
  });
  await t('Admin › Users: "Clean up data of deleted students" previews first, deletes one email after a confirm', async () => {
    const B = boot({ hooks: 'get AD(){return AD}' }); const AD = B.T.AD; AD.sub = 'users'; AD.locked = false; AD.ver = 'x'; AD.users = []; B.T.showTab('admin');
    assert.ok(B.el('v-admin').innerHTML.includes('data-act="ad-orph-prev"')); B.W.calls.length = 0;
    B.W.reply = (u, o) => (/admin\/orphans/.test(u) ? (JSON.parse(o.body).op === 'preview' ? { status: 200, body: { ok: true, scanned: 3, orphans: [{ email: 'gone@x.com', attempts: 2, names: ['Cherry'], classes: ['OLD'] }] } } : { status: 200, body: { ok: true } }) : { status: 200, body: { ok: true } });
    B.press({ act: 'ad-orph-prev' }); await B.flush(); assert.ok(B.el('v-admin').innerHTML.includes('data-email="gone@x.com"')); assert.strictEqual(JSON.parse(B.W.calls[0].opt.body).op, 'preview');
    B.W.confirm = () => false; B.press({ act: 'ad-orph-del', email: 'gone@x.com' }); await B.flush(); assert.strictEqual(B.W.calls.length, 1, 'cancel = no request');
    B.W.confirm = () => true; B.press({ act: 'ad-orph-del', email: 'gone@x.com' }); await B.flush(); const b = JSON.parse(B.W.calls[1].opt.body); assert.deepStrictEqual([b.op, b.email], ['purge', 'gone@x.com']); assert.ok(!B.el('v-admin').innerHTML.includes('data-email="gone@x.com"'));
  });

  // ---------- class cover editor ----------
  await t('cover: card and editor use the same renderer and position; zoom / reset / cancel / save; remove clears the position', async () => {
    const B = boot({ hooks: 'coverImgHTML:coverImgHTML,covPos:covPos,classCfg:classCfg,classCard:classCard,get CE(){return CE},setCE:function(v){CE=v},setCur:function(c){AG.cur=c},settingsHTML:settingsHTML,setClasses:function(c){classDocs=c}' });
    const img = 'data:image/jpeg;base64,AAAA'; B.T.setClasses([{ docId: '7h30', cls: '7h30', cover: img, coverPos: { x: 20, y: 70, z: 1.5 } }]);
    assert.ok(B.T.classCard('7h30').includes('object-position:20% 70%;transform:scale(1.5);transform-origin:20% 70%'));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(B.T.covPos({ x: 500, y: -3, z: 9 }))), { x: 100, y: 0, z: 3 }); assert.deepStrictEqual(JSON.parse(JSON.stringify(B.T.covPos(null))), { x: 50, y: 50, z: 1 }, 'old covers: centred');
    B.T.setCur('7h30'); B.press({ act: 'ce-open' }); assert.ok(B.T.CE && B.T.CE.x === 20); assert.ok(B.T.settingsHTML('7h30').includes('id="ceBox"') && B.T.settingsHTML('7h30').includes('id="ceZoom"'));
    B.press({ act: 'ce-zoom', d: '0.1' }); assert.strictEqual(Math.round(B.T.CE.z * 10), 16); B.press({ act: 'ce-reset' }); assert.deepStrictEqual([B.T.CE.x, B.T.CE.y, B.T.CE.z], [50, 50, 1]);
    B.press({ act: 'ce-cancel' }); assert.strictEqual(B.T.CE, null); assert.strictEqual(B.T.classCfg('7h30').coverPos.x, 20, 'cancel keeps the saved position');
    B.T.setCur('7h30'); B.press({ act: 'ce-open' }); B.T.CE.x = 80; B.press({ act: 'ce-save' }); assert.strictEqual(B.T.classCfg('7h30').coverPos.x, 80); assert.ok(B.T.classCard('7h30').includes('object-position:80% 70%'));
    B.T.setCur('7h30'); B.press({ act: 'cs-covclr' }); const c = B.T.classCfg('7h30'); assert.ok(!c.cover && c.coverPos === null);
    assert.ok(/\.chead\{position:relative;display:block;height:124px/.test(html), 'cover a little taller (104 -> 124 px)');
  });

  // ---------- Create ----------
  await t('Create: the only Add button is at the top of "Pick a free slot"; previews draw none; disabled until a valid lesson + slot', async () => {
    assert.ok(/<div class="cpslhd"><h3>Pick a free slot<\/h3><div id="cpAddTop"><\/div><\/div>/.test(html)); assert.ok(/function addBarHTML\(\)\{return ''\}/.test(html));
    const B = boot({ hooks: 'renderAddTop:renderAddTop,get CP(){return CP}' }); B.T.showTab('create'); B.T.renderAddTop(); assert.ok(/data-act="add-ex" type="button" disabled/.test(B.el('cpAddTop').innerHTML));
  });
  await t('Create: Hide editor / Show editor is a class switch only (no redraw, no AI call); Easy / Medium / Hard above the reading preview changes the preview only', async () => {
    assert.ok(/\.create\.cpwide>#cpEditor\{display:none\}/.test(html) && /if\(a==='cp-wide'\)\{CP\.wide=!CP\.wide;cpWideSync\(\)/.test(html));
    assert.ok(/if\(a==='cp-lv'\)\{if\(!\(U&&U\.role==='teacher'\)\)return;RM_TLV=t\.dataset\.v;return renderPrev\(\)\}/.test(html), 'local preview only');
    const B = boot({ hooks: 'cpLvHTML:cpLvHTML,get RD(){return RD}' }); B.T.RD.lv = { easy: { st: 'ok', rl: { title: 'E' } } }; const h = B.T.cpLvHTML();
    assert.ok(/data-v="easy"[^>]*>Easy</.test(h) && /data-v="hard"[^>]*disabled/.test(h) && /Nothing is saved/.test(h));
  });
  // ---------- Reading header ----------
  await t('Reading: one header (back, title, "Cam · Test · Reading" | step menu, timer, settings) + progress bar; level, text size, demo inside settings; no "Selected excerpts"', async () => {
    const HR = 'parseReading:parseReading,EXAMPLE_R:EXAMPLE_R,renderRLesson:renderRLesson,get RM(){return RM},rmHeadHTML:rmHeadHTML,rmToolsHTML:rmToolsHTML';
    const B = boot({ hooks: HR }), r = B.T.parseReading(JSON.parse(B.T.EXAMPLE_R)); B.T.renderRLesson({ id: 'r1', skill: 'reading', title: 'Cycling in the City', kind: 'reading-ms', rl: r.data.rlesson, qs: r.data.qs }, '', '', null);
    let h = B.el('libBody').innerHTML; assert.ok(/<div class="rmhd2">[\s\S]*<h2>Cycling in the City<\/h2><p>Cam 14 · Test 1 · Reading<\/p>/.test(h) && h.includes('data-act="nav" data-book="cam14"'));
    assert.ok(/<select class="rmstepsel" id="rmStepSel"><option value="0" selected>Step 1\/4 · Deep reading<\/option><option value="1" disabled>/.test(h) && h.includes('id="rmTimer"') && h.includes('aria-label="Lesson settings (level, text size)"'));
    assert.ok(/class="rmprog"[^>]*aria-valuenow="0"[^>]*><span style="width:0%">/.test(h) && !/Selected excerpts|lsbar/.test(h) && !h.includes('id="dmBar"'), 'demo only inside the settings panel');
    B.T.RM.chk[0] = 1; B.T.RM.st = 1; assert.ok(/aria-valuenow="1"[^>]*><span style="width:25%">/.test(B.T.rmHeadHTML()), 'progress from real state');
    B.T.RM.fsOpen = true; h = B.T.rmToolsHTML(); assert.ok(h.includes('role="dialog" aria-label="Lesson settings"') && h.includes('data-act="rm-fsv"') && h.includes('id="dmBar"'), 'teacher: demo in settings');
    const S = boot({ hooks: HR, user: { name: 'S', email: 's@x.com', role: 'student', cls: 'A' } }), r2 = S.T.parseReading(JSON.parse(S.T.EXAMPLE_R)); S.T.renderRLesson({ id: 'rm1', skill: 'reading', title: 'x', kind: 'reading-ms', rl: r2.data.rlesson, qs: r2.data.qs }, '', '', null); S.T.RM.fsOpen = true;
    assert.ok(!S.T.rmToolsHTML().includes('id="dmBar"'), 'no demo helper for a real student');
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
