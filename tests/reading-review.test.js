// Create › Reading › Review Medium: Medium first, teacher feedback, Fix with AI, accept / reject / undo, Approve Medium,
// Easy / Hard from the approved Medium, outdated versions, Add gate. Real app code (tests/app-harness.js) with a fake /api,
// and the real server prompt for op 'revise'. No network. Run: node tests/reading-review.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'get RD(){return RD},get CP(){return CP},get RV(){return RV},rdGen:rdGen,rdRetry:rdRetry,rdRvAct:rdRvAct,rdRvHTML:rdRvHTML,rdIssues:rdIssues,rdApproved:rdApproved,' +
  'rdLevels:rdLevels,rdOutdated:rdOutdated,rdMedSig:rdMedSig,cpValid:cpValid,cpOk:cpOk,cpAddBarHTML:cpAddBarHTML,EXAMPLE_R:EXAMPLE_R,rdBuildDemoTx:rdBuildDemoTx,get parsed(){return parsed}';
const PARTS = { deep: ['deep'], vocab: ['title', 'prons', 'words'], output: ['pairs', 'pdist', 'cloze', 'wprompt', 'wguide'] };
const clone = (o) => JSON.parse(JSON.stringify(o));
// gen(part, level, body) / rev(part, body) may return {status, body} to change the fake server's answer
function app(o) {
  o = o || {}; const B = boot({ hooks: HOOKS }), ex = JSON.parse(B.T.EXAMPLE_R), seen = [];
  B.T.CP.skill = 'reading'; B.T.CP.slot = 1; B.T.RD.tx = B.T.rdBuildDemoTx(); B.T.RD.title = '';
  const good = (k) => { const r = {}; PARTS[k].forEach((f) => { if (ex[f] !== undefined) r[f] = clone(ex[f]); }); if (o.mutate) o.mutate(k, r); return r; };
  B.W.reply = (url, opt) => { const b = JSON.parse(opt.body); seen.push(b);
    if (b.op === 'revise') { const r = o.rev && o.rev(b.part, b); return r || { status: 200, body: { part: b.part, out: clone(b.current) } }; }
    const r = o.gen && o.gen(b.part, b.level, b); return r || { status: 200, body: { part: b.part, level: b.level, out: good(b.part) } }; };
  return { B, T: B.T, seen, ex };
}
const settle = async (A) => { for (let i = 0; i < 60 && (A.T.RD.busy || A.T.RV.busy); i++) await A.B.flush(); };
const act = async (A, a, ds) => { const r = A.T.rdRvAct(a, { dataset: ds || {} }); await settle(A); return r; };
const gen = async (A) => { A.T.rdGen(); await settle(A); };
const C2_LONG = (k, r) => { if (k === 'deep') r.deep.exercises.completion.items[1].answer = 'significant investment in'; };

(async () => {
  await t('Generate = Medium only (3 requests); Easy / Hard wait; Add off "Approve Medium first"; Review Medium panel in the preview', async () => {
    const A = app(); await gen(A);
    assert.deepStrictEqual(A.seen.map((b) => b.level + ':' + b.part), ['medium:deep', 'medium:vocab', 'medium:output']);
    assert.ok(A.T.cpOk() && !A.T.cpValid() && /Approve Medium first/.test(A.T.cpAddBarHTML()));
    const h = A.T.rdRvHTML(); assert.ok(/id="rdRv"/.test(h) && />Reading lesson</.test(h) && /aria-current="step">Review &amp; approve Medium</.test(h) && /class="pill pend">Needs review</.test(h) && /data-act="rd-appr">Approve Medium</.test(h));
    assert.ok(/What should AI change\?/.test(h) && /data-act="rd-fb" disabled/.test(h), 'feedback box, button off while empty');
    assert.ok(!/data-act="rd-der"/.test(h) && !/class="rdvers"/.test(h), 'no Easy / Hard actions or version list before approval');
    await act(A, 'rd-der', { v: 'easy' }); assert.strictEqual(A.seen.length, 3, 'no Easy before approval');
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); assert.ok(/box\.insertAdjacentHTML\('afterbegin',rdRvHTML\(\)\)/.test(src), 'panel sits in the preview column (stays when the editor is hidden)');
  });
  await t('Apply feedback with AI: one revise request per part with the current part, passage and feedback; proposal with changes; Accept replaces Medium; Undo restores', async () => {
    const A = app({ rev: (k, b) => { const c = clone(b.current); if (k === 'deep') c.deep.exercises.completion.items[0].prompt_with_blank = 'Copenhagen built ______ lanes so that cyclists stay safe.'; return { status: 200, body: { out: c } }; } });
    await gen(A); A.T.RV.fb = 'Make Question 1 clearer and keep the answer within two words'; A.T.RV.scope = 'deep'; await act(A, 'rd-fb');
    const R = A.seen.filter((b) => b.op === 'revise'); assert.strictEqual(R.length, 1); assert.ok(R[0].part === 'deep' && R[0].current.deep && R[0].passage === A.T.RD.tx && /Question 1 clearer/.test(R[0].feedback));
    let h = A.T.rdRvHTML(); assert.ok(/AI proposal · Deep reading/.test(h) && /completion · 1 · prompt_with_blank: “Copenhagen has a network/.test(h) && /data-act="rd-pacc">Accept revision/.test(h));
    const before = JSON.stringify(A.T.parsed.rlesson.deep); await act(A, 'rd-pacc');
    assert.ok(/Copenhagen built/.test(JSON.stringify(A.T.parsed.rlesson.deep)) && JSON.stringify(A.T.parsed.rlesson.deep) !== before, 'preview shows the revision');
    assert.strictEqual(A.T.RD.job.hist.length, 1); await act(A, 'rd-undo'); assert.strictEqual(JSON.stringify(A.T.parsed.rlesson.deep), before, 'Undo restores');
  });
  await t('Reject keeps the current Medium; a failed revision changes nothing and says so', async () => {
    const A = app({ rev: (k, b) => ({ status: 200, body: { out: Object.assign(clone(b.current), { wprompt: 'Changed?' }) } }) });
    await gen(A); const before = JSON.stringify(A.T.RD.job.pt.medium); A.T.RV.fb = 'x'; A.T.RV.scope = 'output'; await act(A, 'rd-fb'); await act(A, 'rd-prej');
    assert.strictEqual(JSON.stringify(A.T.RD.job.pt.medium), before); assert.ok(!A.T.RD.job.prop);
    const Z = app({ rev: () => ({ status: 502, body: { error: 'The AI could not revise this part (code: relay_busy).', code: 'relay_busy' } }) });
    await gen(Z); const b2 = JSON.stringify(Z.T.RD.job.pt.medium); Z.T.RV.fb = 'x'; Z.T.RV.scope = 'vocab'; await act(Z, 'rd-fb');
    assert.ok(/Nothing was changed/.test(Z.T.rdRvHTML()) && JSON.stringify(Z.T.RD.job.pt.medium) === b2 && !Z.T.RD.job.prop);
  });
  await t('a 3-word answer in a TWO WORDS question: listed as left out with Fix with AI; Approve off; fixed → revalidated → Approve on', async () => {
    const A = app({ mutate: C2_LONG, rev: (k, b) => { const c = clone(b.current); c.deep.exercises.completion.items[1].answer = 'significant investment'; return { status: 200, body: { out: c } }; } });
    await gen(A); let h = A.T.rdRvHTML();
    assert.ok(/Items left out of the lesson/.test(h) && /Deep reading<\/span> Completion 2 was left out: the answer &quot;significant investment in&quot; has more than 2 words/.test(h) && /data-act="rd-fix" data-i="0"/.test(h));
    assert.ok(/data-act="rd-appr" disabled/.test(h) && /class="pill bad">Draft</.test(h)); await act(A, 'rd-appr'); assert.ok(!A.T.rdApproved(), 'no approval with an item left out');
    await act(A, 'rd-fix', { i: '0' }); const R = A.seen.filter((b) => b.op === 'revise'); assert.ok(R.length === 1 && R[0].part === 'deep' && /Completion 2 was left out/.test(R[0].issues[0]));
    h = A.T.rdRvHTML(); assert.ok(/Fixed: Completion 2 was left out/.test(h));
    await act(A, 'rd-pacc'); assert.strictEqual(A.T.rdIssues().left.length, 0); assert.ok(A.T.parsed.rlesson.deep.comp.items.some((x) => x.a.indexOf('significant investment') >= 0), 'the fixed item is back');
    await act(A, 'rd-appr'); assert.ok(A.T.rdApproved());
  });
  await t('an AI "fix" that changes nothing is not marked fixed and cannot be accepted (honest error state)', async () => {
    const A = app({ mutate: C2_LONG }); await gen(A); await act(A, 'rd-fix', { i: '0' }); const h = A.T.rdRvHTML();
    assert.ok(/Still a problem: Completion 2/.test(h) && /data-act="rd-pacc" disabled/.test(h) && /The AI made no changes/.test(h));
  });
  await t('blocking problems: Approve stays off; the teacher may keep a lesson without items left out only by ticking the box', async () => {
    const A = app({ mutate: (k, r) => { if (k === 'output') r.pairs = r.pairs.slice(0, 1); }, rev: (k, b) => { const c = clone(b.current); c.pairs = clone(A.ex.pairs); return { status: 200, body: { out: c } }; } }); await gen(A);
    let h = A.T.rdRvHTML(); assert.ok(!A.T.cpOk() && /Problems to fix before approving/.test(h) && /Paraphrases \+ Output<\/span> Paraphrases: &quot;pairs&quot; has 1 item/.test(h) && /data-act="rd-appr" disabled/.test(h));
    await act(A, 'rd-appr'); assert.ok(!A.T.rdApproved());
    await act(A, 'rd-fix', { i: '0' }); assert.ok(A.seen.some((b) => b.op === 'revise' && b.part === 'output')); await act(A, 'rd-pacc');
    assert.ok(A.T.cpOk() && A.T.rdIssues().errs.length === 0); await act(A, 'rd-appr'); assert.ok(A.T.rdApproved() && A.T.cpValid(), 'fixed, approved, addable');
    const L = app({ mutate: C2_LONG }); await gen(L); L.T.RD.job.ackLeft = L.T.rdMedSig(L.T.RD.job); await act(L, 'rd-appr'); assert.ok(L.T.rdApproved(), 'approved after ticking');
  });
  await t('after approval: Generate Easy only → Easy requests carry the approved Medium part (base); Hard independent; Add on', async () => {
    const A = app(); await gen(A); await act(A, 'rd-appr'); await act(A, 'rd-der', { v: 'easy' });
    const E = A.seen.filter((b) => b.level === 'easy'); assert.strictEqual(E.length, 3); assert.ok(E.every((b) => b.base && JSON.stringify(b.base) === JSON.stringify(A.T.RD.job.pt.medium[b.part].out)));
    assert.ok(!A.seen.some((b) => b.level === 'hard') && A.T.rdLevels().easy && A.T.cpValid());
    await act(A, 'rd-der', { v: 'hard' }); assert.ok(A.T.rdLevels().hard && A.seen.filter((b) => b.level === 'hard').length === 3);
  });
  await t('a failed Easy part (relay) keeps the approved Medium and Hard; only the failed part is retried', async () => {
    let bad = true; const A = app({ gen: (k, l) => (l === 'easy' && k === 'vocab' && bad ? { status: 502, body: { error: 'relay setup', code: 'relay' } } : null) });
    await gen(A); await act(A, 'rd-appr'); await act(A, 'rd-der', { v: 'both' });
    assert.ok(A.T.rdApproved() && !A.T.rdLevels() || !(A.T.rdLevels() || {}).easy); assert.ok(/Failed: Pronouns \+ Vocabulary \(relay\)/.test(A.T.rdRvHTML()));
    bad = false; const n = A.seen.length; A.T.rdRetry(); await settle(A); assert.deepStrictEqual(A.seen.slice(n).map((b) => b.level + ':' + b.part).slice(0, 2), ['easy:vocab', 'easy:output']);
    assert.ok(A.T.rdApproved() && A.T.rdLevels().easy);
  });
  await t('editing Medium after Easy / Hard were made: they become Outdated (not used by Add), approval is needed again; Keep this version is explicit', async () => {
    const A = app({ rev: (k, b) => ({ status: 200, body: { out: Object.assign(clone(b.current), { wprompt: 'Should cities pay for bike lanes?' }) } }) });
    await gen(A); await act(A, 'rd-appr'); await act(A, 'rd-der', { v: 'both' }); assert.ok(A.T.rdLevels().easy && A.T.rdLevels().hard);
    A.T.RV.fb = 'Change 4.2'; A.T.RV.scope = 'output'; await act(A, 'rd-fb'); await act(A, 'rd-pacc');
    assert.ok(!A.T.rdApproved() && A.T.rdOutdated('easy') && !A.T.rdLevels() && !A.T.cpValid());
    await act(A, 'rd-appr'); let h = A.T.rdRvHTML(); assert.ok(/Outdated: Medium changed after this version was made/.test(h) && /data-act="rd-keep" data-v="easy"/.test(h) && !A.T.rdLevels());
    await act(A, 'rd-keep', { v: 'easy' }); assert.ok(A.T.rdLevels().easy && !A.T.rdLevels().hard && A.T.cpValid());
  });
  await t('server: op revise = staff only, the current part + passage + teacher words + problems, same part schema, separate daily limit', () => {
    const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8');
    assert.ok(/if \(body\.op === 'revise'\) return aiReadingRevise\(env, em, body, passage, title, P\);/.test(SRC) && SRC.indexOf("if (body.op === 'revise')") > SRC.indexOf('const em = await staffEmail(env, request);'));
    assert.ok(/'ailv:' \+ em/.test(SRC) && /TEACHER REQUEST/.test(SRC) && /PROBLEMS FOUND BY THE APP/.test(SRC) && /askGemini\(env, full, def\.schema, '', AI_TIMEOUT\);[\s\S]{0,1500}partProblems\(part, o, P\.length\)/.test(SRC));
    assert.ok(/APPROVED MEDIUM VERSION OF THIS PART/.test(SRC), 'Easy / Hard prompt uses the approved Medium');
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
