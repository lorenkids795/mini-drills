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
   (11/2026, assignment-scoped) Each assignment occurrence has its own window [send date, deadline + late pass]:
     - an attempt made from an assignment carries asg = that assignment's id: it counts for THAT assignment only;
     - its time = sts (server time written by Firestore, rules: sts == request.time) when present, else ts (older attempts);
     - complete by the deadline = 'done'; complete after the deadline but inside the late-pass extension = 'late';
     - after the window: never credited (rules refuse new linked attempts; an older unlinked one is flagged 'unverified');
     - an attempt without asg (older, or free practice) counts only inside the window, and only when no other assignment
       of the same class with the same exercise (o.sib) was open at that time; otherwise it is flagged, never guessed.
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
  // a time in ms: number, Firestore Timestamp (toMillis / seconds), or an ISO string (REST timestampValue)
  function ms(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v === 'object' && v.seconds != null) return num(v.seconds) * 1000 + Math.floor(num(v.nanoseconds) / 1e6);
    var t = Date.parse(String(v)); return isFinite(t) ? t : num(v);
  }
  function tOf(a) { var s = ms(a && a.sts); return s > 0 ? s : num(a && a.ts); }
  function byTs(x, y) { return tOf(x) - tOf(y); }
  function dueOf(a, pass) { var k = pass && (pass.kind || pass); return num(a.due) + (PASS_DAYS[k] ? PASS_DAYS[k] * 864e5 : 0); }

  // does attempt x belong to this assignment occurrence? 'credit' | 'flag' (shown as unverified, never counted) | 'skip'
  // w = {id, start, base (deadline), due (deadline + pass), sib: other assignments [{id, start, due, ex[]}] of the same class}
  function linkOf(x, id, w) {
    var t = tOf(x), asg = x.asg == null ? '' : String(x.asg);
    if (x.ex !== id || t < w.start) return 'skip';
    if (asg) return asg !== String(w.id == null ? '' : w.id) ? 'skip' : (t <= w.due ? 'credit' : 'flag');
    var other = (w.sib || []).some(function (s) { return s && String(s.id) !== String(w.id == null ? '' : w.id) && (s.ex || []).indexOf(id) >= 0 && t >= num(s.start) && t <= num(s.due); });
    if (t <= w.due) return other ? 'flag' : 'credit';
    return other || ms(x.sts) > 0 ? 'skip' : 'flag'; // after the window: another assignment's work, new free practice, or an older late attempt (flagged)
  }
  // one Library exercise: attempts = this student's attempts (any exercise). w as in linkOf; numbers = an old caller (start, due)
  function exPart(id, attempts, w, due) {
    if (typeof w !== 'object' || !w) w = { id: '', start: num(w), base: num(due), due: num(due), sib: [] };
    var base = w.base == null ? w.due : w.base, C = [], F = [], i, s;
    (attempts || []).forEach(function (a) { if (!a) return; var k = linkOf(a, id, w); if (k === 'credit') C.push(a); else if (k === 'flag') F.push(a); });
    C.sort(byTs); F.sort(byTs);
    if (!C.length && !F.length) return { kind: 'ex', id: id, st: 'none' };
    for (i = 0; i < C.length; i++) if (attState(C[i]) === 'complete') return { kind: 'ex', id: id, st: tOf(C[i]) <= base ? 'done' : 'late', at: tOf(C[i]) };
    var best = null;
    for (i = 0; i < C.length; i++) { s = attState(C[i]); if (s === 'incomplete' && (!best || num(C[i].answered) >= num(best.answered))) best = C[i]; }
    if (best) return { kind: 'ex', id: id, st: 'incomplete', at: tOf(best), answered: num(best.answered), required: num(best.required) };
    var L = C.concat(F).sort(byTs);
    return { kind: 'ex', id: id, st: 'unverified', at: tOf(L[L.length - 1]), why: C.length ? 'legacy' : 'outside' };
  }
  // screenshots of one hwdone record by task id (old records: "shot" = task x1)
  function shots(hw) {
    var o = {}, ok = function (x) { return !!(x && (x.url || num(x.ts))); };
    if (hw && ok(hw.shot)) o.x1 = hw.shot;
    if (hw && hw.shots && typeof hw.shots === 'object') Object.keys(hw.shots).forEach(function (k) { if (ok(hw.shots[k])) o[k] = hw.shots[k]; });
    return o;
  }
  // base = the deadline, due = deadline + late pass. A screenshot after the window (older data) is flagged, never counted.
  function extPart(x, sh, due, base) {
    var s = sh[x.id] || null, t = s ? ms(s.ts) : 0;
    if (base == null) base = due;
    if (!s) return { kind: 'ext', id: x.id, st: 'none' };
    var r = { kind: 'ext', id: x.id, st: !t || t <= base ? 'done' : t <= due ? 'late' : 'unverified', at: t, shot: s };
    if (t > due) r.why = 'outside';
    return r;
  }
  function ok(p) { return p.st === 'done' || p.st === 'late'; }

  // one student, one assignment. o = {attempts, hw (hwdone record), pass (record or kind), now, ex (exercise ids to count)}
  // st: 'upcoming' (not sent yet) · 'none' (nothing to do) · 'done' · 'late' (all parts in, at least one late) ·
  //     'unverified' (all parts in, some only legacy-unverified) · 'incomplete' (every part has work, some not complete) ·
  //     'pending' (before the deadline) · 'missing' (after the deadline)
  function asgEval(a, o) {
    o = o || {};
    var now = o.now || Date.now(), start = num(a.start), due = dueOf(a, o.pass), base = num(a.due), ids = o.ex || a.ex || [], X = a.ext || [], sh = shots(o.hw);
    var w = { id: a.id == null ? '' : a.id, start: start, base: base, due: due, sib: o.sib || [] };
    var P = ids.map(function (id) { return exPart(id, o.attempts, w); }).concat(X.map(function (x) { return extPart(x, sh, due, base); }));
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

  // the window of each assignment for one student, to pass as o.sib: list = assignments of the student's class, passOf(id) = pass
  function sibOf(list, passOf) { return (list || []).map(function (a) { return { id: a.id, start: num(a.start), due: dueOf(a, passOf ? passOf(a.id) : null), ex: a.ex || [] }; }); }
  var H = { BUILTIN: BUILTIN, liveEx: liveEx, PASS_DAYS: PASS_DAYS, attState: attState, exPart: exPart, extPart: extPart, shots: shots, asgEval: asgEval, dueOf: dueOf, nEm: nEm, ms: ms, tOf: tOf, linkOf: linkOf, sibOf: sibOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = H;
  else root.MDHW = H;
})(typeof self !== 'undefined' ? self : this);
