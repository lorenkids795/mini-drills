// Owner rule for Dashboard + Marking (real students / testers / staff / removed / unknown, current class), readable titles,
// and the class join link (code on the class, GET /api/join, signed-in check). Real app + server code, no network.
// Run: node tests/dash-join-mark.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'acctMap:acctMap,acctOfA:acctOfA,exName:exName,renderMark:renderMark,renderDash:renderDash,get MK(){return MK},get F(){return F},get AD(){return AD},' +
  'setRoster:function(r){rosterDocs=r},setAtt:function(a){attemptDocs=a},setClasses:function(c){classDocs=c},setCfgT:function(L){CFG.teachers=L},classCfg:classCfg,settingsHTML:settingsHTML,get AG(){return AG},joinCheck:joinCheck,setU:function(u){U=u},get UIA(){return UIA}';
const now = Date.now(), DAY = 864e5;
const ROSTER = [
  { email: 'an@x.com', name: 'An', cls: '67PM', role: 'student' },
  { email: 'binh@x.com', name: 'Binh', cls: '21h', role: 'student' },
  { email: 'tester@x.com', name: 'TESTER', cls: 'Test', role: 'student', tester: true },
  { email: 'cherry@x.com', name: 'Cherry', cls: 'Test', role: 'student', tester: true },
  { email: 'gone@x.com', name: 'Gone', cls: '67PM', role: 'student' },
];
const sub = (id, em, cls, extra) => Object.assign({ id, email: em, student: em.split('@')[0], cls, ex: 'w1', score: 0, total: 0, items: [], kind: 'submission', ts: now - DAY }, extra || {});
const ATT = [
  sub('s1', 'an@x.com', '67PM'), sub('s2', 'binh@x.com', '67PM' /* old label: Binh is in 21h now */, { grade: { overall: 6 } }),
  sub('s3', 'TESTER@x.com', '67PM' /* legacy tester submission under a real class, mixed-case email */), sub('s4', 'tester@x.com', '67PM'), sub('s5', 'cherry@x.com', 'Test'),
  sub('s6', 'gone@x.com', '67PM'), sub('s7', 'ghost@x.com', '67PM' /* no account any more */), sub('s8', 'seed@x.com', '67PM', { seeded: true }),
  sub('s9', 'lorenkids795@gmail.com', '67PM' /* staff */),
];
const admin = () => { const B = boot({ hooks: HOOKS }); B.T.setRoster(ROSTER); B.T.setAtt(ATT); B.T.setClasses([{ cls: '67PM', removed: ['gone@x.com'] }]); B.T.setCfgT(['lorenkids795@gmail.com']); return B; };
const cards = (h) => (h.match(/data-act="msel" data-id="(s\d+)"/g) || []).map((x) => x.replace(/.*"(s\d+)"/, '$1')).sort().join(',');
const counts = (h) => (h.match(/(\d+) submitted · (\d+) marked/) || []).slice(1).join('/');

(async () => {
  await t('owner rule: student / tester (any case, seeded) / staff / removed / unknown — from account records, not the name or class on the attempt', () => {
    const B = admin(), M = B.T.acctMap(), k = (id) => B.T.acctOfA(ATT.find((a) => a.id === id), M).k;
    assert.strictEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'].map(k).join(','), 'student,student,tester,tester,tester,removed,unknown,tester,staff');
    assert.strictEqual(B.T.acctOfA(ATT[1], M).cls, '21h', 'current class, not the old label');
  });
  await t('Marking All = real students only; counts = cards', () => {
    const B = admin(); B.T.MK.cls = 'all'; B.T.renderMark(); const h = B.el('v-mark').innerHTML;
    assert.strictEqual(cards(h), 's1,s2'); assert.strictEqual(counts(h), '2/1');
  });
  await t('Marking class = real students by their CURRENT class (a tester\'s old 67PM submission never leaks in)', () => {
    const B = admin(); B.T.MK.cls = '67PM'; B.T.renderMark(); let h = B.el('v-mark').innerHTML;
    assert.strictEqual(cards(h), 's1'); assert.strictEqual(counts(h), '1/0');
    B.T.MK.cls = '21h'; B.T.renderMark(); h = B.el('v-mark').innerHTML; assert.strictEqual(cards(h), 's2', 'Binh moved to 21h: shown there');
  });
  await t('Marking Tester accounts = every tester submission, whatever class the old record says; seeded samples too', () => {
    const B = admin(); B.T.MK.cls = '__tester'; B.T.renderMark(); const h = B.el('v-mark').innerHTML;
    assert.strictEqual(cards(h), 's3,s4,s5,s8'); assert.strictEqual(counts(h), '4/0'); assert.ok(h.includes('>Tester accounts</option>'));
    assert.ok(/<b>TESTER<\/b><small>Tester<\/small>/.test(h), 'name from the account, labelled Tester');
  });
  await t('an ordinary teacher (not admin) never sees tester submissions outside their classes', () => {
    const B = boot({ hooks: HOOKS, user: { name: 'Ms Lan', email: 'lan.t@x.com', role: 'teacher' } }); B.T.setRoster(ROSTER); B.T.setAtt(ATT); B.T.setClasses([{ cls: '67PM', removed: ['gone@x.com'] }]);
    B.T.MK.cls = '__tester'; B.T.renderMark(); const h = B.el('v-mark').innerHTML;
    assert.ok(!/s3|s4|s5/.test(cards(h)) && !h.includes('>Tester accounts</option>'), cards(h));
  });
  await t('switching filters repeatedly gives the same results (no stale cards or counts)', () => {
    const B = admin(), seen = [];
    ['all', '__tester', '67PM', 'all', '__tester'].forEach((c) => { B.T.MK.cls = c; B.T.renderMark(); seen.push(cards(B.el('v-mark').innerHTML)); });
    assert.deepStrictEqual(seen, ['s1,s2', 's3,s4,s5,s8', 's1', 's1,s2', 's3,s4,s5,s8']);
  });
  await t('Dashboard: All = real students only; "Tester accounts" scope shows tester attempts only; removed / unknown / staff never', () => {
    const B = admin(), sc = (id, em, cls, ex) => ({ id, email: em, student: 'x', cls, ex: ex || 'l1', score: 5, total: 10, items: [], ts: now - DAY });
    B.T.setAtt([sc('d1', 'an@x.com', '67PM'), sc('d2', 'TESTER@x.com', '67PM'), sc('d3', 'gone@x.com', '67PM'), sc('d4', 'ghost@x.com', '67PM'), sc('d5', 'an@x.com', '67PM', 'c_deadbeef')]);
    B.T.F.tab = 'students'; B.T.F.cls = 'all'; B.T.renderDash(); let h = B.el('v-dash').innerHTML;
    assert.ok(h.includes('>Tester accounts</option>') && !/Gone|ghost|TESTER/.test(h.replace(/Tester accounts/g, '')), 'only An');
    assert.ok(!/c_deadbeef/.test(h), 'no raw id'); assert.strictEqual(B.T.exName('c_deadbeef'), 'Removed exercise');
    B.T.F.cls = '__tester'; B.T.renderDash(); h = B.el('v-dash').innerHTML; assert.ok(/TESTER/.test(h) && !/>An</.test(h), 'tester scope');
  });
  await t('join code: a guessable name-based code is not used; "Create join link" saves a random 8-character code; link = this site', () => {
    const B = admin(); B.T.setClasses([{ cls: '67PM', docId: '67pm', code: 'ABCDEF' }]);
    assert.strictEqual(B.T.classCfg('67PM').code, '', 'old 6-character code ignored');
    let h = B.T.settingsHTML('67PM'); assert.ok(h.includes('data-act="cs-code"') && h.includes('>Create join link<') && !h.includes('minidrills.app'));
    B.T.AG.cur = '67PM'; B.press({ act: 'cs-code' }); const c = B.T.classCfg('67PM').code; assert.ok(/^[A-HJ-NP-Z2-9]{8}$/.test(c), c);
    h = B.T.settingsHTML('67PM'); assert.ok(h.includes('/?join=' + c + '"') && h.includes('>Copy link<') && h.includes('>New code<'));
    B.press({ act: 'cs-code' }); assert.ok(B.asking().includes('new join code'), 'a new code asks first'); B.cancel(); assert.strictEqual(B.T.classCfg('67PM').code, c);
  });
  await t('signed-in check (?join=CODE): own class / other class / staff / invalid — told, nothing written', async () => {
    const run = async (u, reply) => { const B = admin(); B.W.location.search = '?join=ABCDEFGH'; B.W.reply = () => reply; B.T.setU(u); B.T.joinCheck(); await B.flush(); return B; };
    const ok = { status: 200, body: { cls: '67PM', title: '67PM' } };
    let B = await run({ email: 'an@x.com', name: 'An', role: 'student', cls: '67PM' }, ok); assert.ok(/You are already in 67PM/.test(B.T.UIA.text));
    B = await run({ email: 'binh@x.com', name: 'Binh', role: 'student', cls: '21h' }, ok); assert.ok(/your account is in 21h\. Ask your teacher to move you/.test(B.T.UIA.text));
    B = await run({ email: 't@x.com', name: 'T', role: 'teacher', cls: '' }, ok); assert.ok(/signed in as staff/.test(B.T.UIA.text));
    B = await run({ email: 'an@x.com', name: 'An', role: 'student', cls: '67PM' }, { status: 404, body: { error: 'This join code does not match any class.' } }); assert.ok(/does not match/.test(B.T.UIA.text));
    assert.ok(!B.W.calls || !B.W.calls.some((c) => c.opt && c.opt.method === 'POST'), 'no write');
  });
  await t('server GET /api/join: format, unknown, archived, ok; rate limited', async () => {
    const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest').replace(/^import MDHW from .*$/m, () => fs.readFileSync(path.join(__dirname, '..', 'md-hw.js'), 'utf8'));
    const KV = {}, env = { MD_KV: { get: async (k) => (k in KV ? KV[k] : null), put: async (k, v) => { KV[k] = v; } } };
    const ctx = vm.createContext({ console: { log() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, Date, Math, JSON, Uint8Array, ArrayBuffer });
    vm.runInContext(SRC + ';this.T={joinLookup};var DOCS=[];this.setDocs=function(d){DOCS=d};fsQueryDocs=async function(e,col,f,v){return DOCS.filter(function(d){return d[f]===v})};', ctx);
    ctx.setDocs([{ cls: '67PM', title: '6/7 PM', code: 'ABCDEFGH' }, { cls: 'Old', code: 'ZZZZZZZZ', status: 'archived' }]);
    const go = async (code, ip) => { const r = await ctx.T.joinLookup(env, { headers: { get: (h) => (h === 'CF-Connecting-IP' ? ip || '1.1.1.1' : null) } }, new URL('https://x/api/join?code=' + code)); return { s: r.status, d: JSON.parse(r.body) }; };
    assert.strictEqual((await go('abc')).s, 400); assert.strictEqual((await go('QQQQQQQQ')).s, 404); assert.strictEqual((await go('ZZZZZZZZ')).s, 410);
    const r = await go('abcdefgh'); assert.ok(r.s === 200 && r.d.cls === '67PM' && r.d.title === '6/7 PM', JSON.stringify(r));
    for (let i = 0; i < 60; i++) await go('QQQQQQQQ', '9.9.9.9'); assert.strictEqual((await go('ABCDEFGH', '9.9.9.9')).s, 429);
  });
  await t('sign-in page: a join link keeps the code and opens "First time here?" with the class chosen (name still from the class list)', () => {
    const b = fs.readFileSync(path.join(ROOT, 'md-backend.js'), 'utf8');
    assert.ok(/sessionStorage\.setItem\('md-join', jcode\)/.test(b) && /fetch\(API \+ '\/join\?code='/.test(b) && /rClass\.value = d\.cls; fillNames\(\);/.test(b) && /already has an account\. Sign in/.test(b));
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
