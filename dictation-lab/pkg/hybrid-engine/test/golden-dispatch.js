// Maps a golden vector {kind, input} to engine calls. Used by the in-process test and by the stdin/stdout adapter.
import { readFileSync } from "node:fs";
import { Lesson, tokenize, scoreAnswerSpotter, validateAnswerSpotterItem, provenanceLabel, reviewUnlock, reduceAttempts, deriveExposure, aggregateScores, runSession, runL1Events } from "../src/index.js";
const cache = new Map();
export function loadBaseline(path) { if (!cache.has(path)) cache.set(path, JSON.parse(readFileSync(path, "utf8"))); return cache.get(path); }
export function dispatch(kind, input, baselinePath) {
  const doc = loadBaseline(baselinePath); const lesson = new Lesson(doc, { formsApproved: !(input.mutations ?? []).some((m) => m.op === "forms_state" && m.value === "proposed") });
  switch (kind) {
    case "tokenize": return { tokens: tokenize(input.text) };
    case "l1Arrangement": return lesson.l1Arrangement(input);
    case "l1Events": return runL1Events(input);
    case "l2Blanks": return lesson.scoreBlanks(input);
    case "scoreSentence": { const r = lesson.scoreSentence(input); const { ops, ...rest } = r; return rest; }
    case "scoreAnswerSpotter": return scoreAnswerSpotter(lesson, input);
    case "reviewUnlock": return { unlocked: reviewUnlock(input) }; // v1.1 gate; a legacy `setting` in the input is ignored
    case "attemptSequence": return reduceAttempts(input.events, { exposure: input.exposure ?? "none" });
    case "aggregateScores": return aggregateScores(input);
    case "exposureDerivation": return deriveExposure(input);
    case "session": return runSession(input);
    case "provenance": return provenanceLabel(input.item);
    case "itemValidity": return validateAnswerSpotterItem(input.item, input.lesson ?? {});
    default: return null; // studentPayload, render: need a real UI
  }
}
export function subset(exp, got) {
  if (exp !== null && typeof exp === "object" && !Array.isArray(exp)) return got !== null && typeof got === "object" && !Array.isArray(got) && Object.entries(exp).every(([k, v]) => k in got && subset(v, got[k]));
  if (Array.isArray(exp)) return Array.isArray(got) && exp.length === got.length && exp.every((v, i) => subset(v, got[i]));
  return exp === got;
}
