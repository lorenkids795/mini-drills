// Content check for Learning Materials units (real content files, real chart engine): Unit 2 and Unit 0.
//   node tests/lm-check.js            -> errors + pending count per unit (pending is allowed while drafting)
//   node tests/lm-check.js --release  -> also fails while ANY item is still pending (release gate)
//   node tests/lm-check.js --report   -> also writes tests/lm-review.html (Unit 2) and tests/lm-review-u0.html (Unit 0): owner review tables; do not upload them
//   --unit 0 / --unit 2               -> one unit only
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const LMX = require(path.join(ROOT, 'lm-engine.js'));
const release = process.argv.includes('--release'), report = process.argv.includes('--report'), only = (process.argv[process.argv.indexOf('--unit') + 1] || '');
const UNITS = [{ n: '2', name: 'Unit 2', file: 'lm-unit2.js', out: 'lm-review.html' }, { n: '0', name: 'Unit 0', file: 'lm-unit0.js', out: 'lm-review-u0.html' }].filter((x) => !process.argv.includes('--unit') || x.n === only);
let U2, r, NAME, bad = 0;
UNITS.forEach((x) => {
  U2 = require(path.join(ROOT, x.file)); NAME = x.name; r = LMX.lmCheck(U2, release);
  console.log(x.name + ' content: ' + r.total + ' items · ' + r.approved + ' approved · ' + r.pending + ' pending');
  if (r.errors.length) { bad++; console.log(r.errors.length + ' problem(s):'); r.errors.forEach((e) => console.log('  - ' + e)); }
  else console.log(release ? 'Release check passed.' : 'No problems (drafts may still be pending).');
  if (report) { fs.writeFileSync(path.join(__dirname, x.out), html(r)); console.log('Wrote tests/' + x.out); }
});
process.exit(bad ? 1 : 0);

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function res(t, x) { const o = LMX.lmResolve(t, x, r.ctx); return o.text == null ? '⚠ ' + t + ' (cannot fill ' + o.missing.join(' ') + ')' : o.text; }
function ev(f) {
  if (!f) return '⚠ missing fact';
  const e = f.evidence || {};
  return f.status + ' · result ' + JSON.stringify(f.result) + (Object.keys(e).length ? ' · ' + JSON.stringify(e) : '') + (f.reason ? ' · ' + f.reason : '');
}
function factsCell(x) {
  const B = x.binds || (x.fact ? { f: x.fact } : {});
  return Object.keys(B).map((k) => '<div><code>' + esc(k) + '</code> ' + esc(B[k]) + '<br><small>' + esc(ev(r.ctx.byId[B[k]])) + '</small></div>').join('');
}
function errsFor(id) {
  const L = r.errors.filter((e) => e.indexOf(' ' + id + ':') >= 0);
  return L.length ? '<span class="bad">' + L.map(esc).join('<br>') + '</span>' : '<span class="ok">OK</span>';
}
function st(x) { return '<span class="' + (x.review === 'approved' ? 'ok' : 'pend') + '">' + esc(x.review) + '</span>'; }
function table(head, rows) { return '<table><thead><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table>'; }
function html(r) {
  const CH = r.ctx.charts, ids = [];
  let h = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + NAME + ' review</title><style>' +
    'body{font:15px/1.5 system-ui,sans-serif;margin:24px;color:#1b2030;background:#fff}h1{font-size:1.4rem}h2{margin-top:32px;font-size:1.15rem}' +
    'table{border-collapse:collapse;width:100%;margin:8px 0 16px}th,td{border:1px solid #d5dae5;padding:6px 8px;vertical-align:top;text-align:left}th{background:#f1f3f8}' +
    'code{font-size:.85em}small{color:#5b6478}.ok{color:#0a7a45;font-weight:600}.bad{color:#b42323;font-weight:600}.pend{color:#8a5a00;font-weight:600}' +
    '.sum{padding:10px 14px;background:#fff7e0;border:1px solid #ecd28b;border-radius:8px}</style></head><body><h1>Learning Materials · ' + NAME + ' · content review</h1>' +
    '<p class="sum"><b>' + r.total + '</b> items · <b>' + r.approved + '</b> approved · <b>' + r.pending + '</b> pending · <b>' + r.errors.length + '</b> problem(s). ' +
    'All chart data is illustrative (made up). To approve, send the list of item ids you agree with (bottom of this page).</p>';
  if (r.errors.length) h += '<h2>Problems</h2><ul>' + r.errors.map((e) => '<li class="bad">' + esc(e) + '</li>').join('') + '</ul>';
  Object.keys(CH).forEach((k) => {
    const fx = CH[k].fx, c = fx.chart;
    h += '<h2>Chart ' + k + ': ' + esc(c.title) + '</h2><p>Unit: ' + esc(c.unit) + ' · used in: ' + esc((fx.stages || []).join(', ')) + ' · id <code>' + esc(fx.id) + '@' + fx.version + '</code></p>';
    const xs = c.series[0].points.map((p) => p.x);
    h += table(['Year'].concat(c.series.map((s) => esc(s.label))), xs.map((x) => '<tr><td>' + x + '</td>' + c.series.map((s) => '<td>' + esc((s.points.find((p) => p.x === x) || {}).y) + '</td>').join('') + '</tr>'));
    h += '<details><summary>Verified facts (' + CH[k].res.facts.length + ')</summary>' + table(['Fact id', 'Status', 'Result', 'Evidence'], CH[k].res.facts.map((f) =>
      '<tr><td><code>' + esc(f.id) + '</code></td><td>' + esc(f.status) + (f.reason ? '<br><small>' + esc(f.reason) + '</small>' : '') + '</td><td>' + esc(JSON.stringify(f.result)) + '</td><td><small>' + esc(JSON.stringify(f.evidence)) + '</small></td></tr>')) + '</details>';
    const cl = (U2.claims || []).filter((x) => x.chart === k);
    if (cl.length) h += '<h3>Sentences</h3>' + table(['Id', 'Stage', 'English (as students will see it)', 'Vietnamese note', 'Why (EN / VI)', 'Facts + evidence', 'Check', 'Review'], cl.map((x) => {
      ids.push(x.id);
      return '<tr><td><code>' + esc(x.id) + '</code><br><small>' + esc(x.kind) + '</small></td><td>' + esc(x.stage) + '</td><td>' + esc(res(x.en, x)) + '</td><td>' + esc(res(x.vi, x)) + '</td><td>' + (x.why ? esc(res(x.why.en, x)) + '<br><small>' + esc(res(x.why.vi, x)) + '</small>' : '—') + (x.kf ? '<br><small>key features: ' + esc(x.kf.join(', ')) + '</small>' : '') + '</td><td>' + factsCell(x) + '</td><td>' + errsFor(x.id) + '</td><td>' + st(x) + '</td></tr>';
    }));
    const co = (U2.controlled || []).filter((x) => x.chart === k);
    if (co.length) h += '<h3>Controlled practice</h3>' + table(['Id', 'Statement', 'Expected answer', 'Why (EN)', 'Why (VI)', 'Facts + evidence', 'Check', 'Review'], co.map((x) => {
      ids.push(x.id);
      const g = x.type === 'ovd' ? null : LMX.lmClassify(x, r.ctx, U2);
      return '<tr><td><code>' + esc(x.id) + '</code></td><td>' + esc(res(x.statement.en, x)) + '</td><td><b>' + esc(x.type === 'ovd' ? x.answer : x.label) + '</b>' +
        (g ? '<br><small>chart gives: ' + esc(g.label) + ' (' + esc(g.why) + ')</small>' : '<br><small>teacher answer key</small>') + '</td><td>' + esc(res(x.why.en, x)) + '</td><td>' + esc(res(x.why.vi, x)) + '</td><td>' + factsCell(x) + '</td><td>' + errsFor(x.id) + '</td><td>' + st(x) + '</td></tr>';
    }));
    const qs = (U2.questions || []).filter((x) => x.chart === k);
    if (qs.length) h += '<h3>Multiple-choice questions</h3>' + table(['Id', 'Stage', 'Question (EN / VI)', 'Options (right one in bold)', 'How the answer is checked', 'Why (EN / VI)', 'Check', 'Review'], qs.map((x) => {
      ids.push(x.id); const kk = x.key || {};
      return '<tr><td><code>' + esc(x.id) + '</code></td><td>' + esc(x.stage) + '</td><td>' + esc(res(x.q.en, x)) + '<br><small>' + esc(res(x.q.vi, x)) + '</small></td><td>' +
        x.opts.map((o) => (o.v === x.answer ? '<b>✓ ' + esc(res(o.en, x)) + '</b>' : esc(res(o.en, x)))).join('<br>') + '</td><td>' +
        (kk.reviewed ? '<span class="pend">teacher answer key (salience)</span>' : kk.src ? 'from the chart JSON: <code>' + esc(kk.src) + '</code>' : 'verified fact <code>' + esc(kk.fact) + '.' + esc(kk.field) + '</code>') + factsCell(x) + '</td><td>' +
        esc(res(x.why.en, x)) + '<br><small>' + esc(res(x.why.vi, x)) + '</small></td><td>' + errsFor(x.id) + '</td><td>' + st(x) + '</td></tr>';
    }));
    const kf = (U2.keyFeatures || []).filter((x) => x.chart === k);
    if (kf.length) h += '<h3>Key features</h3>' + table(['Id', 'Importance / lens', 'Reason (EN)', 'Reason (VI)', 'Fact + evidence', 'Check', 'Review'], kf.map((x) => {
      ids.push(x.id);
      return '<tr><td><code>' + esc(x.id) + '</code></td><td>' + esc(x.importance) + (x.lens ? '<br><small>' + esc(x.lens) + '</small>' : '') + '</td><td>' + esc(x.reason.en) + '</td><td>' + esc(x.reason.vi) + '</td><td>' + factsCell(x) + '</td><td>' + errsFor(x.id) + '</td><td>' + st(x) + '</td></tr>';
    }));
  });
  h += '<h2>General teaching copy</h2>' + table(['Id', 'Stage', 'English', 'Vietnamese', 'Check', 'Review'], (U2.copy || []).map((x) => {
    ids.push(x.id);
    return '<tr><td><code>' + esc(x.id) + '</code></td><td>' + esc(x.stage) + '</td><td>' + esc(x.en) + '</td><td>' + esc(x.vi) + '</td><td>' + errsFor(x.id) + '</td><td>' + st(x) + '</td></tr>';
  }));
  h += '<h2>Approval list</h2><p>Copy the ids you approve (or remove the ones you do not) and send them back:</p><pre>' + esc(ids.join('\n')) + '</pre></body></html>';
  return h;
}
