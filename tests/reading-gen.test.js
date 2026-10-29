// Create › Reading: Generate in parts (3 versions x 3 parts), cut-off answers, "pairs" checks, retry of failed parts only, Add gate.
// Real app code (tests/app-harness.js) with a fake /api, and the real server source with a fake Gemini + KV. No network.
// Run: node tests/reading-gen.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'get RD(){return RD},get CP(){return CP},rdGen:rdGen,rdRetry:rdRetry,rdLvHTML:rdLvHTML,rdLevels:rdLevels,cpValid:cpValid,cpAddBarHTML:cpAddBarHTML,' +
  'EXAMPLE_R:EXAMPLE_R,rdBuildDemoTx:rdBuildDemoTx,parseReading:parseReading,rdApply:rdApply,get parsed(){return parsed},rdBlame:rdBlame,rdJobRestore:rdJobRestore';
const PARTS = { deep: ['deep'], vocab: ['title', 'prons', 'words'], output: ['pairs', 'pdist', 'cloze', 'wprompt', 'wguide'] };
const clone = (o) => JSON.parse(JSON.stringify(o));

// app with a fake /api/ai/reading: answer(part, level, n) → {status, body}
function app(answer) {
  const B = boot({ hooks: HOOKS }), ex = JSON.parse(B.T.EXAMPLE_R), seen = [];
  B.T.CP.skill = 'reading'; B.T.CP.slot = 1; B.T.RD.tx = B.T.rdBuildDemoTx(); B.T.RD.title = '';
  const good = (k) => { const r = {}; PARTS[k].forEach((f) => { if (ex[f] !== undefined) r[f] = clone(ex[f]); }); return r; };
  B.W.reply = (url, o) => {
    const b = JSON.parse(o.body); if (!/ai\/reading$/.test(url)) return { status: 200, body: {} };
    const n = seen.filter((x) => x.part === b.part && x.level === b.level).length; seen.push(b);
    const r = answer ? answer(b.part, b.level, n, good(b.part)) : null;
    return r || { status: 200, body: { part: b.part, level: b.level, out: good(b.part), model: 'fake' } };
  };
  return { B, seen, ex, good };
}
const run = async (A) => { A.B.T.rdGen(); for (let i = 0; i < 40 && A.B.T.RD.busy; i++) await A.B.flush(); assert.ok(!A.B.T.RD.busy, 'job still running'); };
const st = (A, l, k) => A.B.T.RD.job.pt[l][k].st;

// server: real aiReadingPart with a fake Gemini
const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest');
function server(gem) {
  const KV = {}, calls = [];
  const res = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
  const fetch = async (url, opt) => {
    if (!/generativelanguage/.test(String(url))) return res(404, {});
    const req = JSON.parse(opt.body), keys = Object.keys(((req.generationConfig || {}).responseSchema || {}).properties || {});
    calls.push({ keys, text: req.contents[0].parts[0].text });
    const g = gem(keys, calls.length);
    return res(200, { candidates: [{ content: { parts: [{ text: g.text }] }, finishReason: g.fr || 'STOP' }] });
  };
  const env = { GEMINI_KEY: 'k', GEMINI_MODELS: 'gemini-3.8-flash', MD_KV: { get: async (k) => (k in KV ? KV[k] : null), put: async (k, v) => { KV[k] = String(v); }, delete: async (k) => { delete KV[k]; } } };
  const ctx = vm.createContext({ fetch, console: { log() {}, error() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, clearTimeout, Date, Math, JSON, AbortController });
  vm.runInContext(SRC + '\n;this.T={aiReadingPart,readingParas,R_PARTS,RPROMPT,partProblems};', ctx, { filename: 'server.js' });
  return { T: ctx.T, env, KV, calls, call: async (body, passage) => { const P = ctx.T.readingParas(passage); const r = await ctx.T.aiReadingPart(env, 'admin@x.com', body, passage, '', P); return { status: r.status, d: JSON.parse(r.body) }; } };
}
// a 934-word passage in 7 paragraphs (like "What are you laughing at?")
const LONG = (() => { const w = 'Laughter is one of the oldest signals humans share and researchers now study why people laugh together in groups'.split(' '); const P = [];
  let n = 0; for (let p = 0; p < 7; p++) { const k = p < 3 ? 134 : 133; const a = []; for (let i = 0; i < k; i++) a.push(w[(n++) % w.length]); P.push(a.join(' ') + '.'); } return P.join('\n\n'); })();

(async () => {
  await t('934-word / 7-paragraph passage: accepted as it is, no "shorter" advice; split into 3 smaller prompts', async () => {
    assert.strictEqual(LONG.split(/\s+/).length, 934); assert.strictEqual(LONG.split(/\n\n/).length, 7);
    const S = server((keys) => ({ text: JSON.stringify(keys[0] === 'deep' ? { deep: { passage_id: 'x', entities: [], exercises: {} } } : {}) }));
    const r = await S.call({ part: 'vocab', level: 'medium', run: 'abcdefgh12' }, LONG);
    assert.strictEqual(r.status, 502); assert.ok(/"words" is missing/.test(r.d.error) && !/shorter/i.test(r.d.error));
    const P = S.T.R_PARTS; assert.ok(!/key_sentences|"timeline"|vocab_targets/.test(P.deep.prompt), 'deep part asks for no notes');
    assert.ok(/This request is ONE PART/.test(P.vocab.prompt) && !/"pairs"/.test(P.vocab.prompt) && !/"prons"/.test(P.output.prompt));
    assert.ok(P.deep.prompt.length < S.T.RPROMPT.length * 0.6 && P.output.prompt.length < S.T.RPROMPT.length * 0.6);
    assert.ok(S.calls[0].text.indexOf('[P7] ') > 0, 'the whole passage is sent, paragraph by paragraph');
  });
  await t('server: a cut-off answer (MAX_TOKENS) = code too_long with a "Retry failed part" message, never "shorter essay"; not saved', async () => {
    const S = server(() => ({ text: '', fr: 'MAX_TOKENS' }));
    const r = await S.call({ part: 'output', level: 'hard', run: 'abcdefgh12' }, LONG);
    assert.strictEqual(r.status, 502); assert.strictEqual(r.d.code, 'too_long'); assert.ok(/cut off/.test(r.d.error) && /Retry failed part/.test(r.d.error) && !/shorter/i.test(r.d.error));
    assert.ok(!Object.keys(S.KV).some((k) => /^ailk:/.test(k)), 'the part lock is released');
  });
  await t('server: "pairs" with 0 / 1 items is rejected with the exact count; 2 and 6 pass; 7 passes to the app (only 6 used)', async () => {
    const out = (n) => ({ pairs: Array.from({ length: n }, (_, i) => ({ ph: 'phrase ' + i, p: 1, par: 'para ' + i })), pdist: 'x', cloze: { text: 'a {{1}}', answers: ['b'], extra: 'c' }, wprompt: 'q?' });
    for (const n of [0, 1]) { const S = server(() => ({ text: JSON.stringify(out(n)) })), r = await S.call({ part: 'output', level: 'easy', run: 'abcdefgh12' }, LONG);
      assert.strictEqual(r.d.code, 'shape'); assert.ok(new RegExp('"pairs" has ' + n + ' paraphrase item').test(r.d.error), r.d.error); }
    for (const n of [2, 6, 7]) { const S = server(() => ({ text: JSON.stringify(out(n)) })), r = await S.call({ part: 'output', level: 'easy', run: 'abcdefgh12' }, LONG);
      assert.strictEqual(r.status, 200, n + ': ' + JSON.stringify(r.d)); assert.strictEqual(r.d.out.pairs.length, n); }
  });
  await t('server: the daily limit counts 1 per version of a run (like before: 3 per lesson), at most 8 requests per version', async () => {
    const S = server((keys) => ({ text: JSON.stringify(keys[0] === 'title' ? { title: 't', prons: [{ w: 'it' }], words: [{}, {}, {}] } : {}) }));
    for (const part of ['vocab', 'vocab', 'vocab']) await S.call({ part, level: 'medium', run: 'abcdefgh12', tzo: 0 }, LONG);
    await S.call({ part: 'vocab', level: 'easy', run: 'abcdefgh12', tzo: 0 }, LONG);
    const day = Object.keys(S.KV).filter((k) => /^ail:/.test(k)); assert.strictEqual(day.length, 1); assert.strictEqual(S.KV[day[0]], '2');
    for (let i = 0; i < 5; i++) await S.call({ part: 'vocab', level: 'medium', run: 'abcdefgh12', tzo: 0 }, LONG);
    const r = await S.call({ part: 'vocab', level: 'medium', run: 'abcdefgh12', tzo: 0 }, LONG); assert.strictEqual(r.status, 429); assert.strictEqual(r.d.code, 'runcap');
    const bad = await S.call({ part: 'vocab', level: 'medium', run: 'x' }, LONG); assert.ok(/missing run id/.test(bad.d.error));
  });
  await t('app: Generate = 9 real requests in order (Medium, Easy, Hard x 3 parts); passage unchanged in every version; Add on at the end', async () => {
    const A = app(); await run(A);
    assert.deepStrictEqual(A.seen.map((b) => b.level + ':' + b.part), ['medium:deep', 'medium:vocab', 'medium:output', 'easy:deep', 'easy:vocab', 'easy:output', 'hard:deep', 'hard:vocab', 'hard:output']);
    assert.ok(A.seen.every((b) => b.passage === A.B.T.RD.tx && b.run === A.seen[0].run), 'same passage + run id for every part');
    const tx = A.B.T.RD.tx.split(/\n\s*\n/), strip = (x) => x.replace(/\{\{|\}\}/g, '');
    const lv = A.B.T.rdLevels(); assert.ok(lv && lv.easy && lv.hard);
    [A.B.T.parsed.rlesson, lv.easy, lv.hard].forEach((rl) => assert.strictEqual(JSON.stringify(rl.paras.map(strip)), JSON.stringify(tx)));
    assert.ok(A.B.T.cpValid()); assert.ok(/Done: Medium, Easy, Hard/.test(A.B.T.RD.msg)); assert.ok(!/Retry failed part/.test(A.B.T.rdLvHTML()));
    assert.ok(A.seen.find((b) => b.part === 'output').words.length >= 3, 'vocab words are passed to the output part');
  });
  await t('app: Add stays off while parts are being written', async () => {
    const A = app(); A.B.T.rdGen(); assert.ok(A.B.T.RD.busy); assert.ok(!A.B.T.cpValid()); assert.ok(/Wait until every part is written/.test(A.B.T.cpAddBarHTML()) && /disabled/.test(A.B.T.cpAddBarHTML()));
    await run(A); assert.ok(A.B.T.cpValid());
  });
  await t('app: a cut-off part is sent once more by itself; still cut off → stops; Retry failed part sends ONLY that part; finished parts kept', async () => {
    let cut = true;
    const A = app((part, level) => (part === 'output' && level === 'easy' && cut ? { status: 502, body: { error: 'The AI could not write this part (code: too_long). The AI answer was cut off before it finished. The passage is fine: press Retry failed part.', code: 'too_long' } } : null));
    await run(A);
    assert.strictEqual(A.seen.filter((b) => b.level === 'easy' && b.part === 'output').length, 2, 'one automatic retry');
    assert.strictEqual(st(A, 'easy', 'output'), 'err'); assert.strictEqual(st(A, 'easy', 'deep'), 'ok'); assert.strictEqual(st(A, 'hard', 'output'), 'ok', 'Hard still written');
    assert.ok(A.B.T.cpValid(), 'Medium is ready: Add works (Easy falls back to Medium)'); assert.ok(!A.B.T.rdLevels().easy);
    const h = A.B.T.rdLvHTML(); assert.ok(/data-act="rd-retry"/.test(h) && /Easy · Paraphrases \+ Output: .*cut off/.test(h) && !/shorter/i.test(h));
    assert.ok(/Not finished: Easy · Paraphrases \+ Output/.test(A.B.T.RD.msg));
    const before = A.seen.length; cut = false; A.B.T.rdRetry(); for (let i = 0; i < 20 && A.B.T.RD.busy; i++) await A.B.flush();
    assert.deepStrictEqual(A.seen.slice(before).map((b) => b.level + ':' + b.part), ['easy:output']);
    assert.ok(A.B.T.rdLevels().easy && /Done: Medium, Easy, Hard/.test(A.B.T.RD.msg));
  });
  await t('app: invalid "pairs" (0 / 1 / 7 items) — nothing broken is used; exact item-level message; 7 → first 6 with a note', async () => {
    for (const n of [0, 1]) {
      const A = app((part, level, k, g) => { if (part !== 'output' || level !== 'medium') return null; g.pairs = g.pairs.slice(0, n); return { status: 200, body: { out: g } }; });
      await run(A);
      assert.strictEqual(st(A, 'medium', 'output'), 'err'); assert.strictEqual(st(A, 'medium', 'deep'), 'ok');
      assert.ok(!A.B.T.cpValid(), 'Add off'); assert.ok(A.seen.every((b) => b.level === 'medium'), 'Easy / Hard wait for Medium');
      assert.ok(new RegExp('Medium · Paraphrases \\+ Output: Paraphrases: &quot;pairs&quot; has ' + n + ' item').test(A.B.T.rdLvHTML()), A.B.T.rdLvHTML());
    }
    const A = app((part, level, k, g) => { if (part !== 'output') return null; while (g.pairs.length < 7) g.pairs.push(clone(g.pairs[0])); return { status: 200, body: { out: g } }; });
    await run(A); assert.ok(A.B.T.cpValid()); assert.strictEqual(A.B.T.parsed.rlesson.pairs.length, 6); assert.ok(A.B.T.parsed.rwarn.some((w) => /only the first 6/.test(w)));
  });
  await t('app: "pairs" with 2 items and with 6 items pass (no false failure)', async () => {
    for (const n of [2, 6]) {
      const A = app((part, level, k, g) => { if (part !== 'output') return null; while (g.pairs.length < n) g.pairs.push(clone(g.pairs[g.pairs.length % 2])); g.pairs = g.pairs.slice(0, n); return { status: 200, body: { out: g } }; });
      await run(A); assert.ok(A.B.T.cpValid(), n + ' pairs'); assert.strictEqual(A.B.T.parsed.rlesson.pairs.length, n);
    }
  });
  await t('app: quota used up (429) stops at once, no more requests; the old preview is gone (no stale errors)', async () => {
    const A = app((part, level) => (level === 'medium' && part === 'vocab' ? { status: 429, body: { error: "You have used today's 30 AI lesson runs. Try again tomorrow.", code: 'quota' } } : null));
    A.B.T.CP.last = { errs: ['old problem'] }; await run(A);
    assert.strictEqual(A.seen.length, 2); assert.strictEqual(A.B.T.RD.job.stop, 'quota'); assert.ok(/30 AI lesson runs/.test(A.B.T.rdLvHTML()));
    assert.ok(!(A.B.T.CP.last && A.B.T.CP.last.errs.indexOf('old problem') >= 0));
  });
  await t('reload: finished parts come back (same passage); the part that failed is retried alone, no part written twice', async () => {
    let cut = true;
    const A = app((part, level) => (part === 'vocab' && level === 'hard' && cut ? { status: 502, body: { error: 'cut off', code: 'too_long' } } : null));
    await run(A); const saved = A.B.W.localStorage.getItem('md-rdjob'); assert.ok(saved && JSON.parse(saved).pt.easy.output.st === 'ok');
    const R = app(); R.B.W.localStorage.setItem('md-rdjob', saved); R.B.T.RD.tx = A.B.T.RD.tx; R.B.T.rdJobRestore();
    assert.ok(R.B.T.cpValid(), 'Medium back in the preview'); assert.ok(R.B.T.rdLevels().easy && !R.B.T.rdLevels().hard); assert.strictEqual(R.seen.length, 0, 'no AI call on reload');
    cut = false; R.B.T.rdRetry(); for (let i = 0; i < 20 && R.B.T.RD.busy; i++) await R.B.flush();
    assert.deepStrictEqual(R.seen.map((b) => b.level + ':' + b.part), ['hard:vocab', 'hard:output']); assert.ok(R.B.T.rdLevels().hard);
    assert.strictEqual(R.seen[0].run, JSON.parse(saved).run, 'same run: the daily limit is not counted again');
    const X = app(); X.B.W.localStorage.setItem('md-rdjob', saved); X.B.T.RD.tx = 'another passage'; X.B.T.rdJobRestore(); assert.ok(!X.B.T.RD.job, 'a different passage never gets old parts');
  });
  await t('assembled-lesson problems are sent back to the right part', () => {
    const A = app(); const b = A.B.T.rdBlame;
    assert.strictEqual(b('Paraphrases: "pairs" has 1 item; it needs 2 to 6.'), 'output'); assert.strictEqual(b('The summary has 6 blanks but only 5 answers.'), 'output');
    assert.strictEqual(b('Guess the meaning needs at least 3 words from the passage'), 'vocab'); assert.strictEqual(b('Pronoun 2: "a" is not a valid option number.'), 'vocab');
    assert.strictEqual(b('Matching headings needs exactly 3 paragraphs'), 'deep');
  });
  await t('Advanced: pasted JSON goes through the same checks, with no AI call', async () => {
    const A = app(); A.B.T.rdApply(A.B.T.EXAMPLE_R, A.B.T.RD.tx); assert.ok(A.B.T.cpValid()); assert.strictEqual(A.seen.length, 0);
    const bad = JSON.parse(A.B.T.EXAMPLE_R); bad.pairs = bad.pairs.slice(0, 1); A.B.T.rdApply(JSON.stringify(bad), A.B.T.RD.tx);
    assert.ok(!A.B.T.cpValid()); assert.ok(A.B.T.CP.last.errs.some((e) => /"pairs" has 1 item/.test(e))); assert.strictEqual(A.seen.length, 0);
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
