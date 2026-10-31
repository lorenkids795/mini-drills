// Homework Assistant: server scope checks (/api/hwa/*, real server code with a fake KV + fake Firestore) and the client
// workspace (real app code, tests/app-harness.js): tab, report text, follow-up rules. No network. Run: node tests/hw-assistant.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const DAY = 864e5, now = Date.now();

// ---------- server ----------
function server() {
  const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest');
  const KV = {}, DB = { roster: {}, assignments: {}, attempts: {}, hwdone: {}, passes: {}, classes: {}, hwnotes: {} };
  const env = { MD_KV: { get: async (k, ty) => (k in KV ? (ty === 'json' ? JSON.parse(KV[k]) : KV[k]) : null), put: async (k, v) => { KV[k] = v; }, delete: async (k) => { delete KV[k]; } } };
  const ctx = vm.createContext({ console: { log() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; this.headers = (o && o.headers) || {}; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, Date, Math, JSON, Uint8Array, ArrayBuffer });
  vm.runInContext(SRC + `;this.T={hwaData,hwaAsg,hwaNote,hwaStatus,roleOf};
    var WHO=null;idUser=async function(){return WHO};this.setWho=function(w){WHO=w};
    var DB=null;this.setDB=function(d){DB=d};
    fsGet=async function(env,col,id){var c=DB[col]||{};return c[id]?{data:c[id],updateTime:'t'}:null};
    fsList=async function(env,col){var c=DB[col]||{};return Object.keys(c).map(function(k){return Object.assign({id:k},c[k])})};
    fsQueryDocs=async function(env,col,f,v){var c=DB[col]||{};return Object.keys(c).map(function(k){return Object.assign({id:k},c[k])}).filter(function(d){return d[f]===v})};
    fsPut=async function(env,col,id,o){(DB[col]=DB[col]||{})[id]=o};
    fsDelete=async function(env,col,id){delete (DB[col]||{})[id]};`, ctx);
  ctx.setDB(DB);
  const call = async (fn, body) => { const r = await ctx.T[fn](env, {}, body || {}); return { status: r.status, d: JSON.parse(r.body) }; };
  return { ctx, KV, DB, env, call };
}
function seed(S) {
  S.KV.assist = JSON.stringify({ 'as@x.com': { name: 'Anh Tuan', classes: ['7h30'] } });
  Object.assign(S.DB.roster, {
    'lan@x.com': { email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' },
    'minh@x.com': { email: 'minh@x.com', name: 'Minh', cls: '7h30', role: 'student' },
    'tst@x.com': { email: 'tst@x.com', name: 'Tester', cls: '7h30', role: 'student', tester: true },
    'gone@x.com': { email: 'gone@x.com', name: 'Gone', cls: '7h30', role: 'student' },
    'hoa@x.com': { email: 'hoa@x.com', name: 'Hoa', cls: '9h', role: 'student' },
  });
  S.DB.classes['7h30'] = { removed: ['gone@x.com'] };
  Object.assign(S.DB.assignments, {
    a1: { cls: '7h30', name: 'HW A1', start: now - 9 * DAY, due: now - 2 * DAY, ex: ['l1'] },
    a2: { cls: '7h30', name: 'HW A2', start: now - 3 * DAY, due: now + 2 * DAY, ex: [], type: 'external', link: 'https://f.example.com/x' },
    b1: { cls: '9h', name: 'HW B1', start: now - 9 * DAY, due: now - 2 * DAY, ex: ['l1'] },
  });
  Object.assign(S.DB.attempts, {
    t1: { email: 'lan@x.com', cls: '7h30', ex: 'l1', ts: now - 5 * DAY }, // on time
    t2: { email: 'hoa@x.com', cls: '9h', ex: 'l1', ts: now - 5 * DAY },
  });
  S.DB.hwdone.h1 = { email: 'minh@x.com', asgId: 'a2', shot: { id: 'a'.repeat(22), url: '/api/image/' + 'a'.repeat(22), ts: now - DAY } };
  S.ctx.setWho({ em: 'as@x.com', role: 'assistant' });
}

(async () => {
  await t('server: roleOf gives the assistant role (never student); only the assistant role opens /api/hwa', async () => {
    const S = server(); seed(S); const r = await S.ctx.T.roleOf(S.env, 'as@x.com'); assert.ok(r && r.role === 'assistant' && !r.adm);
    S.ctx.setWho({ em: 'lan@x.com', role: 'student' }); assert.strictEqual((await S.call('hwaData')).status, 403);
    S.ctx.setWho({ em: 't@x.com', role: 'teacher' }); assert.strictEqual((await S.call('hwaData')).status, 403);
    S.ctx.setWho(null); assert.strictEqual((await S.call('hwaData')).status, 401);
  });
  await t('server: data = only the allowed classes; no emails; testers and removed students left out; statuses', async () => {
    const S = server(); seed(S); const { status, d } = await S.call('hwaData', { days: 60 });
    assert.strictEqual(status, 200); assert.deepStrictEqual(d.classes, ['7h30']);
    assert.deepStrictEqual(d.students.map((s) => s.name).sort(), ['Lan', 'Minh'], 'no tester, no removed, no other class');
    assert.ok(!JSON.stringify(d).includes('@x.com'), 'no email anywhere in the reply');
    assert.deepStrictEqual(d.assignments.map((a) => a.id).sort(), ['a1', 'a2'], 'other class hidden');
    const k = {}; d.students.forEach((s) => { k[s.name] = s.key; });
    assert.strictEqual(d.status.a1[k.Lan].st, 'done'); assert.strictEqual(d.status.a1[k.Minh].st, 'missing');
    assert.strictEqual(d.status.a2[k.Minh].st, 'done'); assert.strictEqual(d.status.a2[k.Lan].st, 'pending');
  });
  await t('server: statuses = on time / late / missing / pending / extended by a late pass', () => {
    const S = server(), st = S.ctx.T.hwaStatus, a = { start: 0, due: 1000, ex: ['l1'] };
    assert.strictEqual(st(a, [{ ex: 'l1', ts: 900 }], null, null, 2000).st, 'done');
    assert.strictEqual(st(a, [{ ex: 'l1', ts: 1500 }], null, null, 2000).st, 'late');
    assert.strictEqual(st(a, [], null, null, 2000).st, 'missing');
    assert.strictEqual(st(a, [], null, null, 500).st, 'pending');
    const e = st(a, [], null, { kind: 'day' }, 2000); assert.ok(e.st === 'pending' && e.ext, 'extension moves the deadline');
    assert.strictEqual(st({ start: 0, due: 1000, type: 'external' }, [], { shot: { ts: 800 } }, null, 2000).st, 'done');
  });
  await t('server: assignments only for own classes (forged class refused, other class assignment refused); cancel', async () => {
    const S = server(); seed(S); const rec = { cls: '9h', name: 'x', start: now, due: now + DAY, ex: ['l1'] };
    assert.strictEqual((await S.call('hwaAsg', { op: 'save', rec })).status, 403, 'forged class');
    assert.strictEqual((await S.call('hwaAsg', { op: 'save', id: 'b1', rec: Object.assign({}, rec, { cls: '7h30' }) })).status, 403, 'moving another class assignment');
    assert.strictEqual((await S.call('hwaAsg', { op: 'cancel', id: 'b1' })).status, 403);
    const ok = await S.call('hwaAsg', { op: 'save', rec: Object.assign({}, rec, { cls: '7h30' }) }); assert.strictEqual(ok.status, 200);
    assert.strictEqual((await S.call('hwaAsg', { op: 'save', rec: { cls: '7h30', start: now, due: now + DAY, type: 'external', link: 'javascript:alert(1)' } })).status, 400);
    assert.strictEqual((await S.call('hwaAsg', { op: 'cancel', id: 'a1' })).status, 200); assert.ok(!S.DB.assignments.a1);
  });
  await t('server: revoking a class / removing / pausing works at once (next call)', async () => {
    const S = server(); seed(S); S.KV.assist = JSON.stringify({ 'as@x.com': { name: 'A', classes: [] } });
    let r = await S.call('hwaData'); assert.ok(r.status === 200 && !r.d.students.length && !r.d.assignments.length);
    S.KV.assist = JSON.stringify({}); assert.strictEqual((await S.call('hwaData')).status, 403, 'removed');
    seed(S); S.KV['off:as@x.com'] = 'off'; assert.strictEqual((await S.call('hwaData')).status, 403, 'paused');
  });
  await t('server: notes only for students of own classes; follow-up status kept; stored by the server', async () => {
    const S = server(); seed(S); const d = (await S.call('hwaData')).d, lan = d.students.find((s) => s.name === 'Lan').key;
    assert.strictEqual((await S.call('hwaNote', { key: 'kforged', text: 'x' })).status, 403);
    let r = await S.call('hwaNote', { key: lan, status: 'sent', text: 'Messaged on Zalo' });
    const NK = Object.keys(S.DB.hwnotes); assert.ok(r.status === 200 && r.d.status === 'sent' && r.d.notes.length === 1 && NK.length === 1 && S.DB.hwnotes[NK[0]].email === 'lan@x.com' && S.DB.hwnotes[NK[0]].notes[0].t === 'Messaged on Zalo');
    r = await S.call('hwaNote', { key: lan, status: 'bogus' }); assert.ok(r.d.status === 'sent', 'unknown status ignored');
  });

  // ---------- client ----------
  const HOOKS = 'get HWA(){return HWA},hwaReport:hwaReport,hwaWatch:hwaWatch,renderHwa:renderHwa,tabsFor:tabsFor,adMenuItems:adMenuItems';
  const DATA = () => ({ me: { name: 'A' }, classes: ['7h30'], now, from: now - 60 * DAY,
    students: [{ key: 'k1', name: 'Nguyễn An', cls: '7h30' }, { key: 'k2', name: 'Bùi Bình', cls: '7h30' }, { key: 'k3', name: 'Chi', cls: '7h30' }],
    assignments: [{ id: 'a1', cls: '7h30', name: 'HW SUN 01.11', start: now - 9 * DAY, due: now - DAY, type: 'mini', ex: ['l1'] }, { id: 'a2', cls: '7h30', name: 'HW WED', start: now - DAY, due: now + DAY, type: 'mini', ex: ['l1'] }],
    status: { a1: { k1: { st: 'missing', due: now - DAY }, k2: { st: 'missing', due: now - DAY }, k3: { st: 'done', at: now - 2 * DAY, due: now - DAY } }, a2: { k1: { st: 'pending', due: now + DAY }, k2: { st: 'done', at: now, due: now + DAY }, k3: { st: 'pending', due: now + DAY } } },
    notes: {} });
  const asst = () => boot({ hooks: HOOKS, user: { name: 'Anh Tuan', email: 'as@x.com', role: 'assistant' } });
  await t('client: assistant gets only the Homework tab', () => {
    const B = asst(); assert.strictEqual(JSON.stringify(B.T.tabsFor().map((x) => x[0])), '["hwa"]');
  });
  await t('client: copy report = exact owner wording, sorted names, nothing private', () => {
    const B = asst(); B.T.HWA.data = DATA(); const R = B.T.hwaReport('a1', 'overdue');
    assert.strictEqual(R.text, 'LỚP 7H30 — HW SUN 01.11\n\nDanh sách các bạn còn thiếu bài:\n1. Bùi Bình\n2. Nguyễn An\n\nNếu có gặp vấn đề gì trong quá trình làm bài, các bạn nhắn anh nhé.');
    assert.ok(!/@|Band|note/i.test(R.text));
    const M = B.T.hwaReport('a2', 'reminder'); assert.ok(M.text.includes('Nhắc trước hạn nộp') && M.text.includes('1. Chi\n2. Nguyễn An') && !M.text.includes('Danh sách các bạn còn thiếu bài:'), 'reminder mode is separate');
    const D2 = DATA(); D2.status.a1.k1.st = 'done'; D2.status.a1.k2.st = 'late'; B.T.HWA.data = D2; assert.ok(B.T.hwaReport('a1', 'overdue').empty, 'empty state');
  });
  await t('client: follow-up label from the last 4 due assignments; honest when history is short', () => {
    const B = asst(), D = DATA(); D.assignments = []; D.status = {};
    for (let i = 0; i < 5; i++) { const id = 'x' + i; D.assignments.push({ id, cls: '7h30', name: id, start: now - (20 - i) * DAY, due: now - (10 - i) * DAY, type: 'mini', ex: ['l1'] }); D.status[id] = { k1: { st: i >= 2 ? 'missing' : 'done', due: now - (10 - i) * DAY }, k2: { st: i % 2 ? 'late' : 'done', at: 1, due: now - (10 - i) * DAY }, k3: { st: 'done', at: 1, due: now - (10 - i) * DAY } }; }
    B.T.HWA.data = D; const w = (k) => B.T.hwaWatch(D.students.find((s) => s.key === k)).lab;
    assert.strictEqual(w('k1'), 'attention'); assert.strictEqual(w('k2'), 'watch'); assert.strictEqual(w('k3'), 'ok');
    D.assignments = D.assignments.slice(0, 2); assert.strictEqual(w('k1'), 'history');
  });
  await t('client: workspace renders without emails; Admin menu for an assistant = Change password only', () => {
    const B = asst(); B.T.HWA.data = DATA(); B.T.renderHwa(); const h = B.el('v-hwa').innerHTML;
    assert.ok(h.includes('Homework &amp; Student Progress') && h.includes('data-act="hwa-view"') && !h.includes('@x.com'));
    const A = boot({ hooks: HOOKS }); assert.strictEqual(JSON.stringify(A.T.adMenuItems({ email: 'as@x.com', role: 'assistant', status: 'active' }, 'users').map((x) => x[0])), '["ad-pw"]');
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
