// Admin › Users grouped by role (Admin, Teachers, Homework Assistants, Testers, Students; no Role column) and Admin › Students
// listing real students only. Real app code (tests/app-harness.js). Run: node tests/admin-users-groups.test.js
'use strict';
const assert = require('assert');
const { boot } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'get AD(){return AD},adListHTML:adListHTML,adUsersHTML:adUsersHTML,adCountText:adCountText,adMenuItems:adMenuItems,renderRoster:renderRoster,rosterStudents:rosterStudents,setRoster:function(r){rosterDocs=r},setCfgT:function(L){CFG.teachers=L}';
const USERS = [
  { email: 'st1@x.com', name: 'Bảo An', role: 'student', cls: '21h', course: 'Grade 9', status: 'active', hasPassword: true },
  { email: 'tc@x.com', name: 'Teacher', role: 'teacher', cls: '', status: 'active', hasPassword: true, src: 'env' },
  { email: 'ad@x.com', name: 'Admin', role: 'admin', cls: '', status: 'active', hasPassword: true },
  { email: 'tst@x.com', name: 'Cherry', role: 'student', cls: 'Test', tester: true, status: 'active', hasPassword: true },
  { email: 'as@x.com', name: 'Anh Tuan', role: 'assistant', cls: '', classes: ['7h30'], status: 'active', hasPassword: true },
  { email: 'st2@x.com', name: 'Minh', role: 'student', cls: '7h30', status: 'active', hasPassword: true },
  { email: 'tc2@x.com', name: 'Ms Lan', role: 'teacher', cls: '', status: 'paused', hasPassword: true },
];
const admin = () => { const B = boot({ hooks: HOOKS }); B.T.AD.users = USERS.map((u) => Object.assign({}, u)); B.T.AD.q = ''; B.T.AD.cls = 'all'; B.T.AD.ver = 'x'; return B; };
const sec = (h, id) => { const i = h.indexOf('id="adG_' + id + '"'); if (i < 0) return ''; const j = h.indexOf('</section>', i); return h.slice(i, j); };

t('Users: one section per role in the order Admin, Teachers, Homework Assistants, Testers, Students, with counts', () => {
  const h = admin().T.adListHTML(), ids = ['admin', 'teacher', 'assistant', 'tester', 'student'].map((g) => h.indexOf('id="adG_' + g + '"'));
  assert.ok(ids.every((x) => x >= 0) && ids.every((x, i) => !i || x > ids[i - 1]), ids.join());
  assert.ok(/>Teachers <span class="adgn">2<\/span>/.test(h) && />Students <span class="adgn">2<\/span>/.test(h) && />Homework Assistants <span class="adgn">1<\/span>/.test(h) && !h.includes('adG_other'));
});
t('Users: no Role column; every account listed once, in its own group (assistant not a teacher, tester not a student)', () => {
  const h = admin().T.adListHTML();
  assert.ok(!/>Role</.test(h) && !/data-l="Role"/.test(h));
  USERS.forEach((u) => assert.strictEqual(h.split('>' + u.email + '<').length - 1, 1, u.email));
  assert.ok(sec(h, 'assistant').includes('as@x.com') && !sec(h, 'teacher').includes('as@x.com') && sec(h, 'tester').includes('tst@x.com') && !sec(h, 'student').includes('tst@x.com'));
});
t('Users: Class only for students; tester / staff show — (the tester keeps cls "Test")', () => {
  const B = admin(), h = B.T.adListHTML();
  assert.ok(/data-l="Class" class="c-sm">21h</.test(sec(h, 'student')) && /data-l="Class" class="c-sm">—</.test(sec(h, 'tester')) && !/Test</.test(sec(h, 'tester').replace(/Tester/g, '')));
  assert.ok(/data-l="Class" class="c-sm">—</.test(sec(h, 'teacher')) && /data-l="Class" class="c-sm">—</.test(sec(h, 'assistant')) && B.T.AD.users.find((u) => u.tester).cls === 'Test');
});
t('Users: search across groups with "n of m" counts; the class filter narrows Students only; Role filter gone', () => {
  const B = admin(); B.T.AD.q = 'lan'; let h = B.T.adListHTML();
  assert.ok(/>Teachers <span class="adgn">1 of 2<\/span>/.test(h) && !h.includes('adG_student') && !h.includes('adG_admin') && B.T.adCountText() === '1 of 7 accounts');
  B.T.AD.q = ''; B.T.AD.cls = '21h'; h = B.T.adListHTML();
  assert.ok(/>Students <span class="adgn">1 of 2<\/span>/.test(h) && h.includes('adG_teacher') && h.includes('adG_tester') && !sec(h, 'student').includes('st2@x.com'));
  const tool = B.T.adUsersHTML(); assert.ok(!/id="adRole"/.test(tool) && /Students’ class/.test(tool) && !/<option value="Test"/.test(tool), 'class list = students only');
  B.T.AD.q = 'nobody'; assert.ok(B.T.adListHTML().includes('No one matches.'));
});
t('Users: actions menu per row unchanged (tester sample data, teacher Kick, assistant password only, admin My account)', () => {
  const B = admin(), m = (e) => B.T.adMenuItems(B.T.AD.users.find((u) => u.email === e), 'users').map((x) => x[0]).join();
  assert.strictEqual(m('tst@x.com'), 'ad-pw,ad-tseed,ad-kick'); assert.strictEqual(m('tc@x.com'), 'ad-pw,ad-kick'); assert.strictEqual(m('as@x.com'), 'ad-pw'); assert.strictEqual(m('ad@x.com'), 'ad-sub');
  assert.ok(admin().T.adListHTML().includes('data-act="ad-menu"'));
});
t('Students: only real students (no MD_CONFIG teacher placeholder, no role "teacher" row, no tester, no staff email); NAME | EMAIL | CLASS', () => {
  const B = admin(); B.T.setCfgT(['tc@x.com']);
  B.T.setRoster([{ email: 'st1@x.com', name: 'BẢO AN', cls: '21h', course: '', role: 'student' }, { email: 'old@x.com', name: 'Old teacher row', cls: '', role: 'teacher' },
    { email: 'tst@x.com', name: 'Cherry', cls: 'Test', role: 'student', tester: true }, { email: 'as@x.com', name: 'Assistant with a roster row', cls: '7h30', role: 'student' }]);
  assert.strictEqual(JSON.stringify(B.T.rosterStudents().map((r) => r.email)), '["st1@x.com"]');
  B.T.renderRoster(); const h = B.el('rosterBody').innerHTML;
  assert.ok(/<th scope="col">Name<\/th><th scope="col">Email<\/th><th scope="col">Class<\/th><\/tr>/.test(h) && !/>Role</.test(h) && !/Course/.test(h));
  assert.ok(h.includes('BẢO AN') && /<td>21h<\/td>/.test(h) && !/— · /.test(h) && !h.includes('Teacher') && h.includes('1 student'));
});
out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
