// Create › Reading › Advanced: Upload JSON file / paste JSON with 1 or 3 versions (no AI call), checks, Add to the chosen slot, replace confirm.
// Real app code (tests/app-harness.js) + the real server prompt. Also writes nothing: the sample files live in tests/fixtures/.
// Run: node tests/reading-import.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'get RD(){return RD},get CP(){return CP},rdImport:rdImport,rdLvHTML:rdLvHTML,rdLevels:rdLevels,cpValid:cpValid,EXAMPLE_R:EXAMPLE_R,rdBuildDemoTx:rdBuildDemoTx,' +
  'get parsed(){return parsed},addExercise:addExercise,get localCustom(){return localCustom},rebuildCustom:rebuildCustom,get customMap(){return customMap},slotsOf:slotsOf';
const FIX = path.join(__dirname, 'fixtures');
const VALID = JSON.parse(fs.readFileSync(path.join(FIX, 'reading-import-valid.json'), 'utf8'));
const INVALID = JSON.parse(fs.readFileSync(path.join(FIX, 'reading-import-invalid.json'), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const app = (withPassage) => { const B = boot({ hooks: HOOKS }); B.T.CP.skill = 'reading'; B.T.CP.book = 'cam14'; B.T.CP.test = 't2'; B.T.CP.slot = 2; B.T.RD.tx = withPassage === false ? '' : B.T.rdBuildDemoTx(); return B; };

(async () => {
  await t('sample files: valid one has medium / easy / hard; invalid one has a 1-item "pairs" in Easy and no Hard', () => {
    assert.ok(VALID.medium && VALID.easy && VALID.hard); assert.strictEqual(INVALID.easy.pairs.length, 1); assert.ok(!INVALID.hard);
  });
  await t('valid 3-version file: all 3 checked, preview has Easy / Medium / Hard, passage unchanged in each, Add on, no AI call', () => {
    const B = app(); B.T.rdImport(JSON.stringify(VALID));
    assert.ok(B.T.cpValid()); const lv = B.T.rdLevels(); assert.ok(lv && lv.easy && lv.hard);
    const tx = JSON.stringify(B.T.RD.tx.split(/\n\s*\n/)), strip = (rl) => JSON.stringify(rl.paras.map((p) => p.replace(/\{\{|\}\}/g, '')));
    [B.T.parsed.rlesson, lv.easy, lv.hard].forEach((rl) => assert.strictEqual(strip(rl), tx));
    assert.ok(/Checked: Medium, Easy, Hard/.test(B.T.RD.msg)); assert.strictEqual(B.W.calls.length, 0, 'no request at all');
    assert.strictEqual((B.T.rdLvHTML().match(/rdlv ok/g) || []).length, 3);
  });
  await t('invalid file: Easy "pairs" has 1 item -> Easy not used, exact message; Hard "not in the file"; Medium still addable', () => {
    const B = app(); B.T.rdImport(JSON.stringify(INVALID)); const h = B.T.rdLvHTML();
    assert.ok(/Easy<\/b> <span class="alerr rdperr">1 problem: Paraphrases: &quot;pairs&quot; has 1 item; it needs 2 to 6\./.test(h), h);
    assert.ok(/Hard<\/b> <span class="rdpts">not in the file \(students of this level get Medium\)/.test(h));
    assert.ok(B.T.cpValid() && !(B.T.rdLevels() || {}).easy); assert.ok(/A version with problems is not used/.test(B.T.RD.msg));
  });
  await t('Medium with problems (0 / 1 / 7 pairs) -> Add off for 0 and 1 (nothing can be saved); 7 -> first 6 used', () => {
    for (const n of [0, 1]) { const B = app(), f = clone(VALID); f.medium.pairs = f.medium.pairs.slice(0, n); B.T.rdImport(JSON.stringify(f));
      assert.ok(!B.T.cpValid(), n + ' pairs'); assert.ok(/Medium has problems/.test(B.T.RD.msg)); B.T.addExercise(); assert.strictEqual(B.T.localCustom.length, 0, 'nothing saved'); }
    const B = app(), f = clone(VALID); while (f.medium.pairs.length < 7) f.medium.pairs.push(clone(f.medium.pairs[0])); B.T.rdImport(JSON.stringify(f));
    assert.ok(B.T.cpValid()); assert.strictEqual(B.T.parsed.rlesson.pairs.length, 6);
  });
  await t('no "medium" version, broken JSON, or a version with a different passage text are rejected', () => {
    let B = app(); B.T.rdImport(JSON.stringify({ easy: VALID.easy })); assert.ok(!B.T.cpValid() && B.T.CP.last.errs.some((e) => /no "medium" version/.test(e)));
    B = app(); B.T.rdImport('{"medium": {'); assert.ok(!B.T.cpValid());
    B = app(false); const f = clone(VALID); f.hard.paras = f.hard.paras.map((p, i) => (i ? p : 'Rewritten by the AI. ' + p)); B.T.rdImport(JSON.stringify(f));
    assert.ok(/its passage text is different from the Medium version/.test(B.T.rdLvHTML()) && !(B.T.rdLevels() || {}).hard);
  });
  await t('one-lesson JSON (old way) still works = Medium only', () => {
    const B = app(); B.T.rdImport(B.T.EXAMPLE_R); assert.ok(B.T.cpValid() && !B.T.rdLevels()); assert.ok(/Checked: Medium only/.test(B.T.RD.msg));
  });
  await t('Add saves Medium + Easy + Hard to the chosen slot (book, test, passage); reload keeps them', () => {
    const B = app(); B.T.rdImport(JSON.stringify(VALID)); B.T.addExercise();
    const r = B.T.localCustom[0]; assert.ok(r && r.bookId === 'cam14' && r.testId === 't2' && r.part === 2 && r.skill === 'reading');
    assert.ok(r.rlesson && r.rlevels && r.rlevels.easy && r.rlevels.hard);
    B.T.rebuildCustom(); const c = Object.values(B.T.customMap).find((x) => x.title === r.title); assert.ok(c && c.rl && c.rlv.easy && c.rlv.hard, 'loaded back as a 3-version lesson');
  });
  await t('occupied slot: Add asks first; Cancel keeps the old lesson untouched', () => {
    const B = app(); B.T.rdImport(JSON.stringify(VALID)); B.T.addExercise(); B.T.rebuildCustom(); const first = JSON.stringify(B.T.localCustom);
    const f = clone(VALID); f.medium.title = 'Second lesson'; B.T.rdImport(JSON.stringify(f));
    let asked = ''; B.W.confirm = (m) => { asked = m; return false; }; B.T.addExercise();
    assert.ok(/Replace/.test(asked)); assert.strictEqual(JSON.stringify(B.T.localCustom), first, 'cancel = no change');
  });
  await t('server: "Copy prompt (3 versions)" asks for {medium, easy, hard} with the 3 level notes; the 1-version prompt is unchanged', () => {
    const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest');
    const ctx = vm.createContext({ console: { log() {} }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, Date, Math, JSON });
    vm.runInContext(SRC + ';this.T={readingPrompt3,RPROMPT};', ctx); const p = ctx.T.readingPrompt3();
    assert.ok(p.startsWith(ctx.T.RPROMPT) && /"medium": \{…the whole lesson…\}, "easy": \{…\}, "hard": \{…\}/.test(p) && /VERSION: EASY/.test(p) && /VERSION: HARD/.test(p) && /PASSAGE:\n$/.test(p));
    assert.ok(/op === 'prompt3'/.test(SRC) && /staffEmail\(env, request\);\s*if \(!em\) return staffLocked\(\);\s*if \(body\.op === 'prompt'\)/.test(SRC), 'staff only, like the other prompt');
  });
  await t('UI: Upload JSON file + Copy prompt in Advanced; a file over 1 MB is refused; students have no Create tab', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(html.includes('data-act="rd-file">Upload JSON file<') && html.includes('id="rdFile" accept=".json') && html.includes('file.size>1024*1024'));
    const S = boot({ hooks: 'tabsFor:tabsFor', user: { name: 'Lan', email: 'lan@x.com', role: 'student' } }); assert.ok(S.T.tabsFor().indexOf('create') < 0);
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
