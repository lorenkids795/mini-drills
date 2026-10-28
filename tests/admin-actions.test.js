// Admin action routing: every click action has one handler; Add teacher / Create tester read only their own form and call only their own API.
// Real app script (tests/app-harness.js). Run: node tests/admin-actions.test.js
'use strict';
const assert = require('assert');
const { boot, html } = require('./app-harness.js');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + e.message); } };
const HOOKS = 'get AD(){return AD},renderAdmin:renderAdmin';
const open = (sub) => { const B = boot({ hooks: HOOKS }); const AD = B.T.AD; AD.sub = sub; AD.locked = false; AD.ver = 'x'; AD.users = [{ email: 'k@x.com', name: 'K', role: 'student', cls: '17h', status: 'active', hasPassword: true }]; B.T.showTab('admin'); B.W.calls.length = 0; return B; };
const urls = (B) => B.W.calls.map((c) => String(c.url).replace(/^.*\/api\//, ''));
const SECRET = 'S3cret!pass';

(async () => {
  await t('no click action is handled by two different branches (except shared guards / grouped buttons)', () => {
    const m = {}, re = /if\(a==='([a-z0-9-]+)'\)\{/g; let x;
    while ((x = re.exec(html))) (m[x[1]] = m[x[1]] || []).push(html.slice(0, x.index).split('\n').length);
    const dup = Object.keys(m).filter((k) => m[k].length > 1); assert.deepStrictEqual(dup, [], dup.map((k) => k + ' @ ' + m[k]).join('; '));
    assert.ok(!/ad-tadd/.test(html), 'old shared action gone');
  });
  await t('the tester and teacher forms use their own input ids', () => {
    const ids = (blk) => (blk.match(/id="(ad[A-Za-z]+)"/g) || []).map((s) => s.slice(4, -1));
    const tf = html.slice(html.indexOf('function adTesterAddHTML'), html.indexOf('function adTeachersHTML')), cf = html.slice(html.indexOf('function adTeachersHTML'), html.indexOf('function adTeachersHTML') + 1400);
    const a = ids(tf), b = ids(cf); assert.ok(a.length >= 4 && b.length >= 3); a.forEach((id) => assert.ok(!b.includes(id), 'shared id ' + id));
  });
  await t('Add teacher: valid fields -> only admin/teachers {op:add}; no null error; list reloads', async () => {
    const B = open('teachers'); assert.ok(B.el('v-admin').innerHTML.includes('data-act="ad-teacher-add"'));
    B.el('adTcName').value = 'Ms Lan'; B.el('adTcEmail').value = 'lan@example.com'; B.el('adTcPw').value = SECRET; B.press({ act: 'ad-teacher-add' }); await B.flush();
    const u = urls(B); assert.strictEqual(u[0], 'admin/teachers'); assert.ok(!u.includes('admin/tester'));
    const body = JSON.parse(B.W.calls[0].opt.body); assert.deepStrictEqual([body.op, body.name, body.email], ['add', 'Ms Lan', 'lan@example.com']);
    assert.ok(u.includes('admin/users'), 'teacher list refreshed'); assert.ok(!/Something went wrong/.test(B.el('adMsg').textContent + B.toast()));
  });
  await t('Add teacher: missing name / bad email / short password -> message, no request', async () => {
    const B = open('teachers'); B.el('adTcName').value = ''; B.el('adTcEmail').value = 'x'; B.el('adTcPw').value = SECRET; B.press({ act: 'ad-teacher-add' }); await B.flush();
    assert.strictEqual(B.W.calls.length, 0); assert.ok(/teacher name and a valid email/.test(B.el('adMsg').textContent));
    B.el('adTcName').value = 'A'; B.el('adTcEmail').value = 'a@b.co'; B.el('adTcPw').value = '123'; B.press({ act: 'ad-teacher-add' }); await B.flush(); assert.strictEqual(B.W.calls.length, 0);
  });
  await t('Create tester still works: only admin/tester {op:create}', async () => {
    const B = open('users'); assert.ok(B.el('v-admin').innerHTML.includes('data-act="ad-tester-create"'));
    B.el('adTsName').value = 'Tester'; B.el('adTsEm').value = 'tester@gmail.com'; B.el('adTsCls').value = 'Test'; B.el('adTsPw').value = SECRET; B.press({ act: 'ad-tester-create' }); await B.flush();
    const u = urls(B); assert.strictEqual(u[0], 'admin/tester'); assert.ok(!u.includes('admin/teachers')); assert.strictEqual(JSON.parse(B.W.calls[0].opt.body).op, 'create');
  });
  await t('a form that is not on screen (other tab) cannot be read: message instead of a crash, no request', async () => {
    const B = open('users'); B.press({ act: 'ad-teacher-add' }); await B.flush(); assert.strictEqual(B.W.calls.length, 0); assert.ok(/not on the screen/.test(B.el('adMsg').textContent));
    const C = open('teachers'); C.press({ act: 'ad-tester-create' }); await C.flush(); assert.strictEqual(C.W.calls.length, 0);
  });
  await t('Generate fills the password box of its own form', () => {
    assert.ok(/data-act="ad-gen" data-for="adTsPw">Generate/.test(html) && /data-act="ad-gen" data-for="adTcPw">Generate/.test(html));
    const B = open('teachers'); B.el('adTcPw').value = ''; B.press({ act: 'ad-gen', for: 'adTcPw' }); assert.ok(B.el('adTcPw').value.length >= 6); assert.strictEqual(B.el('adTsPw').value, '');
  });
  await t('a server error shows its message but never the password', async () => {
    const B = open('teachers'); B.W.reply = (url) => (/admin\/teachers/.test(url) ? { status: 500, body: { error: 'Could not save the teacher.' } } : { status: 200, body: { ok: true } });
    B.el('adTcName').value = 'Ms Lan'; B.el('adTcEmail').value = 'lan@example.com'; B.el('adTcPw').value = SECRET; B.press({ act: 'ad-teacher-add' }); await B.flush();
    const shown = B.el('adMsg').textContent + B.toast(); assert.ok(/Could not save/.test(shown) && shown.indexOf(SECRET) < 0);
  });
  await t('other Admin actions still route to their own handlers (Kick, Change password, Remove teacher)', () => {
    ['ad-kick', 'ad-pw', 'ad-trm'].forEach((a) => assert.ok(html.indexOf("a==='" + a + "'") > 0 || html.indexOf("'" + a + "'") > 0, a));
  });
  console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
