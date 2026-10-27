// Colour-contrast audit of the design tokens in index.html (light + dark), WCAG 2 formula.
// Run: node tests/contrast.js          (prints every pair; exit 1 if a required pair fails)
'use strict';
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = html.slice(0, html.indexOf('<script>\n(function(){'));
// collect every token definition per theme (later definitions win, like the cascade)
const T = { light: {}, dark: {} };
const take = (theme, body) => { body.replace(/--([\w-]+)\s*:\s*([^;}]+)/g, (m, k, v) => { T[theme][k] = v.trim(); }); };
css.replace(/(^|\n|\})\s*:root\{([^}]*)\}/g, (m, a, b) => { take('light', b); });
css.replace(/:root\[data-theme="dark"\]\{([^}]*)\}/g, (m, b) => { take('dark', b); });
const val = (th, k, d) => { d = d || 0; if (k[0] === '#') return k; let v = T[th][k] != null ? T[th][k] : T.light[k]; if (v == null) return null; const r = /^var\(--([\w-]+)\)$/.exec(v); return r && d < 5 ? val(th, r[1], d + 1) : v; };
const rgb = (h) => { h = String(h || '').trim(); const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h); if (!m) return null; let s = m[1]; if (s.length === 3) s = s.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); };
// [text, background, minimum] — 4.5 = body text, 3 = large/bold text, icons, borders of controls
const TEXT = ['ink', 'muted', 'accent', 'good', 'bad', 'warn'];
const BGS = ['bg', 'surface', 'surface-2', 'elev'];
const P = [];
TEXT.forEach((t) => BGS.forEach((b) => P.push([t, b, 4.5])));
[['ink', 'good-bg', 4.5], ['good', 'good-bg', 4.5], ['ink', 'bad-bg', 4.5], ['bad', 'bad-bg', 4.5], ['ink', 'hl-soft', 4.5], ['muted', 'hl-soft', 4.5],
 ['accent-ink', 'accent', 4.5], ['bad-ink', 'bad', 4.5], ['done-ink', 'done', 4.5], ['more-ink', 'more', 4.5], ['#14213d', 'hl', 4.5],
 ['lm-amber', 'bg', 4.5], ['lm-w', 'bg', 3], ['lm-l', 'bg', 3], ['lm-r', 'bg', 3], ['lm-s', 'bg', 3],
 ['tal', 'surface', 4.5], ['ccl', 'surface', 4.5], ['ink', 'ta', 4.5], ['ink', 'cc', 4.5], ['ink', 'mk-y', 4.5], ['ink', 'mk-g', 4.5], ['ink', 'mk-p', 4.5],
 ['ch0', 'surface', 3], ['ch1', 'surface', 3], ['ch2', 'surface', 3], ['ch3', 'surface', 3],
 ['line-2', 'surface', 3], ['nav-ink', 'nav', 4.5], ['ink', 'you-bg', 4.5], ['ink', 'track', 4.5]].forEach((p) => P.push(p));
let bad = 0;
['light', 'dark'].forEach((th) => P.forEach(([t, b, min]) => {
  const a = rgb(val(th, t)), c = rgb(val(th, b)); if (!a || !c) { console.log('SKIP ' + th + ' ' + t + ' on ' + b + ' (' + val(th, t) + ' / ' + val(th, b) + ')'); return; }
  const r = ratio(a, c), ok = r >= min; if (!ok) bad++;
  if (!ok || process.argv.includes('--all')) console.log((ok ? 'ok   ' : 'FAIL ') + th.padEnd(5) + ' ' + ('--' + t).padEnd(14) + ' on ' + ('--' + b).padEnd(12) + ' ' + r.toFixed(2) + ' (need ' + min + ')');
}));
console.log('---- ' + bad + ' failing pair(s)');
process.exit(bad ? 1 : 0);
