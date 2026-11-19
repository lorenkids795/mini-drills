// Small pure rule helpers shared with the Rev1 JS parity vectors (length classification, Answer Spotter mode rules).
export const THRESHOLDS = { level1AdvisoryTiles: [4, 18], level1HardTiles: [2, 40], level3AdvisoryWords: [4, 22], level3HardWords: [2, 60], level4AdvisoryWords: [25, 80], level4AdvisorySentences: [2, 5], level4HardSentences: [2, 8], level4HardWordsMax: 300 };
export function classifyLength(level, wordsCount, sentences) {
  if (level === "level3") { const [lo, hi] = THRESHOLDS.level3HardWords, [a, b] = THRESHOLDS.level3AdvisoryWords; return wordsCount < lo || wordsCount > hi ? "hard_error" : wordsCount < a || wordsCount > b ? "advisory_warning" : "ok"; }
  const [lo, hi] = THRESHOLDS.level4HardSentences;
  if (sentences < lo || sentences > hi || wordsCount > THRESHOLDS.level4HardWordsMax) return "hard_error";
  const [a, b] = THRESHOLDS.level4AdvisoryWords, [c, d] = THRESHOLDS.level4AdvisorySentences;
  return wordsCount < a || wordsCount > b || sentences < c || sentences > d ? "advisory_warning" : "ok";
}
/** true when the combination is a visibility error (E-AS-MODE-VISIBILITY). */
export function answerSpotterModeInvalid(activity, mode, showTranscript) {
  return (mode === "select_span_in_text" && activity === "independent_listening") || (activity === "independent_listening" && !!showTranscript) || (activity === "post_check_transcript_review" && mode !== "select_span_in_text");
}
