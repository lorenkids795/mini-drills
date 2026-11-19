// Contract C2/C3: order-aware matching (LCS), deterministic feedback ops, approved-variant selection, target error tracking.
export const CRITICAL = new Set(["ielts_answer_candidate", "number", "date_time", "price"]);
export function lcsTable(e, a) {
  const n = e.length, m = a.length; const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) L[i][j] = e[i - 1] === a[j - 1] ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
  return L;
}
/** Deterministic backtrace: match first; else expected token missing when L[i-1][j] >= L[i][j-1]; else answer token extra. */
export function align(e, a) {
  const L = lcsTable(e, a); let i = e.length, j = a.length; const ops = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && e[i - 1] === a[j - 1] && L[i][j] === L[i - 1][j - 1] + 1) { ops.push(["match", i - 1, j - 1]); i--; j--; }
    else if (i > 0 && (j === 0 || L[i - 1][j] >= L[i][j - 1])) { ops.push(["missing", i - 1, null]); i--; }
    else { ops.push(["extra", null, j - 1]); j--; }
  }
  return { ops: ops.reverse(), lcs: L[e.length][a.length] };
}
const better = (c1, c2) => c1[0] * c2[1] > c2[0] * c1[1] || (c1[0] * c2[1] === c2[0] * c1[1] && c1[0] > c2[0]);
/**
 * exp: [{token, sent}] expected tokens; a: answer tokens; spans: [{first, last, alts:[{label, tokens}]}] sorted by first; tracks: [{first, last, target}].
 * Chooses the variant combination with the best accuracy, then larger lcs, then the earliest combination (original first). Combination order: last span varies fastest.
 */
export const MAX_COMBINATIONS = 256;
export function scoreVariants(exp, a, spans, tracks = []) {
  const options = spans.map((s) => [null, ...s.alts]);
  const evalChoice = (idx) => {
    const etok = [], sidx = [], labels = [], o2v = new Map(); let cur = 0;
    const addOrig = (q) => { o2v.set(q, [etok.length, etok.length + 1]); etok.push(exp[q].token); sidx.push(exp[q].sent); };
    spans.forEach((sp, k) => {
      while (cur < sp.first) { addOrig(cur); cur++; }
      const alt = options[k][idx[k]];
      if (alt === null) for (let q = sp.first; q <= sp.last; q++) addOrig(q);
      else { labels.push("alt:" + alt.label); const st = etok.length; for (const tk of alt.tokens) { etok.push(tk); sidx.push(exp[sp.first].sent); } for (let q = sp.first; q <= sp.last; q++) o2v.set(q, [st, etok.length]); }
      cur = sp.last + 1;
    });
    while (cur < exp.length) { addOrig(cur); cur++; }
    const { ops, lcs } = align(etok, a); const den = Math.max(etok.length, a.length);
    return { lcs, den, exact: etok.length === a.length && etok.every((x, i) => x === a[i]), variant: labels.length ? labels.join("+") : "original", missing: etok.length - lcs, extra: a.length - lcs, ops, sidx, o2v };
  };
  const total = options.reduce((p, o) => p * o.length, 1); let best = null;
  if (total <= MAX_COMBINATIONS) {
    const idx = new Array(spans.length).fill(0);
    for (let c = 0; c < total; c++) {
      const cand = evalChoice(idx); if (best === null || better([cand.lcs, cand.den], [best.lcs, best.den])) best = cand;
      for (let k = spans.length - 1; k >= 0; k--) { idx[k]++; if (idx[k] < options[k].length) break; idx[k] = 0; } // odometer: last span varies fastest
    }
  } else { // contract C3: too many combinations, choose greedily from left to right (later spans keep the original)
    const idx = new Array(spans.length).fill(0); best = evalChoice(idx);
    for (let k = 0; k < spans.length; k++) { let bk = 0; for (let o = 1; o < options[k].length; o++) { idx[k] = o; const cand = evalChoice(idx); if (better([cand.lcs, cand.den], [best.lcs, best.den])) { best = cand; bk = o; } } idx[k] = bk; }
  }
  const matched = new Set(best.ops.filter((o) => o[0] === "match").map((o) => o[1])); const wrong = []; let crit = 0;
  for (const tr of tracks) {
    const vs = new Set(); for (let q = tr.first; q <= tr.last; q++) { const [s0, e0] = best.o2v.get(q); for (let v = s0; v < e0; v++) vs.add(v); }
    if ([...vs].some((v) => !matched.has(v))) { wrong.push(tr.target.id); if (tr.target.focusTypes.some((f) => CRITICAL.has(f))) crit++; }
  }
  best.targetErrors = wrong.length; best.criticalTargetErrors = crit; best.wrongTargets = wrong; best.matched = matched; return best;
}
