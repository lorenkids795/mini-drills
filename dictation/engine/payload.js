// Student-facing item data (contract C9 AS-027, C11). Pure: returns ONLY what a student may see before the first Check.
// Never contains: span roles, correct-answer markers, explanations, reasons, accepted/allowed form sets, marker notes,
// evidence sentences (independent Answer Spotter), or the text of a Level 3 / Level 4 sentence.
// Level 1 shows the tiles (exposure tokens_shown) and Level 2 shows the sentence with blanks (context_shown) by design.
import { WordBuilder } from "./wordbuilder.js";
import { shuffle, hashSeed } from "./prng.js";
import { provenanceLabel } from "./scoring.js";

export const itemSeed = (seed, itemId) => hashSeed(String(seed) + ":" + itemId);

/** Level 2 sentence as segments: [{text}] and [{blank: i}] in reading order; i is the index in item.blanks (positional, D-26). */
export function blankSegments(cleanText, targets) {
  const order = targets.map((t, i) => ({ i, a: t.charStart, b: t.charEnd })).sort((x, y) => x.a - y.a); const out = []; let cur = 0;
  for (const o of order) { if (o.a > cur) out.push({ text: cleanText.slice(cur, o.a) }); out.push({ blank: o.i }); cur = o.b; }
  if (cur < cleanText.length) out.push({ text: cleanText.slice(cur) }); return out;
}

/**
 * lesson: a Lesson; level: the exercise section of the item; opts: {seed, reviewUnlocked}.
 * Returns a plain JSON object. The host may render any string in it, but only as text (SAF-001..003 are UI responsibilities).
 */
export function studentItem(lesson, itemId, level, opts = {}) {
  const it = lesson.items.get(itemId); if (!it) return null; const seed = itemSeed(opts.seed ?? 0, itemId);
  const S = (id) => lesson.S.get(id);
  if (level === "level1") {
    const wb = WordBuilder.fromSentence(S(it.sentenceId).cleanText, seed, (it.distractors ?? []).map((d) => d.text));
    return { id: itemId, level, audio: { sentenceIds: [it.sentenceId] }, tiles: wb.order.map((id) => ({ id, text: wb.text.get(id) })) };
  }
  if (level === "level2") return { id: itemId, level, audio: { sentenceIds: [it.sentenceId] }, blanks: it.blanks.length, segments: blankSegments(S(it.sentenceId).cleanText, it.blanks.map((b) => lesson.T.get(b.targetId))) };
  if (level === "level3") return { id: itemId, level, audio: { sentenceIds: [it.sentenceId] } };
  if (level === "level4") return { id: itemId, level, audio: { sentenceIds: [...it.sentenceIds] }, sentenceCount: it.sentenceIds.length, ...(it.multiSpeaker ? { multiSpeaker: true } : {}) };
  if (level === "answerSpotter") {
    const prov = provenanceLabel(it); const fmt = it.answerFormat ?? {};
    const base = { id: itemId, level, activity: it.activity, responseMode: it.responseMode, prompt: it.prompt, sourceLabel: prov.label, answerFormat: { ...(fmt.label ? { label: fmt.label } : {}), ...(fmt.maxWords ? { maxWords: fmt.maxWords } : {}), ...(fmt.numberAllowed === false ? { numberAllowed: false } : {}) } };
    if (it.activity === "post_check_transcript_review") {
      if (!opts.reviewUnlocked) return { id: itemId, level, activity: it.activity, locked: true };
      return { ...base, transcript: it.evidenceSentenceIds.map((id) => ({ sentenceId: id, text: S(id).cleanText })) }; // exposure answer_shown
    }
    // No audio pointer: evidence sentence ids would tell the student where the answer is. The host plays the lesson audio as a whole.
    if (it.responseMode === "choose_option") base.options = shuffle(it.spans.filter((s) => s.role === "correct_answer" || s.role === "distractor").map((s) => s.span.surface), seed);
    return base;
  }
  return null;
}
