// UI/UX baseline of CLAUDE.md 5b, checked from the source (no browser): contrast, accessible names, keyboard, motion, overflow.
// Run: node tests/ui-audit.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), back = fs.readFileSync(path.join(ROOT, 'md-backend.js'), 'utf8');
const css = html.slice(0, html.indexOf('<script>\n(function(){'));
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + e.message); } };
const run = (f) => { try { cp.execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'pipe' }); return ''; } catch (e) { return String(e.stdout || e.message); } };
const ln = (src, i) => src.slice(0, i).split('\n').length;

t('colour tokens: text 4.5:1, icons / control borders 3:1, light and dark (tests/contrast.js)', () => { const r = run('contrast.js'); assert.strictEqual(r, '', r); });
t('text on background inside the same CSS rule: 4.5:1 in both themes (tests/contrast-rules.js)', () => { const out = cp.execFileSync(process.execPath, [path.join(__dirname, 'contrast-rules.js')]).toString().trim(); assert.strictEqual(out, '', out); });
t('every button with only an icon / symbol has an aria-label', () => {
  [['index.html', html], ['md-backend.js', back]].forEach(([f, src]) => { const re = /<button\b([^>]*)>([\s\S]{0,300}?)<\/button>/g; let m;
    while ((m = re.exec(src))) { if (/aria-label|aria-labelledby/.test(m[1])) continue; let x = m[2].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]*>/g, ''); if (/'\s*\+/.test(x)) continue;
      x = x.trim(); assert.ok(!(x === '' && /<svg/.test(m[2])) && !(x && !/[A-Za-zÀ-ỹ0-9]/.test(x)), f + ':' + ln(src, m.index) + ' ' + JSON.stringify(x)); } });
});
t('no emoji as a button icon (stroke SVG icons only; ▶ ⏸ media glyphs allowed)', () => {
  const re = /<button\b[^>]*>([\s\S]{0,200}?)<\/button>/g; let m; while ((m = re.exec(html))) { const e = m[1].replace(/<[^>]*>/g, '').match(/\p{Extended_Pictographic}/gu) || []; e.forEach((c) => assert.ok('▶⏸'.includes(c), 'line ' + ln(html, m.index) + ': ' + c)); }
});
t('form controls have a name for screen readers (label for / wrapping label / aria-label)', () => {
  const re = /<(input|select|textarea)\b([^>]*)>/g; let m, bad = [];
  while ((m = re.exec(html))) { const a = m[2]; if (/type=\\?["']?(hidden|file|checkbox|radio)|\bhidden\b/.test(a) || /aria-label|aria-labelledby|title=/.test(a)) continue;
    if (/^\s*choices/.test(a) || /'\+al\+'/.test(a)) continue; // a code comment / xLeaf (aria-label in a variable)
    const raw = (/id="([^"]*)"/.exec(a) || [])[1], id = raw && raw.split("'+")[0];
    if (id && (html.indexOf('for="' + raw + '"') >= 0 || (raw.indexOf("'+") > 0 && html.indexOf('for="' + id + "'+") >= 0))) continue;
    const b = html.slice(Math.max(0, m.index - 400), m.index); if (b.lastIndexOf('<label') > b.lastIndexOf('</label>')) continue; bad.push(ln(html, m.index) + ' ' + m[1]); }
  assert.deepStrictEqual(bad, []);
});
t('clickable elements that are not buttons are keyboard reachable (role="button" + tabindex) or are backdrops', () => {
  const OK = new Set(['sb-close', 'mk-close', 'fb-close', 'rm-sclose', 'stu', 'wh-center', 'lu-ihint']); const re = /<(div|span|li|p|td|tr|label|mark|b|section|g)\b([^>]*data-act="([^"]+)"[^>]*)>/g; let m;
  while ((m = re.exec(html))) { if (OK.has(m[3])) continue; assert.ok(/role="button"/.test(m[2]) && /tabindex="0"/.test(m[2]), 'line ' + ln(html, m.index) + ' ' + m[3]); }
  assert.ok(/getAttribute\('role'\)==='button'&&t\.tagName!=='BUTTON'&&t\.getAttribute\('data-act'\)&&t\.click\)\{e\.preventDefault\(\);t\.click\(\)\}/.test(html), 'Enter / Space handler');
});
t('focus is always visible; no outline removed without a replacement', () => {
  assert.ok(/(^|\})\s*:focus-visible\{outline:2px solid var\(--accent\)/.test(css));
  css.replace(/([^{}]+)\{([^{}]*)\}/g, (m, sel, b) => { if (/outline:\s*(none|0)\b/.test(b)) assert.ok(/box-shadow|border|background/.test(b) || /box-shadow/.test((css.match(new RegExp(sel.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*box-shadow', 'g')) || []).join('')), sel.trim()); });
});
t('tap targets: buttons 40px (small 34px), 44px on touch screens', () => {
  assert.ok(/\.btn\{min-height:40px;cursor:pointer\}\.btn\.sm\{min-height:34px\}/.test(css)); assert.ok(/@media \(pointer:coarse\)\{\.btn,\.btn\.sm,\.iconbtn,\.linkish\{min-height:44px\}/.test(css));
});
t('reduced motion: one global rule stops every animation and transition', () => { assert.ok(/@media \(prefers-reduced-motion:reduce\)\{\*,\*::before,\*::after\{animation-duration:\.01ms!important;animation-iteration-count:1!important;transition-duration:\.01ms!important/.test(css)); });
t('right / wrong is never shown by colour alone (✓ / ✗ marks, dashed wrong blank)', () => {
  assert.ok(/\.opt\.good::after\{content:'✓'\}\.opt\.bad::after\{content:'✗'\}/.test(css) && /\.gap\.bad,\.msel\.bad\{border-style:dashed\}/.test(css) && /\.luopt\.cor::before\{content:'✓ '/.test(css));
});
t('small uppercase labels always have letter-spacing', () => { css.replace(/([^{}]+)\{([^{}]*)\}/g, (m, sel, b) => { if (/text-transform:uppercase/.test(b)) assert.ok(/letter-spacing/.test(b), sel.trim()); }); });
t('one font family (+ mono for numbers): no other font-family in the app', () => { (html.match(/font-family:[^;}]*/g) || []).forEach((f) => assert.ok(/var\(--(font|mono)\)/.test(f), f)); });
t('wide tables scroll inside their box on a 390px phone', () => {
  const re = /<table\b([^>]*)>/g; let m; while ((m = re.exec(html))) { const b = html.slice(Math.max(0, m.index - 120), m.index); assert.ok(/scroll|dscr|tscr|rtw/.test(b), 'line ' + ln(html, m.index) + ' ' + m[1]); }
});
t('phones: the sticky lesson action bar stops floating while typing', () => { assert.ok(/\.ls:has\(input\[type=text\]:focus,input:not\(\[type\]\):focus,textarea:focus\)>\.actions/.test(css)); });
t('specific CTA labels (no bare "Submit" / "Use" / "Open it")', () => { assert.ok(!/>(Submit|Use|Open it)<\/button>/.test(html)); });

console.log('---- ' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
