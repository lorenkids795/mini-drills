/* md-hw.js — ONE set of homework rules (11/2026, D3 + D4), used by the app (teacher, admin, student) and by the server
   (Homework Assistant, functions/api/[[path]].js imports this file). ES5, no DOM. Change a rule here and both sides change.

   One attempt (attState):
     'complete'   = every required question answered and submitted (new attempts record answered / required),
                    or a Writing / Speaking submission (handed in; marking is a separate thing),
                    or an older attempt that proves it: full score (every answer right), or a multi-stage Reading lesson
                    (the app made the student answer every item before moving on);
     'incomplete' = submitted with blank required questions ("Submitted · Incomplete (3/5 answered)");
     'unverified' = an older attempt (before answered / required were saved) that cannot prove every question was answered
                    ("Legacy · Unverified"). Never counted as complete; nothing old is rewritten.
   One part of an assignment (a Library exercise, or an external task with its screenshot):
     'done' (complete on time) · 'late' (complete after the deadline, still counted, shown apart) · 'incomplete' ·
     'unverified' · 'none' (nothing yet). Only attempts made on or after the send date count, so an older attempt of the
     same exercise never counts for a newer assignment. The deadline includes a late pass (day / week).
   Separate from all this: Passed (score >= 70%, PASS_PCT in index.html) and the personal goal. Completed ≠ Passed. */
(function (root) {
  'use strict';
  var PASS_DAYS = { day: 1, week: 7 };
  function num(x) { x = Number(x); return isFinite(x) ? x : 0; }
  function nEm(e) { return String(e || '').trim().toLowerCase(); }

  function attState(a) {
    if (!a) return 'none';
    if (a.kind === 'submission') return 'complete';
    if (a.required != null && num(a.required) > 0) return num(a.answered) >= num(a.required) ? 'complete' : 'incomplete';
    var t = num(a.total);
    if (t > 0 && num(a.score) >= t) return 'complete';
    if (a.stages && a.stages.length) return 'complete';
    return 'unverified';
  }
  function byTs(x, y) { return num(x.ts) - num(y.ts); }
  function dueOf(a, pass) { var k = pass && (pass.kind || pass); return num(a.due) + (PASS_DAYS[k] ? PASS_DAYS[k] * 864e5 : 0); }

  // one Library exercise: attempts = this student's attempts (any exercise)
  function exPart(id, attempts, start, due) {
    var L = (attempts || []).filter(function (a) { return a && a.ex === id && num(a.ts) >= start; }).sort(byTs), i, s;
    if (!L.length) return { kind: 'ex', id: id, st: 'none' };
    for (i = 0; i < L.length; i++) if (attState(L[i]) === 'complete') return { kind: 'ex', id: id, st: num(L[i].ts) <= due ? 'done' : 'late', at: num(L[i].ts) };
    var best = null;
    for (i = 0; i < L.length; i++) { s = attState(L[i]); if (s === 'incomplete' && (!best || num(L[i].answered) >= num(best.answered))) best = L[i]; }
    if (best) return { kind: 'ex', id: id, st: 'incomplete', at: num(best.ts), answered: num(best.answered), required: num(best.required) };
    return { kind: 'ex', id: id, st: 'unverified', at: num(L[L.length - 1].ts) };
  }
  // screenshots of one hwdone record by task id (old records: "shot" = task x1)
  function shots(hw) {
    var o = {}, ok = function (x) { return !!(x && (x.url || num(x.ts))); };
    if (hw && ok(hw.shot)) o.x1 = hw.shot;
    if (hw && hw.shots && typeof hw.shots === 'object') Object.keys(hw.shots).forEach(function (k) { if (ok(hw.shots[k])) o[k] = hw.shots[k]; });
    return o;
  }
  function extPart(x, sh, due) {
    var s = sh[x.id] || null, t = s ? num(s.ts) : 0;
    if (!s) return { kind: 'ext', id: x.id, st: 'none' };
    return { kind: 'ext', id: x.id, st: !t || t <= due ? 'done' : 'late', at: t, shot: s };
  }
  function ok(p) { return p.st === 'done' || p.st === 'late'; }

  // one student, one assignment. o = {attempts, hw (hwdone record), pass (record or kind), now, ex (exercise ids to count)}
  // st: 'upcoming' (not sent yet) · 'none' (nothing to do) · 'done' · 'late' (all parts in, at least one late) ·
  //     'unverified' (all parts in, some only legacy-unverified) · 'incomplete' (every part has work, some not complete) ·
  //     'pending' (before the deadline) · 'missing' (after the deadline)
  function asgEval(a, o) {
    o = o || {};
    var now = o.now || Date.now(), start = num(a.start), due = dueOf(a, o.pass), ids = o.ex || a.ex || [], X = a.ext || [], sh = shots(o.hw);
    var P = ids.map(function (id) { return exPart(id, o.attempts, start, due); }).concat(X.map(function (x) { return extPart(x, sh, due); }));
    var n = P.length, done = P.filter(ok).length, late = P.some(function (p) { return p.st === 'late'; });
    var unv = P.filter(function (p) { return p.st === 'unverified'; }).length, inc = P.filter(function (p) { return p.st === 'incomplete'; }).length;
    var none = P.filter(function (p) { return p.st === 'none'; }).length, at = 0;
    P.forEach(function (p) { if (ok(p)) at = Math.max(at, p.at || 0); });
    var st;
    if (start > now) st = 'upcoming';
    else if (!n) st = 'none';
    else if (done === n) st = late ? 'late' : 'done';
    else if (!none && !inc) st = 'unverified';
    else if (!none) st = 'incomplete';
    else st = now > due ? 'missing' : 'pending';
    return { st: st, due: due, over: now > due, parts: P, n: n, done: done, late: late, unverified: unv, incomplete: inc, fin: n > 0 && done === n, at: done === n ? at : 0 };
  }

  // exercises written in index.html (EXS) that a real assignment can use; custom exercises are 'c_' + their id
  var BUILTIN = ['l1', 'l2', 'l3', 'r1', 'r2', 'r3', 'w1', 's1', 'ra1'];
  // the exercise ids of an assignment that still exist (a deleted exercise is not a part anyone can do)
  function liveEx(ids, has) { return (ids || []).filter(function (id) { return has(id); }); }

  var H = { BUILTIN: BUILTIN, liveEx: liveEx, PASS_DAYS: PASS_DAYS, attState: attState, exPart: exPart, extPart: extPart, shots: shots, asgEval: asgEval, dueOf: dueOf, nEm: nEm };
  if (typeof module !== 'undefined' && module.exports) module.exports = H;
  else root.MDHW = H;
})(typeof self !== 'undefined' ? self : this);
