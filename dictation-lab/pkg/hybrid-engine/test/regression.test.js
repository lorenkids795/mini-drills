// Regression tests for defects found while finishing the engine (2026-11-17). Each test failed on the v2 handoff code.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WordBuilder, tokenize, displayTokens, Lesson, scoreAnswerSpotter, Session, reduceAttempts, runSession } from "../src/index.js";
const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, "..", "..");

test("R1 Level 1 tiles keep meaningful symbols, so a correct arrangement is exact (£35, 20%, -5, .5, 5km)", () => {
  for (const s of ["It costs £35, or 20% off.", "From -5 to .5 degrees, about 5km away.", "Tickets: €5,50 each!", "It’s Tom’s café."]) {
    const wb = WordBuilder.fromSentence(s, 11); const ids = [...wb.order].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    for (const id of ids) wb.place(id); assert.equal(wb.check().exact, true, s + " -> " + JSON.stringify(wb.texts()));
  }
});
test("R1 property: tokenize(each tile) is exactly tokenize(sentence) for every sentence in the corpus", () => {
  const dirs = ["rev1-fixtures", "demos", "unicode"].map((d) => join(root, "js-validator", "test", "corpus", d)); let n = 0;
  for (const d of dirs) for (const f of readdirSync(d)) {
    let doc; try { doc = JSON.parse(readFileSync(join(d, f), "utf8")); } catch { continue; }
    for (const s of doc?.transcript?.sentences ?? []) { if (typeof s.cleanText !== "string") continue; n++; assert.deepEqual(displayTokens(s.cleanText).flatMap(tokenize), tokenize(s.cleanText), f + " " + s.id); }
  }
  assert.ok(n > 500, "sentences checked: " + n);
});
test("R2 Answer Spotter choose_option: an empty choice is rejected, not a wrong attempt (D-12)", () => {
  const doc = { transcript: { sentences: [], speakers: [] }, exercises: { answerSpotter: { items: [{ id: "q", activity: "independent_listening", responseMode: "choose_option", spans: [{ role: "correct_answer", span: { surface: "groups" } }, { role: "distractor", span: { surface: "galleries" } }] }] } } };
  const L = new Lesson(doc); assert.deepEqual(scoreAnswerSpotter(L, { itemId: "q", response: { chosen: " " } }), { rejected: "empty_answer" });
  assert.deepEqual(scoreAnswerSpotter(L, { itemId: "q", response: {} }), { rejected: "empty_answer" });
  assert.equal(scoreAnswerSpotter(L, { itemId: "q", response: { chosen: "Groups" } }).correct, true);
});
test("R3 Level 4 is recognised by its exercise section, not by an 'l4-' id prefix", () => {
  const d = { transcript: { sentences: [{ id: "a", cleanText: "We open at nine." }, { id: "b", cleanText: "Come early." }], speakers: [{ rawLabel: "TOM", displayName: "Tom" }] }, exercises: { level4: { items: [{ id: "para-1", sentenceIds: ["a", "b"] }] }, level3: { items: [{ id: "l4-looks-like-l4", sentenceId: "a" }] } } };
  const L = new Lesson(d); assert.equal(L.scoreSentence({ itemId: "para-1", answer: "TOM: we open at nine.\ncome early" }).exact, true);
  assert.equal(L.scoreSentence({ itemId: "l4-looks-like-l4", answer: "TOM: we open at nine" }).exact, false, "a level3 item never strips labels");
  assert.deepEqual(L.scoreSentence({ itemId: "nope", answer: "x" }), { rejected: "unknown_item" });
  assert.doesNotThrow(() => new Lesson({ transcript: { sentences: [], speakers: [] }, exercises: { level1: {} } }));
});
test("R4 session uses reduceAttempts: an identical re-check is not a new attempt (D-18); after an empty Check it is", () => {
  const s = new Session({ mode: "free", version: "v1", items: ["A"] });
  assert.equal(s.dispatch({ op: "check", item: "A", num: 3, den: 6, answer: "k" }), "recorded");
  assert.equal(s.dispatch({ op: "check", item: "A", num: 3, den: 6, answer: "k" }), "duplicate_ignored");
  assert.equal(s.dispatch({ op: "hint", item: "A" }), "unsupported_event"); assert.equal(s.dispatch({ op: "check", item: "A", num: 3, den: 6, answer: "k" }), "duplicate_ignored", "an injected hint does not break the run");
  assert.equal(s.dispatch({ op: "check_empty", item: "A" }), "empty_answer"); assert.equal(s.dispatch({ op: "check", item: "A", num: 3, den: 6, answer: "k" }), "recorded");
  assert.equal(s.final().attemptCounts.A, 2);
  const ev = [{ op: "check", num: 2, den: 6, answer: "x" }, { op: "check_empty" }, { op: "check", num: 2, den: 6, answer: "x" }];
  const t = new Session({ mode: "free", version: "v1", items: ["A"] }); for (const e of ev) t.dispatch({ ...e, item: "A" }); assert.equal(t.final().attemptCounts.A, reduceAttempts(ev).attempts.length);
});
test("R4 session first attempt and independence agree with reduceAttempts for random logs", () => {
  let x = 7; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let n = 0; n < 300; n++) {
    const ev = []; for (let k = 0; k < 1 + Math.floor(rnd() * 8); k++) { const r = rnd(); ev.push(r < 0.6 ? { op: "check", num: Math.floor(rnd() * 4), den: 3, answer: "a" + Math.floor(rnd() * 2) } : r < 0.75 ? { op: "hint" } : r < 0.85 ? { op: "reveal" } : { op: "check_empty" }); }
    const s = new Session({ mode: "free", version: "v", items: ["A"] }); for (const e of ev) s.dispatch({ ...e, item: "A" });
    const ref = reduceAttempts(ev); assert.deepEqual(s.items().A, ref); assert.equal(s.final().attemptCounts.A, ref.attempts.length);
    assert.deepEqual(s.final().firstAttempt.A ?? null, ref.firstAttempt ? { num: ref.firstAttempt.num, den: ref.firstAttempt.den } : null);
  }
});
test("R5 (v1.1) homework: hint and reveal never exist; edits are locked while pending and after submission", () => {
  const r = runSession({ mode: "homework", version: "v1", items: ["A"], events: [{ op: "answer", item: "A", empty: false }, { op: "submit_requested", key: "k", confirmIncomplete: true }, { op: "hint", item: "A" }, { op: "answer", item: "A", empty: true }, { op: "server_ack", key: "k", status: "accepted", submissionId: "s" }, { op: "reveal", item: "A" }, { op: "answer", item: "A", empty: true }] });
  assert.deepEqual(r.results, ["draft_updated", "submit_pending", "unsupported_event", "locked_pending_submit", "submitted", "unsupported_event", "locked_after_submit"]); assert.deepEqual(r.final.answered, { A: true });
});
test("R6 malformed session events never throw and never change state", () => {
  const f = runSession({ mode: "free", version: "v1", items: ["A"], events: [{ op: "resume" }, { op: "check", item: "Z", num: 1, den: 1 }, { op: "hint", item: "Z" }, { op: "check", item: "A", num: 5, den: 2 }, { op: "check", item: "A", num: 1, den: 0 }, { op: "teleport" }, null, 7] });
  assert.deepEqual(f.results, ["no_draft", "unknown_item", "unsupported_event", "invalid_score", "invalid_score", "unsupported_event", "unknown_event", "unknown_event"]); assert.deepEqual(f.final.attemptCounts, { A: 0 });
  const r = runSession({ mode: "homework", version: "v1", items: ["A"], events: [{ op: "answer", item: "Z", empty: false }, { op: "submit_requested", confirmIncomplete: true }] });
  assert.deepEqual(r.results, ["unknown_item", "missing_key"]); assert.equal(r.final.submissionState, "draft");
});

// Test gaps found by tools/mutation-check.mjs (mutants that survived the v2 suite).
import { prepareAnswer, scoreVariants, shuffle } from "../src/index.js";
test("G1 a bidi control alone is removed and flagged (D-15)", () => {
  for (const c of ["\u202e", "\u202a", "\u2066", "\u2069"]) { const r = prepareAnswer("ab" + c + "cd"); assert.equal(r.sanitized, true, "U+" + c.codePointAt(0).toString(16)); assert.deepEqual(r.tokens, ["abcd"]); }
  assert.equal(prepareAnswer("plain text").sanitized, false);
});
test("G2 every critical focus type counts on its own (price, number, date_time, ielts_answer_candidate)", () => {
  const exp = ["it", "costs", "£35"].map((t) => ({ token: t, sent: 0 }));
  for (const f of ["price", "number", "date_time", "ielts_answer_candidate"]) assert.equal(scoreVariants(exp, ["it", "costs", "£36"], [], [{ first: 2, last: 2, target: { id: "t", focusTypes: [f] } }]).criticalTargetErrors, 1, f);
  assert.equal(scoreVariants(exp, ["it", "costs", "£36"], [], [{ first: 2, last: 2, target: { id: "t", focusTypes: ["content_word"] } }]).criticalTargetErrors, 0);
});
test("G3 shuffle never returns the correct order, also for 2 and 3 tiles", () => {
  for (const w of [["a", "b"], ["a", "b", "c"], ["a", "a", "b"]]) for (let s = 0; s < 2000; s++) assert.notDeepEqual(shuffle(w, s), w, w.join() + " seed " + s);
});
