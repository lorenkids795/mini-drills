// Reading workspace (11/2026): highlights (modes, saved per account + lesson + version, found again by their words), paragraphs
// that fold, Pronouns in a side panel (no modal) with paragraphs without a question word folded, broken AI explanations blocked.
// Real app code (tests/app-harness.js) and the real server source. No network, no browser.
// Run: node tests/reading-workspace.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'parseReading:parseReading,EXAMPLE_R:EXAMPLE_R,renderRLesson:renderRLesson,get RM(){return RM},rmDraw:rmDraw,rmStage2:rmStage2,rmPnPanelHTML:rmPnPanelHTML,rmPLHTML:rmPLHTML,' +
  'rmPcToggle:rmPcToggle,hlHTML:hlHTML,hlFix:hlFix,hlApply:hlApply,rmHlKey:rmHlKey,rdPref:rdPref,rdPrefSet:rdPrefSet,rmTextIssue:rmTextIssue,rmSafe:rmSafe,rmQualityProblems:rmQualityProblems,rdBlame:rdBlame,rmToolsHTML:rmToolsHTML,rmSplitPct:rmSplitPct';
const clone = (o) => JSON.parse(JSON.stringify(o));
function lesson(user) {
  const B = boot({ hooks: HOOKS, user }), ex = JSON.parse(B.T.EXAMPLE_R), r = B.T.parseReading(ex);
  assert.ok(r.data, 'example lesson parses: ' + JSON.stringify(r.errs));
  B.T.renderRLesson({ id: 'r1', skill: 'reading', title: 'Cycling in the City', kind: 'reading-ms', rl: r.data.rlesson, qs: r.data.qs }, '', '', null);
  return { B, ex, D: r.data.rlesson };
}
const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest');
const srv = () => { const ctx = vm.createContext({ console: { log() {}, error() {} }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, fetch: async () => ({}) });
  vm.runInContext(SRC + '\n;this.T={partProblems,textIssue};', ctx, { filename: 'server.js' }); return ctx.T; };
const FINE = Array(40).fill('fine').join(' ');

t('layout: full-width workspace; passage 60% / questions 40% to start, divider 30–75%; demo helper and highlighting are in Settings', () => {
  const { B } = lesson(), h = B.el('libBody').innerHTML;
  assert.ok(/class="pane single rm rmwide"/.test(h) && /--rmp:60%/.test(h) && /aria-valuemin="30" aria-valuemax="75" aria-valuenow="60"/.test(h));
  assert.ok(!/<div id="rmBody"><div class="lsdemo"/.test(h), 'no demo strip in the lesson body');
  B.T.RM.fsOpen = true; const s = B.T.rmToolsHTML();
  assert.ok(/aria-label="Text highlighting"/.test(s) && /data-v="off"/.test(s) && /data-v="quick" aria-checked|aria-checked="true" data-act="rm-hlm" data-v="quick"/.test(s) && /data-v="choose"/.test(s) && /id="dmBar"/.test(s));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(/\.pane\.single\.rm\{max-width:none;width:100%/.test(html) && /\.rm \.rmp\{max-width:72ch\}/.test(html));
  ['--mk-b:#bfdbfe', '--mk-b:#1f3d73'].forEach((c) => assert.ok(html.includes(c), c));
  assert.strictEqual((html.match(/--mk-b:/g) || []).length, 3, 'blue highlight colour in light + both dark blocks');
});
t('highlights: passage, instructions, question text and answer labels are highlightable; numbers and inputs are not text', () => {
  const { B } = lesson(), h = B.el('libBody').innerHTML;
  assert.ok(/<p class="rmp" id="rmp_\d+" data-pi="\d+" data-hl="p\d+"/.test(h), 'passage');
  assert.ok(/class="muted rmins" data-hl="ins_[ktmh]"/.test(h), 'instructions');
  assert.ok(/data-hl="t0"/.test(h) && /data-hl="k0a"/.test(h), 'question text (TFNG, completion around the blank)');
  assert.ok(/<span data-hl="o_rmt0_0">/.test(h), 'answer labels');
});
t('highlights: saved per account + lesson + version; found again by their words when the text moves; dropped when the words are gone', () => {
  const { B } = lesson();
  assert.strictEqual(B.T.rmHlKey(), 'md-rmhl:admin@x.com:r1:medium');
  const plain = 'Cities are building more bike lanes every year.';
  B.T.hlApply({ key: 'p0', s: 11, e: 19, q: 'building', plain }, 'g');
  assert.deepStrictEqual(JSON.parse(B.W.localStorage.getItem('md-rmhl:admin@x.com:r1:medium')).p0, [{ s: 11, e: 19, c: 'g', q: 'building' }]);
  assert.ok(/are <mark class="rmhl g">building<\/mark> more/.test(B.T.hlHTML('p0', plain)));
  assert.ok(/Today <mark class="rmhl g">building<\/mark>/.test(B.T.hlHTML('p0', 'Today building is fast.')), 'moved: found by its words');
  assert.ok(!/<mark/.test(B.T.hlHTML('p0', 'Nothing here matches.')), 'words gone: no highlight on other words');
  B.T.hlApply({ key: 'p0', s: 11, e: 19, q: 'building', plain }, 'x');
  assert.ok(!('p0' in JSON.parse(B.W.localStorage.getItem('md-rmhl:admin@x.com:r1:medium'))), 'remove');
  const esc = B.T.hlHTML('zz', '<b>x</b>'); assert.ok(!/<b>/.test(esc), 'text is escaped');
});
t('highlight mode: Quick highlight by default; Off / Choose colors saved for this account; preview keeps highlights for the session only', () => {
  const { B } = lesson();
  assert.strictEqual(B.T.rdPref().hl, 'quick');
  B.press({ act: 'rm-hlm', v: 'off' }); assert.strictEqual(B.T.rdPref().hl, 'off');
  B.press({ act: 'rm-hlm', v: 'choose' }); assert.strictEqual(B.T.rdPref().hl, 'choose');
  assert.ok(/"hl":"choose"/.test(B.W.localStorage.getItem('md-rdpref:admin@x.com')));
  B.T.RM.root = {}; assert.strictEqual(B.T.rmHlKey(), '', 'Create preview: nothing saved on the device');
});
t('first-time tip: shown once to a student ("Highlight while reading" … "Got it!"); Got it saves it; teachers do not get it automatically', () => {
  const S = lesson({ name: 'Minh', email: 'stu@x.com', role: 'student' });
  assert.ok(S.B.T.RM.tipOpen); const h = S.B.T.rmToolsHTML();
  assert.ok(/Highlight while reading/.test(h) && /Select words or sentences to highlight them\. You can change highlight modes or turn highlighting off anytime in Settings\./.test(h) && /data-act="rm-tipok">Got it!/.test(h));
  S.B.press({ act: 'rm-tipok' }); assert.ok(!S.B.T.RM.tipOpen && S.B.T.rdPref().tip);
  const A = lesson(); assert.ok(!A.B.T.RM.tipOpen); A.B.T.RM.fsOpen = true; assert.ok(/data-act="rm-tipshow"/.test(A.B.T.rmToolsHTML()), 'admin can replay it');
});
t('paragraphs fold: label with a chevron button (aria-expanded / aria-controls); toggling hides only that paragraph', () => {
  const { B } = lesson(), h = B.el('libBody').innerHTML;
  assert.ok(/<div class="rmpl" data-pl="\d+"><button type="button" class="rmpct" data-act="rm-pc" data-pi="\d+" aria-expanded="true" aria-controls="rmp_\d+"/.test(h));
  B.T.rmPcToggle(1); assert.ok(B.T.RM.cm[1] && !B.T.RM.cm[0]); assert.ok(/aria-expanded="false"/.test(B.T.rmPLHTML(1)) && /aria-expanded="true"/.test(B.T.rmPLHTML(0)));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(/addEventListener\('dblclick'/.test(html) && /n-RMTAP\.t<350/.test(html), 'double-click + double-tap on the label');
});
t('Pronouns: passage left + side panel (no sheet/modal); empty state; a word opens its question; answers kept when switching', () => {
  const { B, D } = lesson(); B.T.RM.st = 1; B.T.rmDraw(); const h = B.el('libBody').innerHTML;
  assert.ok(/<div class="rmdeep"/.test(h) && /<div id="rmPnPanel"><p class="muted rmpnhint">Select a bold word in the passage to answer\.<\/p>/.test(h));
  assert.ok(/class="rmpn" data-act="rm-pn" data-rmq="n0" data-i="0"/.test(h) && !/msheet|rmsheet/.test(h));
  B.press({ act: 'rm-pn', i: '0' }); assert.strictEqual(B.T.RM.pcur, 0);
  const p = B.el('rmPnPanel').innerHTML; assert.ok(new RegExp('What does “' + D.prons[0].w + '” refer to\\?').test(p) && /name="rmp0"/.test(p));
  B.T.RM.pr[0] = 1; B.press({ act: 'rm-pn', i: String(D.prons.length > 1 ? 1 : 0) }); assert.strictEqual(B.T.RM.pr[0], 1, 'answer kept');
  assert.ok(!/msheet/.test(B.el('rmPnPanel').innerHTML));
});
t('Pronouns: paragraphs without a question word start folded (from the lesson data), once; the learner can open them', () => {
  const { B, D } = lesson(); B.T.RM.st = 1; B.T.rmDraw();
  const has = (i) => D.prons.some((x) => x.p === i);
  D.paras.forEach((_, i) => assert.strictEqual(!!B.T.RM.c2[i], !has(i), 'paragraph ' + i));
  const fold = D.paras.findIndex((_, i) => !has(i));
  if (fold >= 0) { B.T.rmPcToggle(fold); B.T.rmDraw(); assert.ok(!B.T.RM.c2[fold], 'opened by the learner stays open after redraw'); }
  B.T.RM.st = 0; assert.ok(!B.T.RM.cm || !B.T.RM.cm[fold], 'Deep reading has its own fold state');
});
t('Vocabulary: "fine fine …" and other loops are found; normal explanations pass; broken text is never shown', () => {
  const { B } = lesson();
  assert.ok(B.T.rmTextIssue(FINE, 60)); assert.ok(B.T.rmTextIssue('the bike lane the bike lane the bike lane the bike lane is new', 60));
  assert.strictEqual(B.T.rmTextIssue('“Commute” in the passage means travelling to work, and the question says “journey to work”, so they match.', 60), '');
  assert.ok(/Explanation unavailable/.test(B.T.rmSafe(FINE)) && B.T.rmSafe('Plain reason.') === 'Plain reason.');
});
t('Vocabulary: parseReading blocks a looping explanation and a distractor that equals a paraphrase; messages go to the right part', () => {
  const { B, ex } = lesson();
  const a = clone(ex); a.pairs[0].why = FINE; let r = B.T.parseReading(a);
  assert.ok(r.errs && r.errs.some((m) => /^Phrase 1: the explanation/.test(m)), JSON.stringify(r.errs)); assert.strictEqual(B.T.rdBlame(r.errs[0]), 'output');
  const b = clone(ex); b.pdist = b.pairs[1].par; r = B.T.parseReading(b);
  assert.ok(r.errs && r.errs.some((m) => /pdist.*same as Phrase 2/.test(m)));
  const c = clone(ex); c.words[0].en = FINE; r = B.T.parseReading(c);
  assert.ok(r.errs && r.errs.some((m) => /^Word 1:/.test(m))); assert.strictEqual(B.T.rdBlame(r.errs.find((m) => /^Word 1/.test(m))), 'vocab');
  assert.ok(B.T.parseReading(clone(ex)).data, 'the normal example still passes');
});
t('server: partProblems refuses looping explanations and duplicate paraphrases at generation', () => {
  const S = srv(), base = { pairs: [{ ph: 'a b', p: 1, par: 'one two', why: 'ok' }, { ph: 'c d', p: 1, par: 'three four', why: 'ok' }], pdist: 'five six', cloze: { text: 'x {{1}}', answers: ['y'] }, wprompt: 'q?' };
  assert.strictEqual(S.partProblems('output', clone(base), 3).length, 0);
  const a = clone(base); a.pairs[0].why = FINE; assert.ok(S.partProblems('output', a, 3).some((m) => /Phrase 1/.test(m)));
  const b = clone(base); b.pdist = 'One two'; assert.ok(S.partProblems('output', b, 3).some((m) => /pdist/.test(m)));
  const v = { prons: [{ w: 'it', why: FINE }], words: [{ en: 'x' }, { en: 'y' }, { en: 'z' }] }; assert.ok(S.partProblems('vocab', v, 3).some((m) => /Pronoun 1/.test(m)));
});

t('Admin › Reading check: scan reads saved lessons and changes nothing; clearing one explanation asks first, keeps a backup, changes only that field', () => {
  const B = boot({ hooks: HOOKS + ',get customDocs(){return customDocs},rdcScan:rdcScan,get RDC(){return RDC},rebuildCustom:rebuildCustom,get AD(){return AD},renderAdmin:renderAdmin' });
  const ex = JSON.parse(B.T.EXAMPLE_R), rl = B.T.parseReading(ex).data.rlesson; rl.pairs[0].why = FINE;
  B.T.customDocs.push({ id: 'abc', title: 'Broken lesson', skill: 'reading', bookId: 'cam14', testId: 't1', rlesson: rl, rlevels: { easy: JSON.parse(JSON.stringify(rl)) } });
  B.T.rebuildCustom(); const before = JSON.stringify(B.T.customDocs[0]);
  const rows = B.T.rdcScan(); assert.ok(rows.length >= 2 && rows.every((r) => r.f === 'pairs.0.why'), JSON.stringify(rows));
  assert.strictEqual(JSON.stringify(B.T.customDocs[0]), before, 'scan changes nothing');
  B.T.AD.sub = 'rdcheck'; B.press({ act: 'ad-rdc-fix', i: '0' }); assert.ok(/Clear this explanation/.test(B.asking())); B.cancel();
  assert.strictEqual(JSON.stringify(B.T.customDocs[0]), before, 'cancel changes nothing');
  B.press({ act: 'ad-rdc-fix', i: '0' }); B.ok();
  const d = B.T.customDocs[0]; assert.strictEqual(d.rlesson.pairs[0].why, ''); assert.strictEqual(d.rlevels.easy.pairs[0].why, FINE, 'only the chosen version');
  assert.strictEqual(d.rlesson.pairs[0].par, rl.pairs[0].par, 'other fields unchanged');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); assert.ok(/localStorage\.setItem\('md-rdfix:'/.test(html), 'backup before the change');
});

out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
