// Chart facts (md-chart.js) + content engine (lm-engine.js) + real Unit 2 content (lm-unit2.js).
// Run: node tests/chart-facts.test.js   (Node built-ins only)
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const CH = require(path.join(ROOT, 'md-chart.js')), LMX = require(path.join(ROOT, 'lm-engine.js')), U2 = require(path.join(ROOT, 'lm-unit2.js'));
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + e.message); } }
const S = (id, ys, xs) => ({ id, label: id.toUpperCase(), points: (xs || ys.map((_, i) => i + 1)).map((x, i) => ({ x, y: ys[i] })) });
const C = (series, hasTime) => ({ type: 'line', hasTime: hasTime !== false, unit: 'u', series });
const FX = (series, id) => ({ id: id || 'tc', version: 1, chart: C(series) });
const facts = (fx) => CH.chGetVerifiedFacts(fx);
const fact = (r, type, ser, x) => r.facts.find((f) => f.type === type && f.series.join('+') === ser && (x == null ? f.x == null : f.x === x));
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---- invalid data ----
t('invalid chart: no facts at all', () => { const r = facts(FX([S('a', ['5', 6])])); assert.strictEqual(r.ok, false); assert.strictEqual(r.facts.length, 0); });
t('missing id/version: no facts', () => { const r = CH.chGetVerifiedFacts({ chart: C([S('a', [1, 2])]) }); assert.strictEqual(r.ok, false); });
t('duplicate series id rejected', () => assert.strictEqual(facts(FX([S('a', [1, 2]), S('a', [3, 4])])).ok, false));
t('duplicate x rejected', () => assert.strictEqual(facts(FX([S('a', [1, 2], [2000, 2000])])).ok, false));
t('x out of time order rejected', () => assert.strictEqual(facts(FX([S('a', [1, 2], [2010, 2000])])).ok, false));
// ---- endpoint / shape ----
t('endpoint increase / decrease / no_change', () => {
  assert.strictEqual(CH.chEndpoint(S('a', [1, 5])).result, 'increase');
  assert.strictEqual(CH.chEndpoint(S('a', [5, 1])).result, 'decrease');
  assert.strictEqual(CH.chEndpoint(S('a', [3, 9, 3])).result, 'no_change');
});
t('endpoint: one point = insufficient (not flat)', () => assert.strictEqual(CH.chEndpoint(S('a', [4])).result, 'insufficient'));
t('endpoint uses first/last VALID points (null skipped, not zero)', () => { const e = CH.chEndpoint(S('a', [null, 4, 6, null])); assert.deepStrictEqual([e.result, e.x0, e.y0, e.x1, e.y1], ['increase', 2, 4, 3, 6]); });
t('shape: monotonic / flat / fluctuating', () => {
  assert.strictEqual(CH.chShape(S('a', [1, 2, 2, 3])).result, 'monotonic_increase');
  assert.strictEqual(CH.chShape(S('a', [3, 2, 1])).result, 'monotonic_decrease');
  assert.strictEqual(CH.chShape(S('a', [2, 2])).result, 'flat');
  assert.strictEqual(CH.chShape(S('a', [1, 3, 2, 4])).result, 'fluctuating');
});
t('shape with a gap = insufficient (never "steady")', () => assert.strictEqual(CH.chShape(S('a', [1, null, 3])).result, 'insufficient'));
t('overall rise with a dip is fluctuating, not monotonic', () => { const r = facts(FX([S('a', [1, 3, 2, 4])])); assert.strictEqual(fact(r, 'endpoint', 'a').result, 'increase'); assert.strictEqual(fact(r, 'shape', 'a').result, 'fluctuating'); });
// ---- change: absolute vs percent ----
t('absolute and percent change', () => { const c = CH.chChange(S('a', [20, 30])); assert.strictEqual(c.abs, 10); assert.strictEqual(c.pct, 50); });
t('negative values: percent from |baseline|', () => { const c = CH.chChange(S('a', [-20, -10])); assert.strictEqual(c.abs, 10); assert.strictEqual(c.pct, 50); });
t('zero baseline: no percent', () => { const c = CH.chChange(S('a', [0, 8])); assert.strictEqual(c.abs, 8); assert.strictEqual(c.pct, null); assert.strictEqual(c.pctStatus, 'zero_baseline'); });
t('largest value is not the largest increase', () => { const r = facts(FX([S('a', [90, 92]), S('b', [10, 40])])); assert.strictEqual(fact(r, 'max', 'a').result, 92); assert.ok(fact(r, 'change', 'b').result > fact(r, 'change', 'a').result); });
// ---- leaders, ties ----
t('unique leader at every observed point', () => assert.strictEqual(fact(facts(FX([S('a', [9, 9, 9]), S('b', [1, 2, 3])])), 'highest-throughout', 'a+b').result, 'a'));
t('changing leader -> unsupported', () => { const f = fact(facts(FX([S('a', [9, 1]), S('b', [1, 9])])), 'highest-throughout', 'a+b'); assert.strictEqual(f.status, 'unsupported'); assert.strictEqual(f.reason, 'no_consistent_leader'); });
['start', 'middle', 'end'].forEach((w, i) => t('tie for the top at the ' + w + ' -> no "highest throughout", tie fact at that x', () => {
  const ya = [9, 9, 9], yb = [1, 2, 3]; yb[i] = 9; const r = facts(FX([S('a', ya), S('b', yb)]));
  assert.strictEqual(fact(r, 'highest-throughout', 'a+b').status, 'unsupported'); assert.ok(fact(r, 'tie', 'a+b', i + 1));
}));
t('null at one point: no "highest throughout" claim', () => assert.strictEqual(fact(facts(FX([S('a', [9, null, 9]), S('b', [1, 2, 3])])), 'highest-throughout', 'a+b').reason, 'insufficient_data'));
t('null is never 0 in ranking (no rank fact at that x)', () => { const r = facts(FX([S('a', [9, null, 9]), S('b', [1, 2, 3])])); assert.ok(!fact(r, 'rank', 'a+b', 2)); assert.ok(fact(r, 'rank', 'a+b', 1)); });
t('lowest throughout', () => assert.strictEqual(fact(facts(FX([S('a', [9, 9]), S('b', [1, 2])])), 'lowest-throughout', 'a+b').result, 'b'));
t('mismatched x sets: no cross-series facts', () => {
  const r = facts(FX([S('a', [1, 2], [1, 2]), S('b', [1, 2], [1, 3])]));
  assert.strictEqual(fact(r, 'highest-throughout', 'a+b').reason, 'mismatched_x_sets'); assert.strictEqual(fact(r, 'comparison', 'a+b').reason, 'mismatched_x_sets');
  assert.ok(!r.facts.some((f) => f.type === 'rank' || f.type === 'rank-change'));
});
t('fewer than 2 comparable points: rank change unsupported', () => assert.strictEqual(fact(facts(FX([S('a', [9, null]), S('b', [1, 2])])), 'rank-change', 'a+b').status, 'unsupported'));
t('endpoint rank change detected / not detected', () => {
  assert.strictEqual(fact(facts(FX([S('a', [9, 1]), S('b', [1, 9])])), 'rank-change', 'a+b').result, 'detected');
  assert.strictEqual(fact(facts(FX([S('a', [9, 8]), S('b', [1, 2])])), 'rank-change', 'a+b').result, 'not_detected');
});
t('no crossing fact type is ever emitted, and no crossing year', () => {
  const r = facts(FX([S('a', [9, 5, 1]), S('b', [1, 5, 9])]));
  assert.ok(!r.facts.some((f) => /cross/i.test(f.type)));
  assert.ok(!r.facts.some((f) => f.type === 'rank-change' && ('x' in f || 'at' in (f.evidence || {}))));
});
t('fact ids are stable and scoped to chart id + version', () => { const r = facts(FX([S('a', [1, 2])], 'chart-q')); assert.strictEqual(fact(r, 'endpoint', 'a').id, 'chart-q@1:endpoint:a'); });

// ---- the real Unit 2 content ----
const base = LMX.lmCheck(U2);
t('real Unit 2 content: no problems', () => assert.deepStrictEqual(base.errors, []));
t('Chart A: unique leader at every observed point (owner rule)', () => assert.strictEqual(base.ctx.byId['lm-u2-a@1:highest-throughout:museum-a+museum-b+museum-c'].result, 'museum-a'));
t('Chart B: leader changes and a tie (owner rule)', () => {
  assert.strictEqual(base.ctx.byId['lm-u2-b@1:highest-throughout:app-x+app-y+app-z'].status, 'unsupported');
  assert.strictEqual(base.ctx.byId['lm-u2-b@1:rank-change:app-x+app-y'].result, 'detected');
  assert.ok(base.ctx.byId['lm-u2-b@1:tie:app-x+app-z@2024']);
});
t('both charts are marked synthetic and use made-up labels', () => Object.values(U2.charts).forEach((c) => { assert.strictEqual(c.synthetic, true); c.chart.series.forEach((s) => assert.ok(!/france|spain|italy/i.test(s.label))); }));
t('all three Controlled labels are used', () => ['supported', 'contradicted', 'not_determinable'].forEach((l) => assert.ok(U2.controlled.some((x) => x.label === l), l)));
t('placeholders resolve to the chart numbers', () => { const x = U2.claims.find((c) => c.id === 'a.detail.example'); assert.strictEqual(LMX.lmResolve(x.en, x, base.ctx).text, 'Visitors to Museum A rose from 60 thousand in 2000 to 90 thousand in 2020.'); });
t('pending items are counted; release gate fails while any is pending', () => { assert.ok(base.pending > 0); const r = LMX.lmCheck(U2, true); assert.ok(r.errors.some((e) => /pending/.test(e))); });
t('release gate passes when every item is approved', () => {
  const u = clone(U2); ['copy', 'claims', 'controlled', 'keyFeatures'].forEach((k) => u[k].forEach((x) => { x.review = 'approved'; }));
  assert.deepStrictEqual(LMX.lmCheck(u, true).errors, []);
});
// mutations: each must be caught
const bad = (mut, re) => { const u = clone(U2); mut(u); const e = LMX.lmCheck(u).errors; assert.ok(e.some((m) => re.test(m)), 'not caught: ' + JSON.stringify(e)); };
t('stale fact id is caught', () => bad((u) => { u.claims[0].binds.a = 'lm-u2-a@0:endpoint:museum-a'; }, /does not exist/));
t('changed chart data is caught (expected result no longer true)', () => bad((u) => { u.charts.A.chart.series[1].points[4].y = 70; }, /expected/));
t('chart version bump makes old ids stale', () => bad((u) => { u.charts.A.version = 2; }, /does not exist/));
t('wrong stored Controlled answer is caught', () => bad((u) => { u.controlled[0].label = 'contradicted'; }, /stored answer/));
t('"not determinable" on an observed year is caught', () => bad((u) => { u.controlled.find((x) => x.label === 'not_determinable').claim.x = 2005; }, /stored answer/));
t('EN/VI with different placeholders is caught', () => bad((u) => { u.controlled[0].why.vi = 'Giá trị đầu cao hơn giá trị cuối.'; }, /different placeholders/));
t('missing Vietnamese is caught', () => bad((u) => { u.copy[0].vi = ''; }, /English and Vietnamese/));
t('unfillable placeholder is caught', () => bad((u) => { u.claims[0].en += ' {a.nothing}'; u.claims[0].vi += ' {a.nothing}'; }, /cannot fill/));
t('"throughout" without a verified throughout fact is caught', () => bad((u) => { u.claims[0].en = 'Overall, {a.label} rose throughout, {c.label} too, {b.label} fell ({a.x0}–{a.x1}).'; }, /throughout/));
t('model sentence on an unsupported fact is caught', () => bad((u) => { u.claims.push({ id: 'b.x', chart: 'B', stage: 'review', kind: 'model', review: 'pending', binds: { h: 'lm-u2-b@1:highest-throughout:app-x+app-y+app-z' }, expect: { h: { status: 'unsupported' } }, en: 'x', vi: 'x' }); }, /only use supported facts/));
t('answer leak: Chart B fact before Independent is caught', () => bad((u) => { u.controlled[0].binds.m = 'lm-u2-b@1:endpoint:app-x'; }, /later chart|belongs to chart/));
t('answer leak: Chart B label in pre-Independent text is caught', () => bad((u) => { u.copy[0].en = 'Look at App Y.'; }, /mentions "App Y"/));
t('answer leak: Chart B item placed in Guided is caught', () => bad((u) => { u.claims.find((c) => c.chart === 'B').stage = 'guided'; }, /hidden until Independent|not used in stage/));
t('duplicate content id is caught', () => bad((u) => { u.copy[1].id = u.copy[0].id; }, /Duplicate/));
t('general copy with a chart placeholder is caught', () => bad((u) => { u.copy[0].en = '{a.label}'; u.copy[0].vi = '{a.label}'; }, /general teaching copy/));
t('unknown review state is caught', () => bad((u) => { u.copy[0].review = 'ok'; }, /review must be/));
t('English model sentences and statements: no Vietnamese letters', () => {
  const vi = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
  U2.claims.forEach((x) => assert.ok(!vi.test(x.en), x.id)); U2.controlled.forEach((x) => assert.ok(!vi.test(x.statement.en), x.id));
});
// ---- the same files load in a browser (globals, md-chart.js first) ----
t('browser load: md-chart.js, lm-engine.js, lm-unit2.js as plain scripts', () => {
  const win = {}; win.window = win; const ctx = vm.createContext(win);
  ['md-chart.js', 'lm-engine.js', 'lm-unit2.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  assert.strictEqual(typeof win.chGetVerifiedFacts, 'function'); assert.strictEqual(typeof win.chValidate, 'function');
  const be = win.LMX.lmCheck(win.MD_LM_U2).errors; assert.strictEqual(be.length, 0, be.join(' | '));
});
t('index.html loads md-chart.js before the app and no longer defines the analysis inline', () => {
  const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(h.indexOf('<script src="md-chart.js"></script>') > 0 && h.indexOf('<script src="md-chart.js"></script>') < h.indexOf('(function(){\n\'use strict\''));
  assert.ok(!/function chValidate\(/.test(h)); assert.ok(/function chLineHTML\(/.test(h));
});
t('old Unit 2 panel in exam Writing is off', () => assert.ok(/var t1On=function\(\)\{return false\}/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'))));

console.log('---- ' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
