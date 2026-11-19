// Free-practice run (contract v1.1): Levels 1-4 and Answer Spotter through one engine, review gate, no hint/reveal,
// informational exposure, payload and feedback safety, replay, content labels.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRun, DictationRun, tokenize } from "../src/index.js";
import { validateDictationDocument } from "../../js-validator/src/index.js";
const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, "..", "..");
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const schema = load("js-validator/schema/dictation-schema-v1.json");
const prep = (p) => { const doc = load(p); return { doc, validation: validateDictationDocument(doc, { schema }) }; };
const BASE = "golden-tests-v1.1/baseline-harbour-museum.rev1.json"; const TONLY = "js-validator/test/corpus/rev1-fixtures/p02_transcript_only_not_audited.json";
const opts = (extra = {}) => ({ ...prep(BASE), version: "v1", seed: 5, ...extra });
const correctL1 = (run, id) => run.present(id).payload.tiles.filter((t) => t.id.startsWith("w")).sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))).map((t) => t.id);
const cleanOf = (run, id) => run.sentencesOf(id).map((s) => run.lesson.S.get(s).cleanText).join("\n");
const asAnswer = (run, id) => { const it = run.lesson.items.get(id); const ans = it.spans.filter((s) => s.role === "correct_answer" || s.role === "candidate").map((s) => s.span.surface); return it.responseMode === "choose_option" ? { chosen: ans[0] } : { text: it.type === "target_detection" ? ans.join(", ") : ans[0] }; };
const by = (run, lv) => run.items().filter((i) => i.level === lv && i.kind === "scored").map((i) => i.id);
const strings = (o, out = []) => { if (typeof o === "string") out.push(o); else if (o && typeof o === "object") for (const v of Object.values(o)) strings(v, out); return out; };

test("createRun: validated content only; unaudited transcript runs as labelled free practice; homework never runs on the device", () => {
  const { doc } = prep(BASE); assert.throws(() => createRun({ doc, version: "v1" }), /validator/);
  const bad = prep("js-validator/test/corpus/rev1-fixtures/n01_blocked_sentence_referenced.json"); assert.equal(bad.validation.valid, false); assert.throws(() => createRun({ ...bad, version: "v1" }), /validator/);
  const t = createRun({ ...prep(TONLY), version: "v1" }); assert.equal(t.content.label, "unverified_transcript"); assert.equal(t.summary().official, false); assert.equal(t.summary().analyticsEligible, false);
  assert.equal(createRun(opts()).content.label, "teacher_audited");
  assert.throws(() => createRun(opts({ mode: "homework" })), /free practice/);
});
test("no hint, no reveal, no preview: the API has no such method and injected events change nothing", () => {
  const run = createRun(opts()); assert.equal(run.hint, undefined); assert.equal(run.reveal, undefined);
  const x = by(run, "level3")[0]; const before = JSON.stringify(run.summary());
  for (const op of ["hint", "reveal", "preview", "showAnswer", "revealTranscript", "__proto__"]) assert.equal(run.apply({ op, item: x }).status, "unsupported_event", op);
  assert.equal(run.apply(null).status, "unsupported_event"); assert.equal(JSON.stringify(run.summary()), before);
  assert.equal(run.review(x).status, "locked");
});
test("all four levels and Answer Spotter score through the one run (independent Answer Spotter first)", () => {
  const run = createRun(opts()); assert.equal(run.items()[0].level, "answerSpotter", "listening-first order");
  for (const id of by(run, "answerSpotter")) { const r = run.check(id, asAnswer(run, id)); assert.equal(r.status, "recorded", id); assert.equal(r.score.correct, true, id); }
  const l1 = by(run, "level1")[0]; assert.equal(run.check(l1, { placedIds: correctL1(run, l1) }).score.exact, true);
  const l2 = by(run, "level2")[0]; const it2 = run.lesson.items.get(l2); assert.equal(run.check(l2, { answers: it2.blanks.map((b) => run.lesson.T.get(b.targetId).surface) }).score.exact, true);
  const l3 = by(run, "level3")[0]; assert.equal(run.check(l3, { answer: cleanOf(run, l3) }).score.exact, true);
  const l4 = by(run, "level4")[0]; const lines = run.sentencesOf(l4).map((s) => "TOM: " + run.lesson.S.get(s).cleanText).join("\n"); assert.equal(run.check(l4, { answer: lines }).score.exact, true, "declared labels are ignored at L4");
  const sum = run.summary(); assert.equal(sum.aggregate.attemptedItems, 4 + by(run, "answerSpotter").length); assert.equal(sum.aggregate.assignmentScore, null); assert.equal(sum.aggregate.result, null, "free practice has no pass/complete");
  for (const id of [l1, l2, l3, l4]) assert.equal(sum.items[id].status, "first_attempt_exact");
});
test("review gate: locked before a Check, still locked after an empty Check, open after a valid Check", () => {
  const run = createRun(opts()); const x = "l3-002";
  assert.deepEqual(run.review(x), { status: "locked", reason: "check_first", waitFor: [x] });
  const e = run.check(x, { answer: " ,, !! " }); assert.equal(e.status, "empty_answer"); assert.equal(e.reviewAvailable, false); assert.equal(run.review(x).status, "locked");
  assert.equal(run.summary().items[x].attempted, false, "an empty Check does not consume the first attempt");
  const c = run.check(x, { answer: "we are always looking" }); assert.equal(c.reviewAvailable, true); const r = run.review(x); assert.equal(r.status, "ok"); assert.equal(r.review.text, cleanOf(run, x));
});
test("review and feedback never disclose an unchecked independent Answer Spotter answer on the same sentence", () => {
  const run = createRun(opts()); const x = "l3-004"; const blockers = run.blockers(x); assert.ok(blockers.length >= 1, "baseline: l3-004 shares s010 with independent Answer Spotter items");
  const c = run.check(x, { answer: "hello there" }); assert.equal(c.reviewAvailable, false); assert.deepEqual(c.reviewWaitsFor, blockers);
  assert.equal(c.score.detail, undefined, "no detail before the gate opens"); assert.deepEqual(Object.keys(c.score).sort(), ["criticalTargetErrors", "den", "exact", "extra", "missing", "num", "targetErrors"]);
  assert.equal(run.review(x).reason, "answer_spotter_first");
  for (const a of blockers) run.check(a, { text: "zzz", chosen: "zzz" });
  assert.equal(run.review(x).status, "ok");
  const l1 = by(run, "level1").find((id) => run.sentencesOf(id).includes("s007")); const fresh = createRun(opts());
  assert.equal(fresh.present(l1).status, "locked", "Level 1 tiles of a sentence with an unchecked independent Answer Spotter answer"); assert.equal(fresh.present(l1).payload, undefined);
  assert.equal(fresh.check(l1, { placedIds: [] }).status, "locked");
});
test("feedback before the gate never contains answer text (variant labels, accepted forms, target surfaces)", () => {
  const run = createRun(opts()); const secrets = new Set();
  for (const t of run.lesson.T.values()) { secrets.add(t.surface.toLowerCase()); for (const f of t.allowedForms ?? []) secrets.add(f.text.toLowerCase()); }
  for (const id of [...by(run, "level3"), ...by(run, "level4")]) { const blk = run.blockers(id).length; const r = run.check(id, { answer: "zzz qqq" }); if (r.reviewAvailable) continue; assert.ok(blk > 0);
    for (const s of strings(r)) for (const sec of secrets) if (sec.length > 3) assert.ok(!s.toLowerCase().includes(sec), id + " feedback leaks " + sec); }
});
test("post-check review item: locked until its paired item and the other independent items on its sentences are checked; never credit", () => {
  const run = createRun(opts()); const rv = run.items().find((i) => i.kind === "review"); assert.ok(rv);
  assert.equal(run.present(rv.id).status, "locked"); assert.equal(run.present(rv.id).payload.locked, true); assert.equal(run.check(rv.id, { selected: ["£12"] }).status, "locked");
  assert.equal(run.present(rv.id).reason, "check_paired_item_first");
  for (const b of run.presentBlockers(rv.pairedWith)) run.check(b, { text: "zzz", chosen: "zzz" }); // a choose_option partner may itself wait for a typed item
  assert.equal(run.check(rv.pairedWith, { text: "zzz", chosen: "zzz" }).status, "recorded"); const others = run.blockers(rv.id, rv.pairedWith);
  if (others.length) { assert.equal(run.present(rv.id).reason, "answer_spotter_first"); for (const a of others) run.check(a, { text: "zzz", chosen: "zzz" }); }
  const p = run.present(rv.id); assert.equal(p.status, "ok"); assert.ok(p.payload.transcript.length > 0);
  const r = run.check(rv.id, { selected: ["£12"] }); assert.equal(r.status, "reviewed"); assert.equal(r.score.independentCredit, false); assert.ok(!(rv.id in run.summary().items));
});
test("exposure is informational and taken at the first valid Check (P-01, P-06)", () => {
  const doc = prep(BASE).doc; const p1 = "l1-002", p3 = "l3-002"; // both on s004 (no independent Answer Spotter item there)
  const mk = (extra = {}) => new DictationRun({ doc, unsafeSkipValidation: true, version: "v1", seed: 1, ...extra });
  const a = mk(); a.present(p1); a.check(p3, { answer: cleanOf(a, p3) }); assert.equal(a.itemSummaries()[p3].exposureAtFirstCheck, "tokens_shown");
  const b = mk(); b.check(p3, { answer: cleanOf(b, p3) }); b.present(p1); assert.equal(b.itemSummaries()[p3].exposureAtFirstCheck, "unknown", "history not asserted complete");
  const b2 = mk({ exposureHistoryComplete: true }); b2.check(p3, { answer: cleanOf(b2, p3) }); b2.present(p1); assert.equal(b2.itemSummaries()[p3].exposureAtFirstCheck, "none");
  const c = mk({ exposureHistoryComplete: true }); c.check("l2-001", { answers: ["x"] }); c.review("l2-001"); c.check(p3, { answer: cleanOf(c, p3) }); assert.equal(c.itemSummaries()[p3].exposureAtFirstCheck, "answer_shown", "a review elsewhere counts");
  const e = mk({ exposureHistoryComplete: true, priorExposure: { s004: "context_shown" } }); e.check(p3, { answer: cleanOf(e, p3) }); assert.equal(e.itemSummaries()[p3].exposureAtFirstCheck, "context_shown");
  for (const r of Object.values(a.itemSummaries())) for (const k of ["evidence", "independence"]) assert.ok(!(k in r), "no grading claim about novelty");
});
test("first valid attempt is frozen; later checks are practice and never change it", () => {
  const run = createRun(opts()); const x = by(run, "level3")[1];
  run.check(x, { answer: "wrong words" }); run.check(x, { answer: "wrong again here" }); run.check(x, { answer: cleanOf(run, x) });
  const s = run.summary().items[x]; assert.equal(s.firstAttempt.exact, false); assert.equal(s.status, "improved_after_practice"); assert.equal(s.practiceAttempts, 2); assert.equal(s.currentPractice.num, s.currentPractice.den);
  const agg = run.summary().aggregate; assert.notDeepEqual(agg.attemptedAccuracy, agg.practiceAccuracy);
});
test("empty and over-long answers are not attempts; an identical re-check is ignored", () => {
  const run = createRun(opts()); const x = by(run, "level3")[0];
  assert.equal(run.check(x, { answer: " ,, " }).status, "empty_answer"); assert.equal(run.check(x, { answer: "a".repeat(4001) }).status, "rejected");
  assert.equal(run.check(x, { answer: "nope nope" }).status, "recorded"); assert.equal(run.check(x, { answer: "Nope, NOPE." }).status, "duplicate_ignored", "same normalised tokens");
  assert.equal(run.summary().session.attemptCounts[x], 1);
});
test("student payloads never carry answer-bearing data before a Check (data-level part of AS-027)", () => {
  const run = createRun(opts()); for (const a of by(run, "answerSpotter")) run.check(a, { text: "zzz", chosen: "zzz" }); // unlock Level 1/2 presentation
  for (const { id, level, kind } of run.items()) {
    const pr = run.present(id); if (kind === "review") continue; const p = pr.payload; const json = JSON.stringify(p); const it = run.lesson.items.get(id);
    for (const k of ['"role"', "correct_answer", "acceptedForms", "allowedForms", "explanation", "markerRelationNote", "reason", "rationale", "focusTypes", "spans", "evidenceSentenceIds"]) assert.ok(!json.includes(k), `${id} payload contains ${k}`);
    if (level === "level3" || level === "level4") for (const s of run.sentencesOf(id)) { const vals = strings(p).map((v) => v.toLowerCase()); for (const t of tokenize(run.lesson.S.get(s).cleanText).filter((t) => t.length > 3)) assert.ok(!vals.some((v) => v.includes(t) && !/^s\d+$/.test(v)), `${id} leaks ${t}`); }
    if (level === "answerSpotter") {
      assert.ok(!("audio" in p) || !p.audio?.sentenceIds, id + " tells where the answer is (P-03)");
      for (const s of it.evidenceSentenceIds) assert.ok(!json.includes(run.lesson.S.get(s).cleanText), id + " leaks evidence text");
      if (it.explanation) assert.ok(!json.includes(it.explanation)); for (const sp of it.spans) if (sp.reason) assert.ok(!json.includes(sp.reason));
      if (it.responseMode !== "choose_option") for (const sp of it.spans) assert.ok(!json.includes(sp.span.surface), `${id} leaks ${sp.span.surface}`);
    }
    if (level === "level2") for (const b of it.blanks) assert.ok(!p.segments.some((s) => s.text?.includes(run.lesson.T.get(b.targetId).surface) && run.lesson.S.get(it.sentenceId).cleanText.split(run.lesson.T.get(b.targetId).surface).length === 2), id + " shows the blank");
  }
});
test("the run is a pure function of (options, log): replay gives the identical summary; same seed gives the same tiles", () => {
  const o = opts(); const run = createRun(o); for (const a of by(run, "answerSpotter")) run.check(a, { text: "x", chosen: "x" });
  const l1 = by(run, "level1")[0]; run.present(l1); run.check(l1, { placedIds: correctL1(run, l1).reverse() }); run.check(by(run, "level2")[0], { answers: ["x"] }); run.review(l1);
  const again = DictationRun.replay(o, JSON.parse(JSON.stringify(run.exportLog()))); assert.deepEqual(again.summary(), run.summary());
  assert.deepEqual(createRun(o).present("l1-001").payload, createRun(o).present("l1-001").payload); assert.notDeepEqual(createRun({ ...o, seed: 6 }).present("l1-001").payload.tiles.map((t) => t.id), createRun(o).present("l1-001").payload.tiles.map((t) => t.id));
});
test("Transcript Only: mechanical defaults are playable, labelled unverified, never Answer Spotter, never official", () => {
  const run = createRun({ ...prep(TONLY), version: "v1" });
  const lv = new Set(run.items().map((i) => i.level)); assert.ok(lv.has("level1") && lv.has("level3")); assert.ok(!lv.has("answerSpotter"));
  for (const { id, level } of run.items()) { if (level === "level3" || level === "level4") { const r = run.check(id, { answer: cleanOf(run, id) }); assert.equal(r.score.exact, true, id); assert.equal(run.review(id).contentLabel, "unverified_transcript"); } }
  assert.equal(run.summary().analyticsEligible, false);
});
test("hostile response shapes never throw and are never attempts", () => {
  const run = createRun(opts()); for (const a of by(run, "answerSpotter")) run.check(a, { text: "x" });
  const bad = [undefined, null, 5, "str", [], { answer: { toString: null } }, { placedIds: "w1" }, { answers: "x" }, { answers: [null, 3] }, { chosen: { a: 1 } }, { __proto__: { answer: "polluted" } }];
  for (const id of [by(run, "level1")[0], by(run, "level2")[0], by(run, "level3")[0], "as-001"]) for (const b of bad) assert.doesNotThrow(() => run.check(id, b), id + " " + JSON.stringify(b));
  assert.equal(({}).answer, undefined, "no prototype pollution");
});
