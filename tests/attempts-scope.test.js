// D5 (11/2026): teachers read attempts by need instead of "the newest 500 of the whole centre".
// Live: last 60 days (no cap) + every Writing / Speaking submission (any age). Older: pages of 500 with a cursor, read when an
// older assignment is opened or "Load older work" is pressed. Students: all of their own attempts (no cap).
// Real app code + a fake Firestore (where / orderBy / startAfter / limit / onSnapshot / get) with 600+ attempts. No network.
// Run: node tests/attempts-scope.test.js
'use strict';
const assert = require('assert');
const { boot } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const DAY = 864e5, now = Date.now();

// ---- a tiny Firestore: enough for the app's Boot (snapshots of every collection) and the attempt queries
function fakeDb(DB) {
  const log = [];
  const snapOf = (rows) => ({ docs: rows.map(([id, d]) => ({ id, data: () => JSON.parse(JSON.stringify(d)), _id: id })), forEach(f) { this.docs.forEach(f); }, size: rows.length });
  function query(col, st) {
    st = st || { f: [], o: null, lim: 0, after: null };
    const run = () => {
      let rows = Object.entries(DB[col] || {});
      st.f.forEach(([k, op, v]) => { rows = rows.filter(([, d]) => (op === '==' ? d[k] === v : op === '>=' ? d[k] >= v : op === '<' ? d[k] < v : op === '<=' ? d[k] <= v : true)); });
      if (st.o) rows.sort((x, y) => (st.o[1] === 'desc' ? (y[1][st.o[0]] - x[1][st.o[0]]) : (x[1][st.o[0]] - y[1][st.o[0]])) || (x[0] < y[0] ? -1 : 1));
      if (st.after) { const i = rows.findIndex(([id]) => id === st.after._id); rows = rows.slice(i + 1); }
      if (st.lim) rows = rows.slice(0, st.lim);
      return rows;
    };
    const nx = (p) => query(col, Object.assign({}, st, p));
    return {
      where: (k, op, v) => nx({ f: st.f.concat([[k, op, v]]) }), orderBy: (k, d) => nx({ o: [k, d || 'asc'] }), limit: (n) => nx({ lim: n }), startAfter: (s) => nx({ after: s }),
      onSnapshot: (ok) => { log.push({ col, kind: 'live', st }); setTimeout(() => ok(snapOf(run())), 0); return () => {}; },
      get: () => { log.push({ col, kind: 'get', st }); return Promise.resolve(snapOf(run())); },
      doc: (id) => ({ id, onSnapshot: (ok) => { setTimeout(() => ok({ id, exists: !!(DB[col] || {})[id], data: () => (DB[col] || {})[id] }), 0); return () => {}; }, get: () => Promise.resolve({ id, exists: false, data: () => undefined }), set: () => Promise.resolve(), update: () => Promise.resolve(), delete: () => Promise.resolve() }),
      add: (d) => Promise.resolve({ id: 'new' }),
    };
  }
  return { log, collection: (c) => query(c), runTransaction: () => Promise.reject(new Error('no')), batch: () => ({ set() {}, update() {}, delete() {}, commit: () => Promise.resolve() }) };
}
const HOOKS = 'get attemptDocs(){return attemptDocs},get ATT(){return ATT},attNeed:attNeed,attCapHTML:attCapHTML,hwMatrixHTML:hwMatrixHTML,asgState:asgState,allAsgs:allAsgs';
// 30 students, 650 attempts in the last 60 days, an assignment 100 days ago with its 30 attempts, 1200 very old attempts,
// and one Writing submission 200 days ago that nobody has marked yet
function centre() {
  const DB = { roster: {}, attempts: {}, assignments: {} };
  for (let i = 0; i < 30; i++) DB.roster['s' + i + '@x.com'] = { email: 's' + i + '@x.com', name: 'Student ' + i, cls: '7h30', role: 'student' };
  for (let i = 0; i < 650; i++) DB.attempts['n' + i] = { email: 's' + (i % 30) + '@x.com', cls: '7h30', ex: 'l2', score: 4, total: 5, answered: 5, required: 5, ts: now - (i % 58) * DAY - i * 1000 };
  const OLD = { cls: '7h30', name: 'Old HW', start: now - 100 * DAY, due: now - 94 * DAY, ex: ['l1'] }; DB.assignments.old = OLD;
  for (let i = 0; i < 30; i++) DB.attempts['o' + i] = { email: 's' + i + '@x.com', cls: '7h30', ex: 'l1', score: 5, total: 5, answered: 5, required: 5, ts: now - 97 * DAY + i * 1000 };
  for (let i = 0; i < 1200; i++) DB.attempts['v' + i] = { email: 's' + (i % 30) + '@x.com', cls: '7h30', ex: 'r1', score: 1, total: 5, answered: 5, required: 5, ts: now - 150 * DAY - i * 60000 };
  DB.attempts.w0 = { email: 's3@x.com', cls: '7h30', ex: 'w1', kind: 'submission', score: 0, total: 0, text: 'An essay.', ts: now - 200 * DAY };
  return { DB, OLD: Object.assign({ id: 'old' }, OLD) };
}

(async () => {
  await t('teacher: 650 attempts of the last 60 days all load (no 500 cap); queries are single-field (no composite index)', async () => {
    const { DB } = centre(), db = fakeDb(DB), B = boot({ hooks: HOOKS, db }); await B.flush();
    const live = B.T.attemptDocs.filter((a) => a.ts >= now - 60 * DAY);
    assert.strictEqual(live.length, 650, 'every recent attempt'); assert.ok(B.T.attemptDocs.length < 700, 'older pages not read yet: ' + B.T.attemptDocs.length);
    const aq = db.log.filter((q) => q.col === 'attempts');
    assert.ok(aq.every((q) => q.st.lim !== 500 || q.kind === 'get'), 'no live query capped at 500');
    aq.forEach((q) => { const fields = q.st.f.map((f) => f[0]).concat(q.st.o ? [q.st.o[0]] : []); assert.ok(new Set(fields).size <= 1, 'one field per query: ' + fields.join()); });
    assert.ok(aq.some((q) => q.kind === 'live' && q.st.f.length === 1 && q.st.f[0][0] === 'ts' && q.st.f[0][1] === '>='), 'live window by ts');
  });
  await t('Marking never misses an unmarked submission, however old (200 days)', async () => {
    const { DB } = centre(), db = fakeDb(DB), B = boot({ hooks: HOOKS, db }); await B.flush();
    assert.ok(B.T.attemptDocs.some((a) => a.id === 'w0'), 'old submission loaded');
    assert.ok(db.log.some((q) => q.col === 'attempts' && q.kind === 'live' && q.st.f.length === 1 && q.st.f[0][0] === 'kind' && q.st.f[0][2] === 'submission'));
  });
  await t('an older assignment (100 days) is read on open: "Loading…" first, then the right statuses, no work lost', async () => {
    const { DB, OLD } = centre(), db = fakeDb(DB), B = boot({ hooks: HOOKS, db }); await B.flush();
    assert.strictEqual(B.T.asgState(OLD, 's5@x.com', now).st, 'missing', 'before the old page is read it would look missing');
    assert.ok(/Loading the work for this assignment/.test(B.T.hwMatrixHTML(OLD)));
    await B.flush(); await B.flush();
    assert.strictEqual(B.T.asgState(OLD, 's5@x.com', now).st, 'done'); assert.ok(!/Loading/.test(B.T.hwMatrixHTML(OLD)) && /Complete \(1\/1\)/.test(B.T.hwMatrixHTML(OLD)));
    const g = db.log.filter((q) => q.kind === 'get' && q.col === 'attempts'); assert.ok(g.length >= 1 && g.every((q) => q.st.lim === 500 && q.st.o[0] === 'ts' && q.st.o[1] === 'desc'));
  });
  await t('"Load older work" pages through 1200 more attempts with a cursor, no duplicates, then stops', async () => {
    const { DB } = centre(), db = fakeDb(DB), B = boot({ hooks: HOOKS, db }); await B.flush();
    assert.ok(/Load older work/.test(B.T.attCapHTML()));
    for (let k = 0; k < 6 && B.T.ATT.more; k++) { B.T.attNeed(0); await B.flush(); await B.flush(); }
    const ids = B.T.attemptDocs.map((a) => a.id);
    assert.strictEqual(ids.length, 650 + 30 + 1200 + 1, 'everything, once'); assert.strictEqual(new Set(ids).size, ids.length, 'no duplicates');
    assert.strictEqual(B.T.ATT.more, false); assert.strictEqual(B.T.attCapHTML(), '', 'nothing left to load');
    const pages = db.log.filter((q) => q.kind === 'get' && q.col === 'attempts'); assert.ok(pages.length >= 3 && pages.slice(1).every((q) => !!q.st.after), 'cursor after the first page');
  });
  await t('student: all of their own attempts (700), one equality query, no cap', async () => {
    const DB = { roster: { 'me@x.com': { email: 'me@x.com', name: 'Me', cls: '7h30', role: 'student' } }, attempts: {} };
    for (let i = 0; i < 700; i++) DB.attempts['m' + i] = { email: 'me@x.com', ex: 'l1', score: 5, total: 5, answered: 5, required: 5, ts: now - i * DAY };
    DB.attempts.other = { email: 'x@x.com', ex: 'l1', score: 5, total: 5, ts: now };
    const db = fakeDb(DB), B = boot({ hooks: HOOKS, db, user: { name: 'Me', email: 'me@x.com', role: 'student', cls: '7h30' } }); await B.flush();
    assert.strictEqual(B.T.attemptDocs.length, 700);
    const q = db.log.filter((x) => x.col === 'attempts'); assert.strictEqual(q.length, 1); assert.deepStrictEqual(q[0].st.f, [['email', '==', 'me@x.com']]); assert.strictEqual(q[0].st.lim, 0);
    assert.strictEqual(B.T.attCapHTML(), '', 'students never see the note');
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
})();
