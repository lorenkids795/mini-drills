import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { shuffle, mulberry32, WordBuilder, buildExerciseSet, eligibleSentences, blockedSentenceIds, reduceAttempts, Session, scoreVariants, tokenize, prepareAnswer, runSession, Lesson } from "../src/index.js";
const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, "..", "..");
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const baseline = () => load("golden-tests/baseline-harbour-museum.rev1.json");
const transcriptOnly = () => load("js-validator/test/corpus/rev1-fixtures/p02_transcript_only_not_audited.json");
const withBlocked = () => load("js-validator/test/corpus/rev1-fixtures/p09_open_issue_excluded_gate_pass_with_exclusions.json");

test("shuffle: deterministic, a permutation, never the correct order (1000 seeds)", () => {
  const w = ["we're", "always", "looking", "for", "new", "helpers"];
  for (let s = 0; s < 1000; s++) { const a = shuffle(w, s); assert.deepEqual([...a].sort(), [...w].sort()); assert.notDeepEqual(a, w, "seed " + s); assert.deepEqual(a, shuffle(w, s)); }
  assert.deepEqual(shuffle(["a"], 1), ["a"]); assert.deepEqual(shuffle(["x", "x"], 1), ["x", "x"], "identical values cannot differ");
  assert.notDeepEqual(shuffle(w, 1), shuffle(w, 2), "different seeds usually differ");
});
test("WordBuilder.fromSentence: stable tile ids, seeded display order, score independent of the shuffle", () => {
  const a = WordBuilder.fromSentence("It’s got a lot of stairs.", 7, ["stair"]); const b = WordBuilder.fromSentence("It’s got a lot of stairs.", 7, ["stair"]);
  assert.deepEqual(a.order, b.order); assert.equal(a.order.length, 7);
  for (const id of ["w1", "w2", "w3", "w4", "w5", "w6"]) a.place(id); assert.deepEqual(a.check(), { lcs: 6, den: 6, exact: true });
  a.place("d1"); assert.equal(a.check().den, 7); a.reset(); assert.deepEqual(a.check(), { rejected: "empty_answer" });
});
test("content: Transcript Only gets deterministic mechanical defaults, in audio order, never Answer Spotter", () => {
  const doc = transcriptOnly(); const a = buildExerciseSet(doc); const b = buildExerciseSet(doc); assert.deepEqual(a, b);
  assert.equal(a.answerSpotter.length, 0); assert.ok(a.level3.length > 0 && a.level1.length > 0);
  const order = new Map(doc.transcript.sentences.map((s) => [s.id, s.order]));
  for (const lv of ["level1", "level3"]) { const o = a[lv].map((it) => order.get(it.sentenceId)); assert.deepEqual(o, [...o].sort((x, y) => x - y)); assert.ok(a[lv].every((it) => it.source === "engine_default")); }
  for (const it of a.level2) { const t = a.targets.find((x) => x.id === it.blanks[0].targetId); const s = doc.transcript.sentences.find((x) => x.id === it.sentenceId); assert.equal(s.cleanText.slice(t.charStart, t.charEnd), t.surface); }
});
test("content: deselected, disabled and blocked sentences are never used", () => {
  const doc = transcriptOnly(); const first = doc.transcript.sentences[0].id; const all = buildExerciseSet(doc); const off = buildExerciseSet(doc, { deselected: doc.transcript.sentences.map((s) => s.id) });
  assert.equal(off.level1.length + off.level2.length + off.level3.length + off.level4.length, 0);
  const some = buildExerciseSet(doc, { deselected: [first] }); for (const lv of ["level1", "level2", "level3"]) assert.ok(some[lv].every((it) => it.sentenceId !== first));
  const bd = withBlocked(); const blocked = blockedSentenceIds(bd); assert.ok(blocked.size >= 1);
  const set = buildExerciseSet(bd); for (const lv of ["level1", "level2", "level3", "level4"]) for (const it of set[lv]) for (const id of it.sentenceIds ?? [it.sentenceId]) assert.ok(!blocked.has(id), `${lv} used blocked ${id}`);
  assert.ok(eligibleSentences(bd).every((s) => !blocked.has(s.id)));
  assert.ok(all.level1.length >= 1);
});
test("content: explicit items override defaults; explicit items on unusable sentences are dropped with a note", () => {
  const doc = baseline(); const set = buildExerciseSet(doc); assert.equal(set.level3.length, doc.exercises.level3.items.length); assert.ok(set.level3.every((i) => i.source === "explicit"));
  const set2 = buildExerciseSet(doc, { deselected: [doc.exercises.level3.items[0].sentenceId] }); assert.equal(set2.level3.length, doc.exercises.level3.items.length - 1); assert.ok(set2.notes.some((n) => n.startsWith("level3")));
});
test("attempts: random event sequences keep the invariants (first attempt immutable, evidence rules, replay equality)", () => {
  const rnd = mulberry32(42);
  for (let n = 0; n < 400; n++) {
    const ev = []; const len = 1 + Math.floor(rnd() * 8);
    for (let k = 0; k < len; k++) { const r = rnd(); ev.push(r < 0.55 ? { op: "check", num: Math.floor(rnd() * 7), den: 6, answer: "a" + Math.floor(rnd() * 3) } : r < 0.7 ? { op: "hint" } : r < 0.78 ? { op: "reveal" } : r < 0.85 ? { op: "check_empty" } : { op: "check", num: 6, den: 6, answer: "z" + k }); }
    const full = reduceAttempts(ev, { exposure: "tokens_shown" });
    for (let c = 1; c <= ev.length; c++) { const part = reduceAttempts(ev.slice(0, c)); if (part.firstAttempt) assert.deepEqual(full.firstAttempt, part.firstAttempt, "first attempt must never change"); }
    assert.deepEqual(reduceAttempts(ev.filter((e) => e.op !== "hint" && e.op !== "reveal"), { exposure: "tokens_shown" }), full, "injected hint/reveal events carry no meaning");
    assert.equal(full.reviewUnlocked, full.attempted); assert.equal(full.exposureAtFirstCheck, full.attempted ? "tokens_shown" : null);
    if (!full.attempted) assert.equal(full.firstAttempt, null); else assert.equal(full.practiceAttempts, full.attempts.length - 1);
    for (const k of ["evidence", "independence"]) assert.ok(!(k in full));
    assert.deepEqual(reduceAttempts(structuredClone(ev), { exposure: "tokens_shown" }), full);
  }
});
test("scoring invariants on random token sequences: lcs <= min(n,m), den = max(n,m), exact iff equal", () => {
  const rnd = mulberry32(7); const vocab = ["a", "b", "c", "d", "e"];
  for (let n = 0; n < 500; n++) {
    const e = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => vocab[Math.floor(rnd() * 5)]); const a = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => vocab[Math.floor(rnd() * 5)]);
    const r = scoreVariants(e.map((t) => ({ token: t, sent: 0 })), a, []);
    assert.ok(r.lcs <= Math.min(e.length, a.length)); assert.equal(r.den, Math.max(e.length, a.length)); assert.equal(r.exact, e.join(" ") === a.join(" ")); assert.equal(r.missing, e.length - r.lcs); assert.equal(r.extra, a.length - r.lcs);
    const self = scoreVariants(e.map((t) => ({ token: t, sent: 0 })), e, []); assert.equal(self.lcs, e.length); assert.equal(self.exact, true);
  }
});
test("session: the log replays to the identical state; submitted needs a server acknowledgement", () => {
  const opts = { mode: "homework", version: "v1", items: ["A", "B"] }; const s = new Session(opts);
  s.dispatch({ op: "answer", item: "A", empty: false }); s.dispatch({ op: "answer", item: "B", empty: false });
  assert.equal(s.dispatch({ op: "submit_requested", key: "k1", confirmIncomplete: false }), "submit_pending"); assert.equal(s.final().submitted, false);
  assert.equal(s.dispatch({ op: "server_ack", key: "k1", status: "accepted", submissionId: "s-1" }), "submitted"); assert.equal(s.final().submitted, true);
  const r = Session.replay(opts, s.log); assert.deepEqual(r.final(), s.final()); assert.deepEqual(runSession({ ...opts, events: s.log.map(({ _result, ...e }) => e) }).final, s.final());
});
test("input hygiene: 4000 characters accepted, 4001 rejected; control characters removed; hostile text is only text", () => {
  assert.equal(prepareAnswer("a ".repeat(2000)).rejected, undefined); assert.equal(prepareAnswer("a".repeat(4001)).rejected, "answer_too_long");
  assert.equal(prepareAnswer("x\u0000y\u202ez").sanitized, true); assert.deepEqual(prepareAnswer("<img src=x onerror=alert(1)>").tokens, ["<img", "src=x", "onerror=alert(1)>"]);
  const lesson = new Lesson(baseline()); const r = lesson.scoreSentence({ sentenceId: "s019", answer: "<script>alert(1)</script>" }); assert.equal(r.exact, false); assert.equal(r.lcs, 0);
});
test("v1.1: the public API has no hint, reveal or answer-preview function, and the source has no such branch", async () => {
  const E = await import("../src/index.js"); for (const k of Object.keys(E)) assert.ok(!/hint|reveal|preview|showAnswer/i.test(k), k);
  for (const f of readdirSync(join(here, "..", "src"))) assert.ok(!/\bhintFor\b|op === "reveal"|op === "hint"|case "hint"|case "reveal"/.test(readFileSync(join(here, "..", "src", f), "utf8")), f);
});
test("source is browser safe: no Node APIs, no DOM, no innerHTML/eval, no network", () => {
  for (const f of readdirSync(join(here, "..", "src"))) { const t = readFileSync(join(here, "..", "src", f), "utf8").replace(/\/\/.*$/gm, ""); for (const bad of [/node:/, /require\(/, /\bprocess\./, /\bBuffer\b/, /\bdocument\./, /\bwindow\./, /innerHTML/, /\beval\(/, /new Function/, /\bfetch\(/, /XMLHttpRequest/, /Math\.random/, /Date\.now/, /new Date/]) assert.ok(!bad.test(t), `${f} contains ${bad}`); }
});
test("engine works with Node-only globals removed (browser-like environment)", async () => {
  const { spawnSync } = await import("node:child_process");
  const code = `const keep = process.exit.bind(process); const w = process.stdout.write.bind(process.stdout); globalThis.Buffer = undefined; Object.defineProperty(globalThis, 'process', { value: undefined, configurable: true });
    const m = await import(${JSON.stringify(pathToFileURL(join(here, "..", "src", "index.js")).href)}); const r = new m.Lesson({ transcript: { sentences: [{ id: 's1', cleanText: 'Hello there.' }], speakers: [] } }).scoreSentence({ sentenceId: 's1', answer: 'hello there' }); const D = { transcript: { sentences: [{ id: 's1', turnId: 't1', order: 1, cleanText: 'Hello there, see you at nine.', enabled: true }], turns: [{ id: 't1', speakerId: 'a' }], speakers: [] } }; const run = m.createRun({ doc: D, unsafeSkipValidation: true, version: 'v1' }); const id = run.items().find((i) => i.level === 'level3').id; run.present(id); const c1 = run.check(id, { answer: 'x' }); const rv = run.review(id); const so = { doc: D, unsafeSkipValidation: true, version: 'v1' }; const srv = m.createMemoryServer({ serverOpts: so, assignment: { id: 'a', classId: 'c', contentVersion: 'v1' }, tokens: { t: { studentRef: 's', classId: 'c' } }, token: 't' }); const cl = new m.HomeworkClient(srv.payload().payload, { transport: srv, makeKey: () => 'k' + srv.calls.length }); cl.answer(id, { answer: 'hello there' }); const sub = await cl.submit({ confirmIncomplete: true }); const ok = r.exact && c1.status === 'recorded' && rv.status === 'ok' && sub.status === 'submitted' && cl.review().status === 'ok'; w(String(ok)); keep(0);`;
  const res = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8" }); assert.equal(res.status, 0, res.stderr); assert.equal(res.stdout, "true");
});
