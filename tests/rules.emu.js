// Firestore rules test on the local Firebase Emulator (project "demo-md": fake, never the real Firebase project).
// Not part of the plain Node suite (needs the emulator + @firebase/rules-unit-testing). Run, from a folder that has them:
//   firebase emulators:exec --only firestore --project demo-md "node <repo>/tests/rules.emu.js"
// Roles: admin (teacher + adm), teacher, student, tester (a student token; the tester flag lives on roster), assistant.
'use strict';
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, addDoc } = require('firebase/firestore');

(async () => {
  const env = await initializeTestEnvironment({ projectId: 'demo-md', firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: +(process.env.EMU_PORT || 8080) } });
  const as = (uid, claims) => env.authenticatedContext(uid, claims).firestore();
  const A = as('admin', { em: 'admin@x.com', role: 'teacher', adm: true }), T = as('t', { em: 't@x.com', role: 'teacher' }),
    S = as('s', { em: 's@x.com', role: 'student' }), X = as('x', { em: 'tester@x.com', role: 'student' }), H = as('h', { em: 'a@x.com', role: 'assistant' }),
    N = env.unauthenticatedContext().firestore();
  await env.withSecurityRulesDisabled(async (c) => { const d = c.firestore();
    await setDoc(doc(d, 'codes/c1'), { code: 'TEA-1', kind: 'tea', to: '' }); await setDoc(doc(d, 'codes/c2'), { code: 'TEA-2', kind: 'tea', to: 's@x.com' });
    await setDoc(doc(d, 'codes/c3'), { code: 'TEA-3', kind: 'tea', to: 'other@x.com' });
    await setDoc(doc(d, 'config/xp'), { vals: {} }); await setDoc(doc(d, 'roster/s@x.com'), { email: 's@x.com', cls: '7h', name: 'S' });
    await setDoc(doc(d, 'roster/tester@x.com'), { email: 'tester@x.com', cls: '7h', name: 'X', tester: true });
    await setDoc(doc(d, 'attempts/a1'), { email: 's@x.com', ex: 'l1', score: 3, total: 5 }); await setDoc(doc(d, 'profiles/s'), { email: 's@x.com', xp: 10 });
    await setDoc(doc(d, 'hwdone/h1'), { email: 's@x.com', asgId: 'x' }); await setDoc(doc(d, 'redeems/r1'), { email: 's@x.com', done: false });
    await setDoc(doc(d, 'names/n1'), { name: 'S', cls: '7h' }); await setDoc(doc(d, 'exercises/e1'), { title: 'E' });
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
  await t('student creates own attempt', assertSucceeds(addDoc(collection(S, 'attempts'), { email: 's@x.com', ex: 'l1', score: 4, total: 5 })));
  await t('student saves answered / required (Phase B)', assertSucceeds(addDoc(collection(S, 'attempts'), { email: 's@x.com', ex: 'l1', score: 3, total: 5, answered: 4, required: 5 })));
  await t('answered can never be more than required', assertFails(addDoc(collection(S, 'attempts'), { email: 's@x.com', ex: 'l1', score: 3, total: 5, answered: 6, required: 5 })));
  await t('student cannot give self a grade', assertFails(addDoc(collection(S, 'attempts'), { email: 's@x.com', ex: 'l1', score: 4, total: 5, grade: { overall: 9 } })));
  await t('student cannot write for another student', assertFails(addDoc(collection(S, 'attempts'), { email: 'other@x.com', ex: 'l1', score: 1, total: 5 })));
  await t('teacher cannot delete a profile', assertFails(deleteDoc(doc(T, 'profiles/s'))));
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
