// PASS = 70 % correct for everyone (one rule), blank answers asked about before Submit, (the old 500-attempt cap: see attempts-scope.test.js).
// Real app code (tests/app-harness.js), no network.
// Run: node tests/pass-rule.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'passPct:passPct,PASS_PCT:PASS_PCT,blankCount:blankCount,get NAV(){return NAV},attCapHTML:attCapHTML,setAtt:function(a){attemptDocs=a}';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

t('PASS is 70 % for every auto-graded score: 69 % no, 70 % yes, 78 % yes; no answers / no questions = no pass', () => {
  const B = boot({ hooks: HOOKS }), p = B.T.passPct;
  assert.strictEqual(B.T.PASS_PCT, 70);
  assert.strictEqual(p(69, 100), false); assert.strictEqual(p(70, 100), true); assert.strictEqual(p(78, 100), true);
  assert.strictEqual(p(7, 10), true); assert.strictEqual(p(6, 10), false); assert.strictEqual(p(14, 20), true); assert.strictEqual(p(2, 3), false);
  assert.strictEqual(p(0, 0), false); assert.strictEqual(p(5, 0), false);
});
t('one source: XP, Reading and Listening stage gates and Recent results all use PASS_PCT (no other 70 % maths left)', () => {
  assert.ok(/passed=sub\|\|passPct\(score,total\)/.test(html));
  assert.ok(/if\(!RM\.root&&!passPct\(sc,a\.length\)\)/.test(html) && /if\(!passPct\(sc,ids\.length\)\)\{LS\.fail=st/.test(html));
  assert.ok(/var RS_PASS_PCT=PASS_PCT,/.test(html));
  assert.ok(!/score\/total>=\.7|sc\/a\.length<\.7|sc\/ids\.length<\.7/.test(html));
  assert.ok(!/PASS_PCT\s*=\s*(?!70;)[^,;]*xpv|config\/pass/.test(html), 'not read from settings: nobody can change it');
});
t('Submit with blank answers asks first (Keep working / Submit anyway)', () => {
  const B = boot({ hooks: HOOKS, user: { name: 'S', email: 's@x.com', role: 'student', cls: 'A' } });
  B.T.NAV.ex = 'l2'; // built-in "Complete the notes": 5 gap questions, all empty in the fake page
  const c = B.T.blankCount(); assert.ok(c.t > 0 && c.n === c.t, JSON.stringify(c));
  B.press({ act: 'submit' }); assert.ok(/Submit with \d+ blank answers\?/.test(B.asking()), 'asked: ' + B.asking());
  B.cancel(); assert.strictEqual(B.asking(), '');
  assert.ok(/if\(a==='submit'\)\{var bl=blankCount\(\);if\(bl\.n&&uiGate\(t,/.test(html));
});
// (the 500-attempt cap is gone, D5: tests/attempts-scope.test.js)

out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
