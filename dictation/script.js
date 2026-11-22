// Dictation "write the script" (owner decision 11/2026, replaces the 4 levels for students): the student listens and writes the whole
// recording in one box; this compares it with the teacher's script WORD BY WORD. Pure functions, no I/O, no answers inside: the server
// (dictation-server.js) runs it for students; the teacher preview runs it on the device. Case and punctuation are ignored (same tokens
// as the R3 engine); spelling, -s / -ed endings and word order count. Speaker labels at the start of a line ("TOM:") are ignored.
import { tokenizeOffsets, displayTokens } from "./engine/normalize.js";

export const PASS_PERCENT = 70;
export const MAX_SCRIPT_CHARS = 20000, MAX_TEXT_CHARS = 20000;
const MAX_D = 900; // edit distance above this = "too different" (keeps the server fast on the free plan)
const LABEL = /^([ \t]*)([A-Za-z][A-Za-z .'-]{0,30}?)([ \t]*:[ \t]*)/;

/** Labels used in the script ("TOM", "NINA"), lower case. */
export function scriptLabels(script) {
  const out = new Set(); for (const line of String(script || "").split(/\r\n|\r|\n/)) { const m = LABEL.exec(line); if (m) out.add(m[2].trim().toLowerCase()); } return out;
}
// same length text with the known labels blanked, so offsets stay those of the original text
function blankLabels(text, labels) {
  return String(text || "").split(/(\r\n|\r|\n)/).map((line) => { const m = LABEL.exec(line); return m && labels.has(m[2].trim().toLowerCase()) ? " ".repeat(m[0].length) + line.slice(m[0].length) : line; }).join("");
}
function toks(text, labels) { return tokenizeOffsets(blankLabels(text, labels)); }

// Myers O((N+M)D) diff of two token arrays -> ops [{k:'=', i, j} | {k:'-', i} (student extra) | {k:'+', j} (missing script word)]
function diff(a, b) {
  const N = a.length, M = b.length, max = N + M, off = max + 1; let v = new Int32Array(2 * max + 3); const trace = [];
  for (let d = 0; d <= max; d++) {
    if (d > MAX_D) return null;
    trace.push({ lo: off - d - 1, a: v.slice(Math.max(0, off - d - 1), off + d + 2) }); // only the band used at this step
    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) ? v[off + k + 1] : v[off + k - 1] + 1, y = x - k;
      while (x < N && y < M && a[x] === b[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= N && y >= M) { return back(trace, a, b, d, off); }
    }
  }
  return null;
}
function back(trace, a, b, D, off) {
  const ops = []; let x = a.length, y = b.length;
  for (let d = D; d > 0; d--) {
    const tr = trace[d], g = (k) => tr.a[off + k - Math.max(0, tr.lo)], k = x - y;
    const pk = (k === -d || (k !== d && g(k - 1) < g(k + 1))) ? k + 1 : k - 1;
    const px = g(pk), py = px - pk;
    while (x > px && y > py) { x--; y--; ops.push({ k: "=", i: x, j: y }); }
    if (x === px) { y--; ops.push({ k: "+", j: y }); } else { x--; ops.push({ k: "-", i: x }); }
  }
  while (x > 0 && y > 0) { x--; y--; ops.push({ k: "=", i: x, j: y }); }
  return ops.reverse();
}
function lev(s, t) { if (Math.abs(s.length - t.length) > 3) return 9; const d = Array.from({ length: t.length + 1 }, (_, j) => j);
  for (let i = 1; i <= s.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= t.length; j++) { const q = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (s[i - 1] === t[j - 1] ? 0 : 1)); p = q; } } return d[t.length]; }
// a short, rule-based label (the AI may replace it with a better one; this is what students see when the AI is not available)
function label(from, to) {
  const f = from.map((x) => x.token), t = to.map((x) => x.token);
  if (!f.length) return { category: t.length > 1 ? "Missing words" : "Missing word", type: "Grammar" };
  if (!t.length) return { category: f.length > 1 ? "Extra words" : "Extra word", type: "Grammar" };
  if (f.length === 1 && t.length === 1) { const a = f[0], b = t[0];
    if (b === a + "s" || b === a + "es" || a === b + "s" || a === b + "es") return { category: "-s / -es ending", type: "Grammar" };
    if (b === a + "ed" || b === a + "d" || a === b + "ed" || a === b + "d") return { category: "Verb ending -ed", type: "Grammar" };
    if (/\d/.test(a + b)) return { category: "Numbers", type: "Vocabulary" };
    if (lev(a, b) <= 2) return { category: "Spelling", type: "Vocabulary" };
    return { category: "Wrong word", type: "Vocabulary" }; }
  return { category: "Wrong words", type: "Vocabulary" };
}
function sentenceAt(text, pos, len) {
  let a = pos, b = pos + len; while (a > 0 && !/[.!?\n]/.test(text[a - 1])) a--; while (b < text.length && !/[.!?\n]/.test(text[b])) b++;
  return text.slice(a, Math.min(text.length, b + 1)).trim().slice(0, 300);
}

/**
 * compareScript(script, text) -> {text, num, den, pct, passed, words:{script, yours, right}, corrections[], tooDifferent, empty}
 * Score = words in the right order / the larger word count (missing AND extra words both cost). PASS = 70% or more.
 * corrections[i] = {original_text (copied from the student's text), corrected_text, category, type, explanation, explanation_vi, context, at}
 *   (at = the character offset of original_text in text). A missing word is shown on its neighbour: "the" -> "the big".
 */
export function compareScript(script, text) {
  const T = String(text || "").normalize("NFC").slice(0, MAX_TEXT_CHARS), S = String(script || "").normalize("NFC").slice(0, MAX_SCRIPT_CHARS);
  const labels = scriptLabels(S), a = toks(T, labels), b = toks(S, labels);
  const sDisp = displayTokens(blankLabels(S, labels)); // the script words as written (case kept), same order as b
  const out = { text: T, num: 0, den: Math.max(a.length, b.length, 1), pct: 0, passed: false, words: { script: b.length, yours: a.length, right: 0 }, corrections: [], tooDifferent: false, empty: !a.length };
  if (!a.length) return out;
  const ops = diff(a.map((x) => x.token), b.map((x) => x.token));
  if (!ops) { // far too different to mark word by word: count the words that are there at all (order ignored), no list
    const m = new Map(); for (const x of b) m.set(x.token, (m.get(x.token) || 0) + 1); let r = 0; for (const x of a) { const c = m.get(x.token) || 0; if (c) { r++; m.set(x.token, c - 1); } }
    out.num = r; out.words.right = r; out.pct = Math.floor((100 * r) / out.den); out.passed = out.pct >= PASS_PERCENT; out.tooDifferent = true; return out;
  }
  let right = 0; for (const o of ops) if (o.k === "=") right++;
  out.num = right; out.words.right = right; out.pct = Math.floor((100 * right) / out.den); out.passed = out.pct >= PASS_PERCENT;
  // group each run of non-matching ops into one correction
  for (let i = 0; i < ops.length; ) {
    if (ops[i].k === "=") { i++; continue; }
    const from = [], to = []; let j = i; while (j < ops.length && ops[j].k !== "=") { if (ops[j].k === "-") from.push(a[ops[j].i]); else to.push(ops[j].j); j++; }
    const toWords = to.map((k) => sDisp[k] || b[k].token);
    const lab = label(from, to.map((k) => b[k]));
    let start, end, orig, corr;
    const prev = i > 0 ? ops[i - 1] : null, next = j < ops.length ? ops[j] : null;
    if (from.length && to.length) { start = from[0].start; end = from[from.length - 1].end; orig = T.slice(start, end); corr = toWords.join(" "); }
    else if (from.length) { // extra words: show them with the word before (or after), so the corrected text really drops them
      if (prev && prev.k === "=") { const w = a[prev.i]; start = w.start; end = from[from.length - 1].end; corr = T.slice(w.start, w.end); }
      else if (next && next.k === "=") { const w = a[next.i]; start = from[0].start; end = w.end; corr = T.slice(w.start, w.end); }
      else { start = from[0].start; end = from[from.length - 1].end; corr = ""; }
      orig = T.slice(start, end); }
    else { // missing words: anchor on the word before (or after, at the very start)
      if (prev && prev.k === "=") { const w = a[prev.i]; start = w.start; end = w.end; orig = T.slice(start, end); corr = orig + " " + toWords.join(" "); }
      else if (next && next.k === "=") { const w = a[next.i]; start = w.start; end = w.end; orig = T.slice(start, end); corr = toWords.join(" ") + " " + orig; }
      else { i = j; continue; }
    }
    const shown = from.map((x) => T.slice(x.start, x.end)).join(" ");
    out.corrections.push({ original_text: orig, corrected_text: corr, category: lab.category, type: lab.type, at: start,
      explanation: from.length ? (to.length ? "You wrote “" + shown + "”; the recording says “" + toWords.join(" ") + "”." : "“" + shown + "” is not in the recording.") : "Missing: “" + toWords.join(" ") + "”.",
      explanation_vi: from.length ? (to.length ? "Bạn viết “" + shown + "”, trong bài nghe là “" + toWords.join(" ") + "”." : "Bài nghe không có “" + shown + "”.") : "Bạn bỏ sót “" + toWords.join(" ") + "”.",
      context: sentenceAt(T, start, end - start) });
    i = j;
  }
  // two runs shown on the same word (missing words before AND after it) become one correction
  const merged = []; for (const c of out.corrections) { const p = merged[merged.length - 1];
    if (p && p.at === c.at && p.original_text === c.original_text && p.corrected_text.endsWith(c.original_text)) { p.corrected_text = p.corrected_text.slice(0, -c.original_text.length) + c.corrected_text; p.category = "Missing words"; p.explanation += " " + c.explanation; p.explanation_vi += " " + c.explanation_vi; }
    else merged.push(c); }
  out.corrections = merged.filter((c) => c.corrected_text !== c.original_text);
  return out;
}
