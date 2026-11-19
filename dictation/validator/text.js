// Text helpers. All offsets in the contract are UTF-16 code units, which is what JavaScript strings index natively.
// Where the Python reference counts code points (string length limits), this file counts code points explicitly.
export const WS_RE = /[ \t\n\r\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/;
export const QRE_SRC = "\\s*\\(Q(\\d+)\\)";
export function cpLength(s) { let n = 0; for (const _ of s) n++; return n; }
export function utf8Length(s) { return new TextEncoder().encode(s).length; }
export function tokens(t) { return t.split(WS_RE).filter((x) => x.length > 0); }
export function hasLN(x) { return /[\p{L}\p{N}]/u.test(x); }
export function words(t) { return tokens(t).filter(hasLN); }
export function isWordchar(c) { return /^[\p{L}\p{N}\p{M}_'\u2019-]$/u.test(c); }
export function normTok(x) {
  let y = x.replace(/\u2019/g, "'").normalize("NFC").toLowerCase();
  y = y.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, "");
  return y;
}
function cpBefore(text, i) {
  if (i <= 0) return "";
  const c = text.charCodeAt(i - 1);
  if (c >= 0xdc00 && c <= 0xdfff && i >= 2) { const h = text.charCodeAt(i - 2); if (h >= 0xd800 && h <= 0xdbff) return text.slice(i - 2, i); }
  return text[i - 1];
}
function cpAt(text, i) { return i < text.length ? String.fromCodePoint(text.codePointAt(i)) : ""; }
// UTF-16 start offsets of whole-token, case-insensitive matches (boundary = letter, number, mark, _ ' U+2019 -). Mirrors the Python reference.
export function matches(text, surface) {
  const out = []; const ls = surface.toLowerCase(); const lo = text.toLowerCase();
  if (cpLength(lo) !== cpLength(text) || !surface) return out;
  let i = lo.indexOf(ls);
  while (i >= 0) {
    const pre = cpBefore(text, i); const post = cpAt(text, i + surface.length);
    if (!(pre && isWordchar(pre)) && !(post && isWordchar(post))) out.push(i);
    i = lo.indexOf(ls, i + 1);
  }
  return out;
}
export function cmpStr(a, b) { // code point order, like Python str comparison
  const x = Array.from(a), y = Array.from(b); const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) { const d = x[i].codePointAt(0) - y[i].codePointAt(0); if (d) return d; }
  return x.length - y.length;
}
export function hasLoneSurrogate(s) { return /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(s); }
export function* walkStrings(o, path = "$") {
  if (typeof o === "string") yield [path, o];
  else if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) yield* walkStrings(o[i], `${path}[${i}]`); }
  else if (o !== null && typeof o === "object") { for (const k of Object.keys(o)) yield* walkStrings(o[k], `${path}.${k}`); }
}
export const isDigitChar = (ch) => /[\p{Nd}\u00b2\u00b3\u00b9\u2070\u2074-\u2079\u2080-\u2089\u2460-\u2468\u2474-\u247c\u2488-\u2490\u24ea\u24f5-\u24fd\u24ff\u2776-\u277e\u2780-\u2788\u278a-\u2792\u1369-\u1371\u19da\u{10a40}-\u{10a43}\u{10e60}-\u{10e68}\u{11052}-\u{1105a}\u{1f100}-\u{1f10a}]/u.test(ch); // approximates Python str.isdigit() (Numeric_Type Digit + Decimal); 11/2026: +43 code points Python counts and JS missed (Ethiopic, New Tai Lue, Kharoshthi, Rumi, Brahmi, U+1F100-1F10A)
export const isAlphaStr = (s) => s.length > 0 && /^\p{L}+$/u.test(s);
