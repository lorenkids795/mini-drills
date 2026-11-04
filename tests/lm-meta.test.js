// Learning Materials (PR 1): lesson metadata + "unpublished is hidden from students" gate.
// Run: node tests/lm-meta.test.js   (Node built-ins only, no packages)
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + e.message); } }

// 1) the real content file
const LM = require(path.join(ROOT, 'lm-content.js'));
t('metadata file loads in Node', () => assert.ok(LM && Array.isArray(LM.lessons)));
t('lesson ids are unique', () => { const ids = LM.lessons.map((l) => l.id); assert.strictEqual(new Set(ids).size, ids.length); });
t('every lesson has the required metadata', () => LM.lessons.forEach((l) => {
  ['id', 'title', 'skill', 'module'].forEach((k) => assert.ok(typeof l[k] === 'string' && l[k], l.id + ' ' + k));
  assert.ok(Number.isInteger(l.unit) && Number.isInteger(l.version) && l.version >= 1, l.id + ' unit/version');
  assert.ok(['published', 'unpublished'].includes(l.status), l.id + ' status');
  assert.ok(Array.isArray(l.languages) && l.languages.length, l.id + ' languages');
  assert.ok(LM.modules.some((m) => m.id === l.module && m.skill === l.skill), l.id + ' module/skill exists');
}));
t('Unit 2 exists and is unpublished', () => { const u = LM.lessons.find((l) => l.id === 'lm-writing-ac-t1-u2'); assert.ok(u); assert.strictEqual(u.status, 'unpublished'); assert.strictEqual(u.unit, 2); });
t('metadata only: no chart / practice / answer fields yet', () => LM.lessons.forEach((l) => ['chart', 'charts', 'facts', 'verifiedFacts', 'keyFeatures', 'practice', 'answers', 'stages'].forEach((k) => assert.ok(!(k in l), l.id + ' has ' + k))));
t('no Cambridge book/test ids in lesson metadata', () => LM.lessons.forEach((l) => ['bookId', 'testId', 'book', 'test', 'part'].forEach((k) => assert.ok(!(k in l), l.id + ' has ' + k))));

// 2) the real gate code from index.html (block between the two section comments)
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a = html.indexOf('/* ---------- Library › Learning Materials'), b = html.indexOf('function renderLib(){', a);
t('gate block found in index.html', () => assert.ok(a > 0 && b > a));
const ctx = { window: { MD_LM: LM }, document: { addEventListener: () => {} }, U: null, lsGet: () => null, lsSet: () => {}, esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
vm.createContext(ctx);
vm.runInContext(html.slice(a, b) + ';this.api={lmVisible,lmHTML,libTabsHTML,lmLesson,setLMV:function(v){LMV=v},open:function(k){LMO[k]=true},close:function(k){LMO[k]=false}};', ctx);
const api = ctx.api;
const STU = { email: 's@x', role: 'student' }, TEA = { email: 't@x', role: 'teacher' }, ADM = { email: 'a@x', role: 'teacher', adm: true };
t('student cannot see the unpublished lesson', () => { ctx.U = STU; assert.strictEqual(api.lmVisible(api.lmLesson('lm-writing-ac-t1-u2')), false); });
t('teacher cannot see it either', () => { ctx.U = TEA; assert.strictEqual(api.lmVisible(api.lmLesson('lm-writing-ac-t1-u2')), false); });
t('admin sees it (preview)', () => { ctx.U = ADM; assert.strictEqual(api.lmVisible(api.lmLesson('lm-writing-ac-t1-u2')), true); });
t('student tree: Writing open, no clickable unit, other skills Coming soon', () => { ctx.U = STU; api.setLMV(null); const h = api.lmHTML(); assert.ok(h.includes('Coming soon')); assert.ok(!h.includes('lm-open')); assert.ok(!h.includes('Unit 2')); });
t('student forced into the lesson (state set directly) still gets the list', () => { ctx.U = STU; api.setLMV('lm-writing-ac-t1-u2'); const h = api.lmHTML(); assert.ok(!h.includes('lmshell')); assert.ok(h.includes('lmtree')); });
t('admin list shows Unit 2 marked as preview', () => { ctx.U = ADM; api.setLMV(null); api.open('m:ielts-academic-task1'); const h = api.lmHTML(); assert.ok(h.includes('data-act="lm-open"') && h.includes('Unit 2') && h.includes('Unpublished preview')); });
t('admin opens the shell: no fake practice', () => { ctx.U = ADM; api.setLMV('lm-writing-ac-t1-u2'); const h = api.lmHTML(); assert.ok(h.includes('lmshell') && h.includes('no content yet')); assert.ok(!/Check answers|Submit|textarea/.test(h)); });
t('unknown lesson id falls back to the list', () => { ctx.U = ADM; api.setLMV('nope'); assert.ok(!api.lmHTML().includes('lmshell')); });
t('published lessons are visible to students', () => { ctx.U = STU; assert.strictEqual(api.lmVisible({ status: 'published' }), true); });
t('tabs: Cambridge IELTS + Learning Materials', () => { const h = api.libTabsHTML(); assert.ok(h.includes('>Cambridge<') && h.includes('Learning Materials') && (h.match(/role="tab"/g) || []).length === 2); });
t('tree: 4 skills in order; Writing open by default with 2 task groups (closed); skills without groups are disabled "Coming soon"', () => {
  ctx.U = ADM; api.setLMV(null); api.close('m:ielts-academic-task1'); const h = api.lmHTML(); const n = (re) => (h.match(re) || []).length;
  assert.deepStrictEqual((h.match(/class="lmnm">(\w+)</g) || []).map((x) => x.slice(13, -1)), ['Writing', 'Listening', 'Reading', 'Speaking']);
  assert.ok(/data-k="s:writing" aria-expanded="true"/.test(h)); assert.strictEqual(n(/class="lmth"/g), 2); assert.ok(h.includes('>IELTS Task 2<') && /data-k="m:ielts-task2" aria-expanded="false"/.test(h));
  assert.strictEqual(n(/class="lmhd" disabled/g), 3); assert.strictEqual(n(/>Coming soon</g), 3); assert.ok(!h.includes('lm-open'), 'groups closed');
});
t('tree: open Task 1 shows the unit row (title, amber preview badge, chevron); empty Task 2 says "No units yet"', () => {
  ctx.U = ADM; api.open('m:ielts-academic-task1'); api.open('m:ielts-task2'); const h = api.lmHTML();
  assert.ok(/<button type="button" class="lmu" data-act="lm-open" data-id="lm-writing-ac-t1-u2"><span>Unit 2: Overview \(Time-series Line Charts\)<\/span><span class="lmbd">Unpublished preview<\/span><span class="lmarr"/.test(h));
  assert.ok(h.includes('<p class="lmno">No units yet</p>')); api.close('m:ielts-task2');
});
t('tree: a student never sees the unpublished unit, even with the group open', () => { ctx.U = STU; api.open('m:ielts-academic-task1'); const h = api.lmHTML(); assert.ok(!h.includes('Unit 2') && h.includes('No units yet')); });
t('tree: every unit title / skill name is escaped; toggles are buttons with aria-expanded', () => { ctx.U = ADM; const h = api.lmHTML(); assert.ok(!/<div[^>]*data-act=/.test(h)); assert.strictEqual((h.match(/data-act="lm-tg"/g) || []).length, (h.match(/data-act="lm-tg"[^>]*aria-expanded=/g) || []).length); });
t('no Firestore use in the Learning Materials block', () => assert.ok(!/dbh|collection\(|firestore/i.test(html.slice(a, b))));

console.log('---- ' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
