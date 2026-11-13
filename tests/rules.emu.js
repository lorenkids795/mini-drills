// Firestore rules test on the local Firebase Emulator (project "demo-md": fake, never the real Firebase project).
// Not part of the plain Node suite (needs the emulator + @firebase/rules-unit-testing). Run, from a folder that has them:
//   firebase emulators:exec --only firestore --project demo-md "node <repo>/tests/rules.emu.js"
// Roles: admin (teacher + adm), teacher, student, tester (a student token; the tester flag lives on roster), assistant.
'use strict';
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch } = require('firebase/firestore');
const D = 864e5, NOW = Date.now(), ST = () => serverTimestamp();
// the late-pass month the rules compute: Vietnam time (UTC+7) of the server clock
const VM = (() => { const d = new Date(Date.now() + 7 * 36e5); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); })();

(async () => {
  const env = await initializeTestEnvironment({ projectId: 'demo-md', firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: +(process.env.EMU_PORT || 8080) } });
  await env.clearFirestore(); // every run starts from the same data
  const as = (uid, claims) => env.authenticatedContext(uid, claims).firestore();
  const A = as('admin', { em: 'admin@x.com', role: 'teacher', adm: true }), T = as('t', { em: 't@x.com', role: 'teacher' }),
    S = as('s', { em: 's@x.com', role: 'student' }), X = as('x', { em: 'tester@x.com', role: 'student' }), H = as('h', { em: 'a@x.com', role: 'assistant' }),
    N = env.unauthenticatedContext().firestore();
  await env.withSecurityRulesDisabled(async (c) => { const d = c.firestore();
    await setDoc(doc(d, 'codes/c1'), { code: 'TEA-1', kind: 'tea', to: '' }); await setDoc(doc(d, 'codes/c2'), { code: 'TEA-2', kind: 'tea', to: 's@x.com' });
    await setDoc(doc(d, 'codes/c3'), { code: 'TEA-3', kind: 'tea', to: 'other@x.com' });
    await setDoc(doc(d, 'config/xp'), { vals: {} }); await setDoc(doc(d, 'roster/s@x.com'), { email: 's@x.com', cls: '7h', name: 'S' });
    await setDoc(doc(d, 'roster/tester@x.com'), { email: 'tester@x.com', cls: '7h', name: 'X', tester: true });
    await setDoc(doc(d, 'roster/p2@x.com'), { email: 'p2@x.com', cls: '7h', name: 'P2' }); await setDoc(doc(d, 'roster/p3@x.com'), { email: 'p3@x.com', cls: '7h', name: 'P3' });
    await setDoc(doc(d, 'roster/P4@X.com'), { email: 'p4@x.com', cls: '7h', name: 'P4 (old import id)' });
    await setDoc(doc(d, 'attempts/a1'), { email: 's@x.com', ex: 'l1', score: 3, total: 5 }); await setDoc(doc(d, 'profiles/s'), { email: 's@x.com', xp: 10 });
    await setDoc(doc(d, 'hwdone/h1'), { email: 's@x.com', asgId: 'x' }); await setDoc(doc(d, 'redeems/r1'), { email: 's@x.com', done: false });
    await setDoc(doc(d, 'names/n1'), { name: 'S', cls: '7h' }); await setDoc(doc(d, 'exercises/e1'), { title: 'E' });
    // (11/2026) assignment windows: A closed 100 days ago, B open, L closed but a week pass is active, D closed 3 h ago + day pass,
    // E closed 2 days ago + day pass (ended), old = legacy weekStart only
    const as = { asgG: [-1, 6], asgH: [-1, 6], asgI: [-1, 6], asgA: [-120, -100], asgB: [-1, 6], asgL: [-10, -2], asgD: [-5, -0.125], asgE: [-9, -2], asgF: [1, 8] };
    for (const k of Object.keys(as)) await setDoc(doc(d, 'assignments/' + k), { cls: '7h', ex: ['x1'], start: NOW + as[k][0] * D, due: NOW + as[k][1] * D });
    await setDoc(doc(d, 'assignments/old'), { cls: '7h', ex: ['x1'], weekStart: '2025-01-06' });
    await setDoc(doc(d, 'assignments/asgO'), { cls: '9h', ex: ['x1'], start: NOW - D, due: NOW + 6 * D }); // another class, open
    await setDoc(doc(d, 'passes/s-x-com_asgL'), { email: 's@x.com', asgId: 'asgL', kind: 'week' });
    await setDoc(doc(d, 'passes/s-x-com_asgD'), { email: 's@x.com', asgId: 'asgD', kind: 'day' });
    await setDoc(doc(d, 'passes/s-x-com_asgE'), { email: 's@x.com', asgId: 'asgE', kind: 'day' });
  });
  let pass = 0, fail = 0; const out = [];
  const t = async (name, p) => { try { await p; pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + (e && e.message || e)); } };
  // ---- D1a vouchers
  await t('student cannot list all codes', assertFails(getDocs(collection(S, 'codes'))));
  await t('student can list only own codes (to == me)', assertSucceeds(getDocs(query(collection(S, 'codes'), where('to', '==', 's@x.com')))));
  await t('student can read own code doc', assertSucceeds(getDoc(doc(S, 'codes/c2'))));
  await t("student cannot read someone else's code", assertFails(getDoc(doc(S, 'codes/c3'))));
  await t('student cannot read a free code', assertFails(getDoc(doc(S, 'codes/c1'))));
  await t('student cannot claim a free code', assertFails(updateDoc(doc(S, 'codes/c1'), { to: 's@x.com' })));
  await t('tester cannot claim a free code', assertFails(updateDoc(doc(X, 'codes/c1'), { to: 'tester@x.com' })));
  await t('teacher cannot read vouchers', assertFails(getDocs(collection(T, 'codes'))));
  await t('admin reads all vouchers', assertSucceeds(getDocs(collection(A, 'codes'))));
  await t('admin adds a voucher', assertSucceeds(setDoc(doc(A, 'codes/c9'), { code: 'NEW', kind: 'tea', to: '' })));
  await t('assistant cannot read vouchers', assertFails(getDoc(doc(H, 'codes/c2'))));
  // ---- D2 config / roster / names
  await t('teacher cannot change XP settings', assertFails(setDoc(doc(T, 'config/xp'), { vals: { hack: 1 } })));
  await t('teacher cannot change prizes', assertFails(setDoc(doc(T, 'config/prizes'), { list: [] })));
  await t('teacher can save Speaking goals of an exercise', assertSucceeds(setDoc(doc(T, 'config/goals_s1'), { ex: 's1', goals: {} })));
  await t('admin changes XP settings', assertSucceeds(setDoc(doc(A, 'config/xp'), { vals: {} })));
  await t('student cannot change config', assertFails(setDoc(doc(S, 'config/goals_s1'), { ex: 's1' })));
  await t('everyone signed in reads config', assertSucceeds(getDoc(doc(S, 'config/xp'))));
  await t('teacher sets a student level', assertSucceeds(setDoc(doc(T, 'roster/s@x.com'), { level: 'advanced' }, { merge: true })));
  await t('teacher cannot change a student class', assertFails(updateDoc(doc(T, 'roster/s@x.com'), { cls: '9h' })));
  await t('teacher cannot set the tester flag', assertFails(updateDoc(doc(T, 'roster/s@x.com'), { tester: true })));
  await t('teacher cannot create roster rows', assertFails(setDoc(doc(T, 'roster/new@x.com'), { email: 'new@x.com' })));
  await t('admin creates roster rows (CSV import)', assertSucceeds(setDoc(doc(A, 'roster/new@x.com'), { email: 'new@x.com', cls: '7h' })));
  await t('teacher reads names, cannot write them', assertSucceeds(getDoc(doc(T, 'names/n1'))));
  await t('teacher cannot write names', assertFails(setDoc(doc(T, 'names/n2'), { name: 'Z' })));
  await t('admin writes names', assertSucceeds(setDoc(doc(A, 'names/n2'), { name: 'Z' })));
  // ---- D2 attempts and learning data
  await t('teacher marks (grade)', assertSucceeds(updateDoc(doc(T, 'attempts/a1'), { grade: { overall: 6 } })));
  await t('teacher saves Writing comments', assertSucceeds(updateDoc(doc(T, 'attempts/a1'), { annotations: [], overallComment: 'ok' })));
  await t('teacher cannot change a score', assertFails(updateDoc(doc(T, 'attempts/a1'), { score: 5 })));
  await t('teacher cannot delete an attempt', assertFails(deleteDoc(doc(T, 'attempts/a1'))));
  await t('admin can delete an attempt', assertSucceeds(deleteDoc(doc(A, 'attempts/a1'))));
  await t('student creates own attempt', assertSucceeds(addDoc(collection(S, 'attempts'), { email: 's@x.com', ex: 'l1', sts: ST(), score: 4, total: 5 })));
  await t('student saves answered / required (Phase B)', assertSucceeds(addDoc(collection(S, 'attempts'), { email: 's@x.com', ex: 'l1', sts: ST(), score: 3, total: 5, answered: 4, required: 5 })));
  await t('answered can never be more than required', assertFails(addDoc(collection(S, 'attempts'), { email: 's@x.com', ex: 'l1', sts: ST(), score: 3, total: 5, answered: 6, required: 5 })));
  await t('student cannot give self a grade', assertFails(addDoc(collection(S, 'attempts'), { email: 's@x.com', ex: 'l1', sts: ST(), score: 4, total: 5, grade: { overall: 9 } })));
  await t('student cannot write for another student', assertFails(addDoc(collection(S, 'attempts'), { email: 'other@x.com', ex: 'l1', sts: ST(), score: 1, total: 5 })));
  await t('teacher cannot delete a profile', assertFails(deleteDoc(doc(T, 'profiles/s'))));
  // ---- (11/2026) each assignment occurrence has its own window; server time
  const P2 = as('p2', { em: 'p2@x.com', role: 'student' }), P3 = as('p3', { em: 'p3@x.com', role: 'student' });
  const redeem = (db, em, asg, kind, o) => { o = o || {}; const sl = em.replace(/[^a-z0-9]+/g, '-'), m = o.month || VM, b = writeBatch(db);
    b.set(doc(db, 'passes/' + (o.pid || sl + '_' + asg)), Object.assign({ email: em, asgId: asg, kind, month: m, ts: NOW }, o.extra || {}));
    if (!o.noMarker) b.set(doc(db, 'passq/' + (o.qid || sl + '_' + m + '_' + (o.qkind || kind))), { email: em, asgId: o.qasg || asg, kind: o.qkind || kind, month: m, ts: NOW });
    return b.commit(); };
  const redeemS = (asg, kind) => redeem(S, 's@x.com', asg, kind);
  const att = (o) => addDoc(collection(S, 'attempts'), Object.assign({ email: 's@x.com', ex: 'x1', score: 5, total: 5, answered: 5, required: 5, sts: ST() }, o));
  await t('attempt without server time is refused', assertFails(addDoc(collection(S, 'attempts'), { email: 's@x.com', ex: 'x1', score: 1, total: 5 })));
  await t('attempt with a made-up time (not the server time) is refused', assertFails(att({ sts: NOW - 200 * D })));
  await t('free practice (no assignment) is accepted', assertSucceeds(att({})));
  await t('open assignment B is accepted', assertSucceeds(att({ asg: 'asgB' })));
  await t('A closed 100 days ago is refused, even though B with the same exercise is open', assertFails(att({ asg: 'asgA' })));
  await t('closed but the week late pass is still active: accepted', assertSucceeds(att({ asg: 'asgL' })));
  await t('closed 3 h ago, day pass active: accepted', assertSucceeds(att({ asg: 'asgD' })));
  await t('closed 2 days ago, day pass ended: refused', assertFails(att({ asg: 'asgE' })));
  await t('assignment not sent yet: refused', assertFails(att({ asg: 'asgF' })));
  await t('an assignment that does not exist: refused', assertFails(att({ asg: 'nope' })));
  await t('legacy assignment without a deadline: not blocked', assertSucceeds(att({ asg: 'old' })));
  await t('class proof: an open homework of ANOTHER class (roster says 7h, homework is 9h): refused', assertFails(att({ asg: 'asgO', cls: '9h' })));
  await t('class proof: writing cls 9h on the attempt does not help (the class comes from roster, not from the attempt)', assertFails(att({ asg: 'asgO', cls: '9h', email: 's@x.com' })));
  await t('exercise check: an exercise that is not in the homework: refused', assertFails(att({ asg: 'asgB', ex: 'not_in_it' })));
  await t('exercise check: no exercise id at all: refused', assertFails(addDoc(collection(S, 'attempts'), { email: 's@x.com', score: 1, total: 5, sts: ST(), asg: 'asgB' })));
  await t('class proof: homework record (screenshot / I am done) for another class: refused', assertFails(setDoc(doc(S, 'hwdone/s-x-com_asgO'), { email: 's@x.com', asgId: 'asgO', done: true })));
  await t('class proof: a late pass for a homework of another class: refused', assertFails(redeemS('asgO', 'day')));
  // (11/2026) fail closed: no roster/<email> row = refused (old-id rows are fixed by the admin, admin/rosterids)
  const P4 = as('p4', { em: 'p4@x.com', role: 'student' }), P5 = as('p5', { em: 'p5@x.com', role: 'student' });
  const p4att = () => addDoc(collection(P4, 'attempts'), { email: 'p4@x.com', ex: 'x1', score: 1, total: 5, sts: ST(), asg: 'asgB' });
  await t('class proof: roster row stored under an old id (P4@X.com): homework attempt refused (fail closed)', assertFails(p4att()));
  await t('class proof: old-id student: homework record refused', assertFails(setDoc(doc(P4, 'hwdone/p4-x-com_asgB'), { email: 'p4@x.com', asgId: 'asgB', done: true })));
  await t('class proof: old-id student: late pass refused', assertFails(redeem(P4, 'p4@x.com', 'asgB', 'day')));
  await t('class proof: token with no roster row at all (removed account): homework attempt refused', assertFails(addDoc(collection(P5, 'attempts'), { email: 'p5@x.com', ex: 'x1', score: 1, total: 5, sts: ST(), asg: 'asgB' })));
  await t('class proof: no roster row: free practice (no asg) still saved, it never counts as homework', assertSucceeds(addDoc(collection(P5, 'attempts'), { email: 'p5@x.com', ex: 'x1', score: 1, total: 5, sts: ST() })));
  await env.withSecurityRulesDisabled(async (c) => { const d = c.firestore(); const o = (await getDoc(doc(d, 'roster/P4@X.com'))).data(); await setDoc(doc(d, 'roster/p4@x.com'), Object.assign({}, o, { legacyId: 'P4@X.com' })); await deleteDoc(doc(d, 'roster/P4@X.com')); });
  await t('class proof: after the admin moves the row to roster/p4@x.com the same student hands in normally', assertSucceeds(p4att()));
  await t('class proof: after the fix, another class is still refused', assertFails(addDoc(collection(P4, 'attempts'), { email: 'p4@x.com', ex: 'x1', score: 1, total: 5, sts: ST(), asg: 'asgO' })));
  // ---- (11/2026) monthly late-pass quota: pass + marker passq/<slug>_<VN month>_<kind> in ONE batch
  await t('quota: 1-day pass for B (pass + month marker together): accepted', assertSucceeds(redeem(S, 's@x.com', 'asgB', 'day')));
  await t('quota: a second 1-day pass in the same month (for G): refused', assertFails(redeem(S, 's@x.com', 'asgG', 'day')));
  await t('quota: the 1-week pass is separate: accepted once (for G)', assertSucceeds(redeem(S, 's@x.com', 'asgG', 'week')));
  await t('quota: a second 1-week pass in the same month (for H): refused', assertFails(redeem(S, 's@x.com', 'asgH', 'week')));
  await t('quota: a pass without the marker (old app / direct write): refused', assertFails(setDoc(doc(P3, 'passes/p3-x-com_asgH'), { email: 'p3@x.com', asgId: 'asgH', kind: 'day', month: VM, ts: NOW })));
  await t('quota: a marker without a pass: refused', assertFails(setDoc(doc(P3, 'passq/p3-x-com_' + VM + '_day'), { email: 'p3@x.com', asgId: 'asgH', kind: 'day', month: VM })));
  await t('quota: another month written by the device (2026-01): refused', assertFails(redeem(P3, 'p3@x.com', 'asgH', 'day', { month: '2001-01' })));
  await t('quota: a 1-week pass with a 1-day marker (kind mismatch): refused', assertFails(redeem(P3, 'p3@x.com', 'asgH', 'week', { qkind: 'day' })));
  await t('quota: a marker naming another homework: refused', assertFails(redeem(P3, 'p3@x.com', 'asgH', 'day', { qasg: 'asgI' })));
  await t('quota: a pass that claims to be a Lucky Wheel item (no marker needed): refused', assertFails(redeem(P3, 'p3@x.com', 'asgH', 'day', { extra: { item: 'i123', month: 'item-i123' }, noMarker: true })));
  await t('quota: a pass for another student (email / id): refused', assertFails(redeem(P3, 's@x.com', 'asgH', 'day')));
  await t('quota: a marker id for another student: refused', assertFails(redeem(P3, 'p3@x.com', 'asgH', 'day', { qid: 's-x-com_' + VM + '_day' })));
  // two tabs / devices at the same time: exactly one wins
  const race = await Promise.allSettled([redeem(P2, 'p2@x.com', 'asgG', 'day'), redeem(P2, 'p2@x.com', 'asgH', 'day'), redeem(P2, 'p2@x.com', 'asgI', 'day')]);
  await t('quota: 3 simultaneous 1-day requests for different homework: exactly one succeeds', Promise.resolve().then(() => { const n = race.filter((r) => r.status === 'fulfilled').length; if (n !== 1) throw new Error(n + ' succeeded'); }));
  const won = ['asgG', 'asgH', 'asgI'][race.findIndex((r) => r.status === 'fulfilled')];
  await t('quota: sending the same request again (retry) creates nothing new', assertFails(redeem(P2, 'p2@x.com', won, 'day')));
  await t('quota: the student reads their own marker', assertSucceeds(getDoc(doc(P2, 'passq/p2-x-com_' + VM + '_day'))));
  await t('quota: a student cannot read another student\'s marker', assertFails(getDoc(doc(P3, 'passq/p2-x-com_' + VM + '_day'))));
  await t('quota: a student cannot delete or change a marker', assertFails(deleteDoc(doc(P2, 'passq/p2-x-com_' + VM + '_day'))));
  await t('quota: teachers read markers; the assistant cannot', Promise.all([assertSucceeds(getDoc(doc(T, 'passq/p2-x-com_' + VM + '_day'))), assertFails(getDoc(doc(H, 'passq/p2-x-com_' + VM + '_day')))]));
  await t('quota: extitems (Lucky Wheel ledger) is server only', assertFails(getDoc(doc(S, 'extitems/i1'))));
  await t('late pass cannot be changed afterwards (day → week)', assertFails(setDoc(doc(S, 'passes/s-x-com_asgB'), { email: 's@x.com', asgId: 'asgB', kind: 'week', month: VM, ts: NOW })));
  await t('late pass that would end in the past (A, 100 days): refused', assertFails(setDoc(doc(S, 'passes/s-x-com_asgA'), { email: 's@x.com', asgId: 'asgA', kind: 'week', month: '2026-11', ts: NOW })));
  await t('late pass under another id: refused', assertFails(setDoc(doc(S, 'passes/zzz_asgF'), { email: 's@x.com', asgId: 'asgF', kind: 'day' })));
  await t('late pass of an unknown kind: refused', assertFails(setDoc(doc(S, 'passes/s-x-com_asgF'), { email: 's@x.com', asgId: 'asgF', kind: 'month' })));
  await t('screenshot / I am done for open B: accepted', assertSucceeds(setDoc(doc(S, 'hwdone/s-x-com_asgB'), { email: 's@x.com', asgId: 'asgB', shots: { x1: { url: '/api/image/a', ts: NOW } } })));
  await t('screenshot for closed A: refused', assertFails(setDoc(doc(S, 'hwdone/s-x-com_asgA'), { email: 's@x.com', asgId: 'asgA', shots: { x1: { url: '/api/image/a', ts: NOW } } })));
  await t('screenshot inside the active week pass: accepted', assertSucceeds(setDoc(doc(S, 'hwdone/s-x-com_asgL'), { email: 's@x.com', asgId: 'asgL', done: true })));
  await t('a homework record cannot be moved to another assignment', assertFails(updateDoc(doc(S, 'hwdone/s-x-com_asgB'), { asgId: 'asgL' })));
  await t('teacher cannot delete homework records', assertFails(deleteDoc(doc(T, 'hwdone/h1'))));
  await t('teacher cannot mark redeems done', assertFails(updateDoc(doc(T, 'redeems/r1'), { done: true })));
  await t('admin marks redeems done', assertSucceeds(updateDoc(doc(A, 'redeems/r1'), { done: true })));
  // ---- teaching work stays open for teachers
  await t('teacher edits Library exercises', assertSucceeds(setDoc(doc(T, 'exercises/e1'), { title: 'E2' })));
  await t('teacher saves assignments', assertSucceeds(setDoc(doc(T, 'assignments/as1'), { cls: '7h', ex: ['l1'] })));
  await t('teacher saves class settings', assertSucceeds(setDoc(doc(T, 'classes/7h'), { title: '7h' }, { merge: true })));
  await t('student cannot write exercises', assertFails(setDoc(doc(S, 'exercises/e1'), { title: 'x' })));
  // ---- wins: only the server writes (fake "just won" lines are refused)
  await t('student cannot post a fake win', assertFails(addDoc(collection(S, 'wins'), { name: 'S', cls: '7h', prize: 'Mock test', tier: 4, ts: 1 })));
  await t('teacher cannot post a win', assertFails(addDoc(collection(T, 'wins'), { name: 'T', cls: '', prize: 'x', tier: 4, ts: 1 })));
  await t('admin cannot post a win from the app either', assertFails(addDoc(collection(A, 'wins'), { name: 'A', cls: '', prize: 'x', tier: 4, ts: 1 })));
  await t('everyone signed in still reads wins (marquee)', assertSucceeds(getDocs(collection(S, 'wins'))));
  // ---- assistant: nothing in Firestore; anonymous: nothing
  await t('assistant cannot read roster', assertFails(getDoc(doc(H, 'roster/s@x.com'))));
  await t('assistant cannot read profiles', assertFails(getDoc(doc(H, 'profiles/s'))));
  await t('assistant cannot write assignments', assertFails(setDoc(doc(H, 'assignments/as2'), { cls: '7h' })));
  await t('signed-out cannot read anything', assertFails(getDoc(doc(N, 'roster/s@x.com'))));
  await t('student reads profiles (Leaderboard)', assertSucceeds(getDoc(doc(S, 'profiles/s'))));
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed');
  await env.cleanup(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
