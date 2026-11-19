// Contract v1 section 1 (C1): normalisation, tokenisation, input hygiene, speaker-label stripping. Pure functions, no I/O.
export const MAX_ANSWER_CHARS = 4000;
const WS = " \\t\\n\\r\\f\\v\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff";
const CHUNK_RE = new RegExp(`[^${WS}]+`, "gu");
const P = /^\p{P}$/u, ND = /^\p{Nd}$/u, LN = /[\p{L}\p{N}]/u, CC = /^\p{Cc}$/u;
const BIDI = new Set(["\u202a", "\u202b", "\u202c", "\u202d", "\u202e", "\u2066", "\u2067", "\u2068", "\u2069"]);
const cps = (s) => Array.from(s);
export function cpLength(s) { return cps(s).length; }

/** Contract C1 steps 5-6: strip punctuation from both ends of one chunk (keeps a leading -/. before a digit and a trailing % or per-mille). Case is preserved. */
export function stripEnds(x) {
  const a = cps(x); let i = 0, j = a.length;
  while (i < j) {
    const c = a[i]; if (!P.test(c)) break;
    const nxt = i + 1 < j ? a[i + 1] : "";
    if ((c === "-" || c === ".") && nxt && ND.test(nxt)) break; // leading minus sign or decimal point before a digit
    i++;
  }
  while (j > i) { const c = a[j - 1]; if (!P.test(c) || c === "%" || c === "\u2030") break; j--; }
  return a.slice(i, j).join("");
}
/** [{token, start, end}] where start/end are UTF-16 offsets of the whitespace-delimited chunk in the NORMALISED text. */
export function tokenizeOffsets(text) {
  let t = text.normalize("NFC").replace(/[\u2019\u2018\u02bc]/g, "'").replace(/\u2212/g, "-").toLowerCase();
  const out = []; CHUNK_RE.lastIndex = 0; let m;
  while ((m = CHUNK_RE.exec(t)) !== null) { const tok = stripEnds(m[0]); if (LN.test(tok)) out.push({ token: tok, start: m.index, end: m.index + m[0].length }); }
  return out;
}
export const tokenize = (text) => tokenizeOffsets(text).map((x) => x.token);
/** Display surfaces for Level 1 tiles: the same chunks and end-stripping as tokenize(), but NOT lower-cased or apostrophe-mapped, so tokenize(surface) equals the scoring token. */
export function displayTokens(text) { const t = text.normalize("NFC"); const out = []; CHUNK_RE.lastIndex = 0; let m; while ((m = CHUNK_RE.exec(t)) !== null) { const s = stripEnds(m[0]); if (LN.test(s)) out.push(s); } return out; }
export function sanitize(s) {
  let flag = false; let out = "";
  for (const c of s) { if ((CC.test(c) && c !== "\t" && c !== "\n" && c !== "\r") || BIDI.has(c)) { flag = true; continue; } out += c; }
  return { text: out, sanitized: flag };
}
const normLabel = (x) => x.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Level 4 only (contract C8). Drops a KNOWN speaker label at the start of a line; never touches mid-line text. */
export function stripSpeakerLabels(answer, speakers, expectedTexts) {
  const cands = new Set(); for (const sp of speakers) { cands.add(normLabel(sp.rawLabel)); cands.add(normLabel(sp.displayName)); }
  for (const L of [...cands]) if (expectedTexts.some((t) => { const n = normLabel(t); return new RegExp("^\\s*" + escRe(L) + "\\s*:").test(n) || n.startsWith(L + ":"); })) cands.delete(L);
  return answer.split(/\r\n|\r|\n/).map((line) => { const m = /^[ \t]*([^:\n]{1,40}?)[ \t]*:[ \t]*/.exec(line); return m && cands.has(normLabel(m[1])) ? line.slice(m[0].length) : line; }).join("\n");
}
/** Prepare a student answer: length guard, sanitise, optional label stripping, tokenise. Returns {tokens, sanitized} or {rejected}. */
export function prepareAnswer(raw, strip) {
  if (cpLength(raw) > MAX_ANSWER_CHARS) return { rejected: "answer_too_long" };
  const s = sanitize(raw); const text = strip ? strip(s.text) : s.text; const tokens = tokenize(text);
  if (!tokens.length) return { rejected: "empty_answer", sanitized: s.sanitized };
  return { tokens, sanitized: s.sanitized };
}
