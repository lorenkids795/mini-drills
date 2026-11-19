// Owner policy regressions (contract v1.1 §0 rules 4 and 5, D-15, D-17, D-23, D-24, D-25, D-30, D-13). Synthetic sentences only.
import test from "node:test";
import assert from "node:assert/strict";
import { Lesson, prepareAnswer, MAX_ANSWER_CHARS, tokenize } from "../src/index.js";
const L = new Lesson({ transcript: { sentences: [], speakers: [{ rawLabel: "TOM", displayName: "Tom" }] } });
const sc = (expectedText, answer, extra = {}) => L.scoreSentence({ expectedText, answer, ...extra });

test("D-25 ordered partial credit: reversed, inserted, deleted words are penalised and never exact", () => {
  const e = "the museum opens at nine today";
  const rev = sc(e, "today nine at opens museum the"); assert.equal(rev.exact, false); assert.equal(rev.lcs, 1); assert.equal(rev.den, 6);
  const ins = sc(e, "the big old museum opens at nine today"); assert.equal(ins.exact, false); assert.equal(ins.lcs, 6); assert.equal(ins.den, 8); assert.equal(ins.extra, 2);
  const del = sc(e, "the museum opens today"); assert.equal(del.exact, false); assert.equal(del.lcs, 4); assert.equal(del.den, 6); assert.equal(del.missing, 2);
  const swap = sc(e, "the museum at opens nine today"); assert.equal(swap.exact, false); assert.equal(swap.lcs, 5);
  assert.equal(sc(e, "The museum opens at nine today.").exact, true);
});
test("rule 4: case and ordinary punctuation are ignored, including proper names", () => {
  assert.equal(sc("Meet Anna in Paris on Monday.", "meet anna in paris on monday").exact, true);
  assert.equal(sc("Wait, what? Yes!", "wait what yes").exact, true);
});
test("rule 4: apostrophes: curly and straight are the same; a contraction is not its long form unless approved", () => {
  assert.equal(sc("We’re always looking.", "we're always looking").exact, true);
  const c = sc("We're always looking.", "we are always looking"); assert.equal(c.exact, false);
  const c2 = sc("It's open.", "it is open"); assert.equal(c2.exact, false);
});
test("rule 4: spelling, missing or extra s/ed and wrong inflection are wrong (no fuzzy credit)", () => {
  for (const [e, a] of [["They visited three galleries.", "they visit three galleries"], ["two groups", "two group"], ["one group", "one groups"], ["he walked home", "he walk home"], ["she runs fast", "she run fast"], ["The volunteers", "the volunteer"], ["recommend", "recomend"], ["children", "childs"]]) {
    const r = sc(e, a); assert.equal(r.exact, false, a); assert.ok(r.lcs < r.den, a);
  }
});
test("rule 4 / D-17 / D-30: numbers, currency, percent and units keep their meaning; no automatic word/numeral equivalence", () => {
  const cases = [["The tax is 20%.", "the tax is 20"], ["It costs £35.", "it costs 35"], ["It is 5km away.", "it is 5 km away"], ["at 3.5 metres", "at 35 metres"], ["£35", "thirty-five pounds"], ["twenty people", "20 people"], ["-5 degrees", "5 degrees"]];
  for (const [e, a] of cases) assert.equal(sc(e, a).exact, false, e + " vs " + a);
  assert.equal(sc("It costs £35.", "It costs £35").exact, true); assert.equal(sc("The tax is 20%.", "the tax is 20%").exact, true);
  assert.equal(sc("It costs £35.", "it costs 35").criticalTargetErrors, 0, "a free-text sentence has no targets; critical errors come from teacher-declared targets only");
});
test("D-25 long Level 4 passage (80 words): one wrong word is 79/80 and not exact; line breaks and declared labels are ignored", () => {
  const words = Array.from({ length: 80 }, (_, i) => "word" + i); const e = words.join(" ") + ".";
  const r = sc(e, words.map((w, i) => (i === 40 ? "wrong" : w)).join(" "), { level: "level4" }); assert.equal(r.lcs, 79); assert.equal(r.den, 80); assert.equal(r.exact, false);
  const lines = "TOM: " + words.slice(0, 40).join(" ") + "\nTom: " + words.slice(40).join(" "); assert.equal(sc(e, lines, { level: "level4", speakers: [{ rawLabel: "TOM", displayName: "Tom" }] }).exact, true);
  const half = sc(e, words.slice(0, 40).join(" "), { level: "level4" }); assert.equal(half.missing, 40); assert.equal(half.exact, false);
});
test("D-13 misleading labels: an undeclared or mid-line label is content, never stripped", () => {
  const sp = [{ rawLabel: "TOM", displayName: "Tom" }];
  assert.equal(sc("we open at nine", "ANNA: we open at nine", { level: "level4", speakers: sp }).exact, false, "ANNA is not declared");
  assert.equal(sc("we open at nine", "we open TOM: at nine", { level: "level4", speakers: sp }).exact, false, "mid-line");
  assert.equal(sc("Note: we open at nine", "Note: we open at nine", { level: "level4", speakers: sp }).exact, true, "a colon word in the target is content");
  assert.equal(sc("we open at nine", "TOM: we open at nine", { level: "level3", speakers: sp }).exact, false, "Level 3 never strips labels");
});
test("D-15 input cap: exactly 4,000 code points accepted, 4,001 rejected, also for non-Latin text; controls and bidi removed", () => {
  for (const ch of ["a", "ạ", "中", "😀"]) { const ok = ch.repeat(MAX_ANSWER_CHARS); assert.notEqual(prepareAnswer(ok).rejected, "answer_too_long", "U+" + ch.codePointAt(0).toString(16)); assert.equal(prepareAnswer(ok + ch).rejected, "answer_too_long"); }
  const vi = prepareAnswer("Xin chào, tôi là Nam."); assert.deepEqual(vi.tokens, ["xin", "chào", "tôi", "là", "nam"]);
  const h = prepareAnswer("we‮ open\u0007 at⁦ nine"); assert.equal(h.sanitized, true); assert.deepEqual(h.tokens, ["we", "open", "at", "nine"]);
  assert.equal(prepareAnswer("‮\u0000 ,.!").rejected, "empty_answer", "controls and punctuation only = empty, not an attempt");
});
test("hostile HTML in an answer is only text: it is tokenised, scored as wrong, and never interpreted", () => {
  const r = sc("we open at nine", "<img src=x onerror=alert(1)> we open at nine"); assert.equal(r.exact, false); assert.equal(r.extra, 3);
  assert.deepEqual(tokenize("<b>nine</b>"), ["<b>nine</b>"]);
});
