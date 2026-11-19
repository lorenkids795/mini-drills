// Hybrid content selection (contract C14). Transcript Only and any level without explicit items get MECHANICAL defaults: no AI, no randomness, audio order.
// Explicit items from an AI import override defaults. Blocked, disabled or deselected sentences are never used. Answer Spotter items are never auto-generated.
import { tokenizeOffsets } from "./normalize.js";
const WS_SPLIT = /[ \t\n\r\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/;
const words = (t) => t.split(WS_SPLIT).filter((x) => /[\p{L}\p{N}]/u.test(x));
const STOP = new Set("the a an and or but of to in on at for with from by is are was were be been it its this that these those i you he she we they my your his her our their me him us them as if so not no do does did have has had will would can could should there here when where what who how than then also just very about into over after before more most some any".split(" "));
export const DEFAULTS = { level1: { min: 6, max: 14, count: 10 }, level2: { min: 6, max: 20, count: 10 }, level3: { min: 4, max: 22, count: 10 }, level4: { minWords: 25, maxWords: 80, maxSentences: 5, count: 4 } };

export function blockedSentenceIds(doc) {
  const b = new Set(); for (const x of doc.audit?.issues ?? []) if (["proposed_correction", "needs_audio_verification", "unresolved"].includes(x.status) && x.blocksScoredUse) for (const id of x.affectedSentenceIds) b.add(id);
  for (const s of doc.transcript.sentences) if (s.textStatus === "pending_verification") b.add(s.id); return b;
}
/** Sentences that may ever be used in an exercise. deselected: ids the teacher switched off in this session (all sentences are selected by default). */
export function eligibleSentences(doc, deselected = []) {
  const off = new Set(deselected); const blocked = blockedSentenceIds(doc);
  return doc.transcript.sentences.filter((s) => s.enabled && !blocked.has(s.id) && !off.has(s.id));
}
const evenly = (list, n) => { if (list.length <= n) return list.slice(); const out = []; for (let k = 0; k < n; k++) out.push(list[Math.floor(((k + 0.5) * list.length) / n)]); return [...new Set(out)]; };
const pad = (p, i) => `${p}-${String(i).padStart(3, "0")}`;

function occurrenceAt(text, start, surface) {
  const lo = text.toLowerCase(), ls = surface.toLowerCase(); let n = 0, i = lo.indexOf(ls); const isW = (c) => !!c && /^[\p{L}\p{N}\p{M}_'\u2019-]$/u.test(c);
  while (i >= 0) { const pre = i > 0 ? text[i - 1] : "", post = text[i + surface.length] ?? ""; if (!isW(pre) && !isW(post)) { n++; if (i === start) return n; } i = lo.indexOf(ls, i + 1); }
  return 0;
}
export function defaultTarget(sentence, id) {
  const t = sentence.cleanText; if (t.normalize("NFC").toLowerCase().length !== t.length) return null;
  const tw = tokenizeOffsets(t).map((x) => { const low = t.toLowerCase().slice(x.start, x.end); const k = low.indexOf(x.token); return { token: x.token, a: x.start + k, b: x.start + k + x.token.length }; });
  let pick = tw.find((x) => /\p{Nd}/u.test(x.token)); if (!pick) { const c = tw.filter((x) => !STOP.has(x.token) && x.token.replace(/[^\p{L}]/gu, "").length >= 4); pick = c.sort((p, q) => q.token.length - p.token.length || p.a - q.a)[0]; }
  if (!pick) return null; const surface = t.slice(pick.a, pick.b); const occ = occurrenceAt(t, pick.a, surface); if (!occ) return null;
  return { id, sentenceId: sentence.id, charStart: pick.a, charEnd: pick.b, surface, occurrence: occ, focusTypes: [/\p{Nd}/u.test(pick.token) ? "number" : "content_word"], confidence: "low", rationale: "engine default: mechanical choice, not a pedagogical judgement", source: "engine_default" };
}
export function defaultLevel4(doc, sentences, minWords, maxWords, maxSent) {
  const turn = new Map(doc.transcript.turns.map((t) => [t.id, t])); const brk = new Map((doc.transcript.sectionBreaks ?? []).map((b) => [b.afterSentenceId, b])); const all = doc.transcript.sentences; const ok = new Set(sentences.map((s) => s.id)); const out = [];
  let i = 0;
  while (i < all.length) {
    if (!ok.has(all[i].id)) { i++; continue; }
    const spk = turn.get(all[i].turnId).speakerId; let j = i, w = 0; const ids = [];
    while (j < all.length && ok.has(all[j].id) && turn.get(all[j].turnId).speakerId === spk && ids.length < maxSent) { w += words(all[j].cleanText).length; ids.push(all[j].id); if (ids.length >= 2 && w >= minWords) break; const b = brk.get(all[j].id); if (b && b.continuityAcrossBreak !== "confirmed_continuous") { j++; break; } j++; }
    const total = ids.reduce((a, id) => a + words(all.find((s) => s.id === id).cleanText).length, 0);
    if (ids.length >= 2 && total >= minWords && total <= maxWords) { out.push(ids); i = all.findIndex((s) => s.id === ids[ids.length - 1]) + 1; } else i++;
  }
  return out;
}
/** Builds the exercise set. options: {deselected, settings}. Returns {level1:[], level2:[], level3:[], level4:[], answerSpotter:[], targets:[], notes:[]}. */
export function buildExerciseSet(doc, options = {}) {
  const elig = eligibleSentences(doc, options.deselected); const ex = doc.exercises ?? {}; const res = { level1: [], level2: [], level3: [], level4: [], answerSpotter: [], targets: [...(doc.learningTargets ?? [])], notes: [] };
  const usable = new Set(elig.map((s) => s.id)); const explicit = (lv) => (ex[lv]?.items ?? []);
  for (const lv of ["level1", "level2", "level3", "level4"]) {
    const items = explicit(lv).filter((it) => (it.sentenceIds ?? [it.sentenceId]).every((id) => usable.has(id)) && it.enabled !== false); const dropped = explicit(lv).length - items.length;
    if (dropped) res.notes.push(`${lv}: ${dropped} explicit item(s) dropped because a sentence is blocked, disabled or deselected`);
    const mode = ex[lv]?.itemsMode ?? (explicit(lv).length ? "explicit_items_only" : "engine_default");
    res[lv] = items.map((it) => ({ ...it, source: "explicit" }));
    if (mode === "explicit_items_only") continue;
    const used = new Set(res[lv].flatMap((it) => it.sentenceIds ?? [it.sentenceId])); const D = DEFAULTS[lv]; const free = elig.filter((s) => !used.has(s.id)); let n = res[lv].length;
    const add = (it) => { if (n < D.count) { res[lv].push({ ...it, source: "engine_default" }); n++; } };
    if (lv === "level1") for (const s of evenly(free.filter((s) => words(s.cleanText).length >= D.min && words(s.cleanText).length <= D.max), D.count - n)) add({ id: pad("l1", res[lv].length + 1), sentenceId: s.id, grammarOnlyRisk: "medium" });
    if (lv === "level3") for (const s of evenly(free.filter((s) => words(s.cleanText).length >= D.min && words(s.cleanText).length <= D.max), D.count - n)) add({ id: pad("l3", res[lv].length + 1), sentenceId: s.id });
    if (lv === "level2") for (const s of evenly(free.filter((s) => words(s.cleanText).length >= D.min && words(s.cleanText).length <= D.max), D.count - n)) {
      const tg = defaultTarget(s, pad("tg", res.targets.length + 1)); if (tg) { res.targets.push(tg); add({ id: pad("l2", res[lv].length + 1), sentenceId: s.id, blanks: [{ targetId: tg.id }] }); }
    }
    if (lv === "level4") for (const ids of defaultLevel4(doc, free, D.minWords, D.maxWords, D.maxSentences).slice(0, D.count - n)) { const spk = new Set(ids.map((id) => doc.transcript.turns.find((t) => t.id === doc.transcript.sentences.find((s) => s.id === id).turnId).speakerId)); add({ id: pad("l4", res[lv].length + 1), sentenceIds: ids, ...(spk.size > 1 ? { multiSpeaker: true } : {}) }); }
  }
  res.answerSpotter = explicit("answerSpotter").filter((it) => it.evidenceSentenceIds.every((id) => usable.has(id))).map((it) => ({ ...it, source: "explicit" })); // never auto-generated
  return res;
}
