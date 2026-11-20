// P-05 (owner decision 11/2026, option B): the FINAL submitted homework answers are kept 90 days, only for the teacher of that class
// (admin = documented exception), never past expiry (reads suppress it even when deletion is late), deleted automatically.
// dictation-server.js with a fake Firestore and a controllable clock. Run: node tests/dictation-retention.test.js
'use strict';
const assert = require('assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..'); let pass = 0, fail = 0; const T = [];
const t = (name, fn) => T.push([name, fn]);
const DAY = 864e5;
(async () => {
  const S = await import(pathToFileURL(path.join(ROOT, 'dictation-server.js')).href);
  const E = await import(pathToFileURL(path.join(ROOT, 'dictation', 'engine', 'index.js')).href);
  const BASE = fs.readFileSync(path.join(ROOT, 'dictation-lab', 'pkg', 'golden-tests-v1.1', 'baseline-harbour-museum.rev1.json'), 'utf8');
  const realNow = Date.now; let NOW = realNow(); Date.now = () => NOW; // the server's clock; the client never sends a time
  const kv = () => { const m = {}; return { get: async (k, ty) => (k in m ? (ty === 'json' ? JSON.parse(m[k]) : m[k]) : null), put: async (k, v) => { m[k] = v; }, m }; };
  function mk() {
    const db = {}; let tick = 0; const col = (c) => (db[c] = db[c] || {}); const ops = { breakRange: false };
    const D = {
      fsGet: async (env, c, id) => (col(c)[id] ? { data: JSON.parse(JSON.stringify(col(c)[id].data)), updateTime: col(c)[id].ut } : null),
      fsPut: async (env, c, id, o) => { col(c)[id] = { data: JSON.parse(JSON.stringify(o)), ut: 'u' + ++tick }; },
      fsCreate: async (env, c, id, o) => { if (col(c)[id]) return false; col(c)[id] = { data: JSON.parse(JSON.stringify(o)), ut: 'u' + ++tick }; return true; },
      fsUpdate: async (env, c, id, o, ut) => { const d = col(c)[id]; if (ut && (!d || d.ut !== ut)) return false; col(c)[id] = { data: Object.assign(d ? d.data : {}, JSON.parse(JSON.stringify(o))), ut: 'u' + ++tick }; return true; },
      fsDelete: async (env, c, id) => { delete col(c)[id]; },
      fsList: async (env, c) => Object.entries(col(c)).map(([id, d]) => Object.assign({ id }, d.data)),
      fsQueryDocs: async (env, c, f, v) => Object.entries(col(c)).filter(([, d]) => d.data[f] === v).map(([id, d]) => Object.assign({ id }, d.data)),
      fsQueryRange: async (env, c, f, lo, hi, lim) => { if (ops.breakRange) throw new Error('firestore query ' + c + ' 503'); return Object.entries(col(c)).filter(([, d]) => d.data[f] > lo && d.data[f] <= hi).slice(0, lim).map(([id, d]) => Object.assign({ id }, d.data)); },
      idUser: async (env, req) => req.user || null, staffEmail: async (env, req) => req.staff || '',
      rosterRow: async (env, em) => (col('roster')[em] ? { id: em, data: col('roster')[em].data } : null),
      normEmail: (e) => String(e || '').trim().toLowerCase(), slug: (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      json: (data, status) => ({ status: status || 200, data }), fail: (msg, status) => ({ status: status || 400, data: { error: msg } }), adminEmail: () => 'admin@x.test',
      teacherName: async (env, em) => ({ 'lan@x.test': 'Lan Nguyễn', 'minh@x.test': 'Minh' })[em] || '',
    };
    return { D, db, ops };
  }
  const ADM = { staff: 'admin@x.test' }, LAN = { staff: 'lan@x.test' }, MINH = { staff: 'minh@x.test' };
  const stu = (em) => ({ user: { em, role: 'student' } });
  const SECRET = 'zq-secret-answer-77'; // a recognisable raw answer, to search logs / scores / other rows for
  async function setup(on = true) {
    NOW = realNow(); const X = mk(); const env = { DL_RAW_RETENTION: on ? 'on' : '', MD_KV: kv() }; X.env = env;
    await X.D.fsPut(null, 'roster', 'a@x.test', { email: 'a@x.test', name: 'An <img src=x onerror=alert(1)>', cls: 'C1', teacher: 'Cô Lan Nguyen' });
    await X.D.fsPut(null, 'roster', 'b@x.test', { email: 'b@x.test', name: 'Binh', cls: 'C2', teacher: 'Thầy Minh' });
    const sv = await S.dlStaff(X.D, env, ADM, { op: 'save', title: 'Harbour', json: BASE }); X.lid = sv.data.lid;
    await S.dlAdmin(X.D, env, { op: 'approve', lid: X.lid, n: 1, mode: 'homework' }); X.exId = (await S.dlAdmin(X.D, env, { op: 'publish', lid: X.lid, bookId: 'cam21', testId: 't4', part: 2 })).data.exId;
    await X.D.fsPut(null, 'assignments', 'A1', { cls: 'C1', start: NOW - 3600e3, due: NOW + 30 * DAY, ex: ['c_' + X.exId] });
    await X.D.fsPut(null, 'assignments', 'A2', { cls: 'C2', start: NOW - 3600e3, due: NOW + 30 * DAY, ex: ['c_' + X.exId] });
    return X;
  }
  const hw = (X, em, asg, route, body) => S.dlHomework(X.D, X.env, stu(em), Object.assign({ exId: X.exId, asgId: asg }, body || {}), route);
  async function submit(X, em, asg, key) {
    const pl = (await hw(X, em, asg, 'payload')).data.payload; const cv = pl.contentVersion;
    await hw(X, em, asg, 'lock', { req: { contentVersion: cv, responses: Object.fromEntries(pl.lockOnContinue.map((id) => [id, { text: 'locked ' + id }])) } });
    const doc = JSON.parse(BASE); const l3 = doc.exercises.level3.items[0];
    const r = await hw(X, em, asg, 'submit', { req: { schema: E.SUBMISSION_SCHEMA, assignmentId: asg, contentVersion: cv, idempotencyKey: key || 'k1', responses: { [l3.id]: { answer: SECRET } } } });
    return { r, l3: l3.id, lockId: pl.lockOnContinue[0] };
  }
  const list = (X, who, body) => S.dlRaw(X.D, X.env, who, Object.assign({ op: 'list', exId: X.exId }, body || {}));
  const rawKey = (X) => Object.keys(X.db.dlRaw || {})[0];

  t('fail closed: with DL_RAW_RETENTION unset nothing raw is stored, and the phase-1 text is wiped at submit', async () => {
    const X = await setup(false); const { r } = await submit(X, 'a@x.test', 'A1'); assert.strictEqual(r.data.status, 'accepted');
    assert.strictEqual(Object.keys(X.db.dlRaw || {}).length, 0); assert.ok(!JSON.stringify(X.db).includes(SECRET), 'raw text nowhere');
    const sit = Object.values(X.db.dlSits)[0].data; assert.strictEqual(sit.lock, ''); assert.strictEqual(sit.rawExp, 0);
    const L = await list(X, LAN); assert.strictEqual(L.data.on, false); assert.strictEqual(L.data.rows[0].raw, 'not_kept'); assert.ok(!('answer' in L.data.rows[0].items[0]));
  });
  t('on: exactly the final answers (no drafts), server time, expiry = submittedAt + 90 days, separate from the score record', async () => {
    const X = await setup(); const t0 = NOW; const { r, l3, lockId } = await submit(X, 'a@x.test', 'A1'); assert.strictEqual(r.data.status, 'accepted');
    const d = X.db.dlRaw[rawKey(X)].data; assert.strictEqual(d.submittedAt, t0); assert.strictEqual(d.expMs, t0 + 90 * DAY); assert.strictEqual(d.expiresAt, new Date(t0 + 90 * DAY).toISOString());
    assert.strictEqual(d.answers[l3], SECRET); assert.strictEqual(d.answers[lockId], 'locked ' + lockId, 'the locked phase-1 answer, not a resend');
    assert.deepStrictEqual(Object.keys(d).sort(), ['answers', 'asg', 'cls', 'email', 'ex', 'expMs', 'expiresAt', 'submittedAt', 'ver'].sort());
    assert.ok(!JSON.stringify(X.db.dlSubs).includes(SECRET) && !JSON.stringify(X.db.attempts).includes(SECRET), 'scores never carry raw text');
    assert.ok(!JSON.stringify(X.db.dlSits).includes(SECRET) && Object.values(X.db.dlSits)[0].data.lock === '', 'no second copy in the sitting');
  });
  t('a duplicate / retried submit a day later neither re-scores nor resets the 90-day clock', async () => {
    const X = await setup(); const t0 = NOW; await submit(X, 'a@x.test', 'A1'); NOW += DAY;
    const pl = (await hw(X, 'a@x.test', 'A1', 'payload')).data; assert.strictEqual(pl.submitted, true);
    const again = await hw(X, 'a@x.test', 'A1', 'submit', { req: { schema: E.SUBMISSION_SCHEMA, assignmentId: 'A1', contentVersion: X.lid + '@1', idempotencyKey: 'k9', responses: {} } });
    assert.strictEqual(again.data.status, 'duplicate'); assert.strictEqual(X.db.dlRaw[rawKey(X)].data.expMs, t0 + 90 * DAY); assert.strictEqual(Object.keys(X.db.attempts).length, 1);
  });
  t('boundary: the class teacher sees the answer at 89 days and 1 ms before expiry; at expiry and after: "expired", deleted, score kept', async () => {
    const X = await setup(); const t0 = NOW; await submit(X, 'a@x.test', 'A1');
    NOW = t0 + 89 * DAY; let L = await list(X, LAN); assert.strictEqual(L.data.rows[0].raw, 'kept'); assert.ok(L.data.rows[0].items.some((i) => i.answer === SECRET));
    NOW = t0 + 90 * DAY - 1; L = await list(X, LAN); assert.strictEqual(L.data.rows[0].raw, 'kept');
    NOW = t0 + 90 * DAY; L = await list(X, LAN); assert.strictEqual(L.data.rows[0].raw, 'expired'); assert.ok(!JSON.stringify(L.data).includes(SECRET)); assert.strictEqual(Object.keys(X.db.dlRaw).length, 0, 'deleted on read');
    assert.ok(L.data.rows[0].score && L.data.rows[0].items.length > 0, 'score and per-item result remain'); assert.strictEqual(Object.keys(X.db.attempts).length, 1);
    NOW = t0 + 120 * DAY; L = await list(X, LAN); assert.strictEqual(L.data.rows[0].raw, 'expired');
  });
  t('authorization on every request: other-class teacher, assistant / student / no key, removed teacher', async () => {
    const X = await setup(); await submit(X, 'a@x.test', 'A1');
    const M = await list(X, MINH); assert.strictEqual(M.data.rows.length, 0); assert.strictEqual(M.data.hidden, 1); assert.ok(!JSON.stringify(M.data).includes(SECRET));
    assert.strictEqual((await list(X, {})).status, 401, 'no staff key (students, assistants, signed out)');
    assert.strictEqual((await list(X, { user: { em: 'h@x.test', role: 'assistant' } })).status, 401);
    assert.strictEqual((await list(X, { staff: 'new@x.test' })).data.rows.length, 0, 'a teacher with no name in the roster sees nothing');
    assert.strictEqual((await list(X, ADM)).data.rows.length, 1, 'admin: the documented exception');
  });
  t('scope changes take effect at once: kicked, moved class, removed from class, assignment moved or exercise dropped', async () => {
    const cases = [
      ['kicked', (X) => X.D.fsDelete(null, 'roster', 'a@x.test')],
      ['moved class', (X) => X.D.fsUpdate(null, 'roster', 'a@x.test', { cls: 'C2' })],
      ['removed from class', (X) => X.D.fsPut(null, 'classes', 'c1', { removed: ['A@x.test'] })],
      ['assignment moved', (X) => X.D.fsUpdate(null, 'assignments', 'A1', { cls: 'C2' })],
      ['exercise dropped', (X) => X.D.fsUpdate(null, 'assignments', 'A1', { ex: [] })],
      ['teacher of the class changed', (X) => X.D.fsUpdate(null, 'roster', 'a@x.test', { teacher: 'Thầy Minh' })],
    ];
    for (const [name, change] of cases) { const X = await setup(); await submit(X, 'a@x.test', 'A1'); assert.strictEqual((await list(X, LAN)).data.rows.length, 1, name + ' (before)'); await change(X);
      const L = await list(X, LAN); assert.strictEqual(L.data.rows.length, 0, name); assert.ok(!JSON.stringify(L.data).includes(SECRET), name); }
  });
  t('client-supplied ids are ignored: email / class / asg in the body cannot widen the list', async () => {
    const X = await setup(); await submit(X, 'a@x.test', 'A1'); await submit(X, 'b@x.test', 'A2');
    const L = await list(X, MINH, { email: 'a@x.test', cls: 'C1', asg: 'A1', teacher: 'Lan Nguyen' }); assert.strictEqual(L.data.rows.length, 1); assert.strictEqual(L.data.rows[0].cls, 'C2'); assert.strictEqual(L.data.rows[0].name, 'Binh');
    assert.strictEqual((await list(X, LAN, { exId: '../dlRaw' })).status, 400);
  });
  t('automatic deletion: bounded batches, idempotent, sittings wiped, live rows kept, reads suppressed while deletion fails', async () => {
    const X = await setup(); const t0 = NOW; await submit(X, 'a@x.test', 'A1'); NOW = t0 + 10 * DAY; await submit(X, 'b@x.test', 'A2');
    for (let i = 0; i < 5; i++) await X.D.fsPut(null, 'dlRaw', 'old' + i, { email: 'z@x.test', expMs: t0 - i - 1, answers: { x: SECRET } });
    await X.D.fsPut(null, 'dlSits', 'abandoned', { email: 'z@x.test', lock: '{"as-001":{"text":"' + SECRET + '"}}', rawExp: t0 - 5 });
    NOW = t0 + 90 * DAY; let o = await S.dlReap(X.D, X.env, 3); assert.strictEqual(o.raw, 3); assert.strictEqual(o.sits, 1); assert.strictEqual(o.more, true, 'bounded');
    o = await S.dlReap(X.D, X.env, 3); assert.strictEqual(o.raw, 3); assert.strictEqual(o.sits, 0);
    o = await S.dlReap(X.D, X.env, 3); assert.strictEqual(o.raw, 0); assert.strictEqual(o.sits, 0, 'idempotent');
    assert.deepStrictEqual(Object.keys(X.db.dlRaw).length, 1, 'only the row of the later submission (day 10) is left'); assert.strictEqual(X.db.dlSits.abandoned.data.lock, '');
    assert.strictEqual(Object.keys(X.db.attempts).length, 2, 'grades untouched'); assert.strictEqual(Object.keys(X.db.dlSubs).length, 2);
    // failing cleanup: recorded (message only), and reads still never show an expired row
    NOW = t0 + 101 * DAY; X.ops.breakRange = true; S._resetReapClock(); const f = await S.dlReapMaybe(X.D, X.env);
    assert.ok(f.err && !f.err.includes(SECRET)); assert.ok(X.env.MD_KV.m['dlreap:last'].includes('503'));
    const L = await list(X, MINH); assert.strictEqual(L.data.rows[0].raw, 'expired'); assert.ok(!JSON.stringify(L.data).includes(SECRET));
    X.ops.breakRange = false; S._resetReapClock(); assert.ok(await S.dlReapMaybe(X.D, X.env), 'a failed run is retried at the next chance');
    S._resetReapClock(); assert.strictEqual(await S.dlReapMaybe(X.D, X.env), null, 'otherwise at most once an hour');
  });
  t('manual reaper (admin) and retention status', async () => {
    const X = await setup(); await X.D.fsPut(null, 'dlRaw', 'old', { email: 'z@x.test', expMs: NOW - 1, answers: {} });
    const r = await S.dlAdmin(X.D, X.env, { op: 'reap' }); assert.strictEqual(r.status, 200); assert.strictEqual(r.data.raw, 1);
    const st = await S.dlAdmin(X.D, X.env, { op: 'retention' }); assert.strictEqual(st.data.on, true); assert.strictEqual(st.data.days, 90); assert.strictEqual(st.data.last.raw, 1);
  });
  t('raw answers never reach logs: console output during a full flow contains none of them', async () => {
    const seen = []; const keep = [console.log, console.error, console.warn]; console.log = console.error = console.warn = (...a) => seen.push(a.join(' '));
    try { const X = await setup(); await submit(X, 'a@x.test', 'A1'); await list(X, LAN); NOW += 91 * DAY; await S.dlReap(X.D, X.env); await list(X, LAN); } finally { [console.log, console.error, console.warn] = keep; }
    assert.ok(!seen.join('\n').includes(SECRET));
  });
  t('wiring: route, status-driven cleanup, Kick purge, timestamp for an optional Firestore TTL policy, no raw in URLs', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8');
    assert.ok(src.includes("route === 'dictation/raw'") && src.includes('dlReapMaybe(dlDeps(), env)'));
    assert.ok(/PURGE_COLS = \[[^\]]*'dlSits', 'dlSubs', 'dlRaw'/.test(src), 'Kick deletes the dictation data too');
    assert.ok(src.includes('if (v instanceof Date) return { timestampValue'));
    const srv = fs.readFileSync(path.join(ROOT, 'dictation-server.js'), 'utf8'); assert.ok(!/console\.(log|error|warn)/.test(srv), 'the dictation server part logs nothing');
  });
  for (const [name, fn] of T) { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + (e && e.message)); } }
  Date.now = realNow; console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
