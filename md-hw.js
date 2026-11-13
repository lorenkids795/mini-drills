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
  /* ---------- (11/2026, Phase C) Personal Goal: ONE set of rules for the server (authority) and the app (display, demo) ----------
     The goal is the student's own target. It is NEVER a pass mark: PASS stays 70 % everywhere (PASS_PCT in the app).
     Approved by the owner:
       - first choice 70 / 75 / 80 / 85 / 90 / 95 %, the student confirms a self-commitment;
       - no change during the first 30 days after activation (server time, never reset by login / class / device);
       - after day 30: ONE student change in the account's lifetime, at most ±10 points, 5-point steps, 70–95 %;
       - from day 60: automatic review every 30 days, ±5 per review, never outside 70–95 %;
       - raise only on sufficient, reliable evidence above the goal; lower only after TWO consecutive sufficiently sampled
         reviews below the goal; too little evidence = hold, and it never counts as a cycle below the goal.
     PROPOSED (not owner-approved, change here only): MIN_SAMPLES, MIN_ASGS, RAISE_MARGIN, RAISE_SHARE, LOWER_MARGIN.
     Review k (k = 1, 2, …) happens on day 60 + 30·(k−1) and looks only at the 30 days before it (day D−30 … D).
     Trusted evidence (goalSample): Reading / Listening homework attempts (linked to an assignment, server time `sts`,
     every question answered), score consistent with its items; one attempt per assignment + exercise (the FIRST complete
     one, so retries after seeing answers do not count). Writing / Speaking, free practice, legacy, incomplete, seeded /
     QA probes and attempts whose numbers do not add up are left out, with the reason counted. */
  var DAY = 86400000;
  var GOAL = { CHOICES: [70, 75, 80, 85, 90, 95], MIN: 70, MAX: 95, STEP: 5, LOCK_DAYS: 30, MANUAL_MAX: 10,
    FIRST_REVIEW: 60, CYCLE: 30, AUTO_STEP: 5, MAX_CATCHUP: 24,
    MIN_SAMPLES: 4, MIN_ASGS: 2, RAISE_MARGIN: 5, RAISE_SHARE: 0.75, LOWER_MARGIN: 5, LOWER_CYCLES: 2 };
  function goalValid(v) { return typeof v === 'number' && GOAL.CHOICES.indexOf(v) >= 0; }
  function clampGoal(v) { return Math.max(GOAL.MIN, Math.min(GOAL.MAX, v)); }
  // whole days since activation (server clock)
  function goalDays(g, now) { return g && g.at ? Math.floor((now - num(g.at)) / DAY) : 0; }
  // the day of review k (1-based) and the time it becomes due
  function goalReviewDay(k) { return GOAL.FIRST_REVIEW + GOAL.CYCLE * (k - 1); }
  function goalNextReview(g) { var k = (num(g && g.rk) || 0) + 1; return { k: k, day: goalReviewDay(k), at: num(g.at) + goalReviewDay(k) * DAY }; }
  // can the student make the one manual change now to value v? -> {ok, code}
  function goalManual(g, v, now) {
    if (!g || !goalValid(num(g.goal))) return { ok: false, code: 'nogoal' };
    if (g.manualUsed) return { ok: false, code: 'used' };
    if (now < num(g.at) + GOAL.LOCK_DAYS * DAY) return { ok: false, code: 'early', from: num(g.at) + GOAL.LOCK_DAYS * DAY };
    if (!goalValid(v)) return { ok: false, code: 'invalid' };
    if (v === num(g.goal)) return { ok: false, code: 'same' };
    if (Math.abs(v - num(g.goal)) > GOAL.MANUAL_MAX) return { ok: false, code: 'range' };
    return { ok: true };
  }
  // the goals the student may switch to now (empty when not allowed)
  function goalOptions(g, now) { return GOAL.CHOICES.filter(function (v) { return goalManual(g, v, now).ok; }); }
  /* trusted samples in [from, to). exInfo(exId) -> {skill, n?} or null (unknown / not checkable exercise). */
  function goalSample(atts, from, to, exInfo) {
    var ex = {}, first = {}, out = [];
    function no(r) { ex[r] = (ex[r] || 0) + 1; }
    (atts || []).slice().sort(function (a, b) { return ms(a.sts) - ms(b.sts); }).forEach(function (a) {
      if (!a) return;
      if (a.kind === 'submission') return no('writing / speaking');
      if (a.seeded || a.qaProbe) return no('test data');
      if (!a.asg || typeof a.asg !== 'string') return no('not homework');
      var t = ms(a.sts);
      if (!t) return no('no server time');
      if (t < from || t >= to) return;
      var info = exInfo ? exInfo(a.ex) : null;
      if (!info || (info.skill !== 'reading' && info.skill !== 'listening')) return no('not a checked Reading / Listening exercise');
      var total = num(a.total), score = num(a.score), items = Array.isArray(a.items) ? a.items : null;
      if (!(total > 0) || !(num(a.required) > 0) || num(a.answered) < num(a.required)) return no('incomplete');
      if (!items || items.length !== total) return no('numbers do not add up');
      var ids = {}, ok = 0, dup = false;
      items.forEach(function (it) { var k = String(it && it.i); if (ids[k]) dup = true; ids[k] = 1; if (it && it.ok) ok++; });
      if (dup || ok !== score || score > total || (info.n && info.n !== total)) return no('numbers do not add up');
      var key = a.asg + '|' + a.ex;
      if (first[key]) return no('retry of the same homework');
      first[key] = 1;
      out.push({ asg: a.asg, ex: a.ex, score: score, total: total, pct: Math.round(score / total * 1000) / 10, t: t });
    });
    var sc = 0, tt = 0, asgs = {};
    out.forEach(function (s) { sc += s.score; tt += s.total; asgs[s.asg] = 1; });
    return { samples: out, n: out.length, asgs: Object.keys(asgs).length, pooled: tt ? Math.round(sc / tt * 1000) / 10 : null, excluded: ex };
  }
  // 'insufficient' | 'above' | 'below' | 'within'
  function goalJudge(s, goal) {
    if (s.n < GOAL.MIN_SAMPLES || s.asgs < GOAL.MIN_ASGS) return 'insufficient';
    var hi = s.samples.filter(function (x) { return x.pct >= goal; }).length;
    if (s.pooled >= goal + GOAL.RAISE_MARGIN && hi / s.n >= GOAL.RAISE_SHARE) return 'above';
    if (s.pooled < goal - GOAL.LOWER_MARGIN) return 'below';
    return 'within';
  }
  /* run every review that is due by `now` and not run yet (catch-up, in order, idempotent: the review number k is stored).
     Returns {g (new copy), done: [reviews]}. Never touches anything when nothing is due. */
  function goalReview(g0, atts, exInfo, now) {
    var g = JSON.parse(JSON.stringify(g0 || {})), done = [];
    if (!goalValid(num(g.goal)) || !num(g.at)) return { g: g, done: done };
    g.rv = Array.isArray(g.rv) ? g.rv : []; g.hist = Array.isArray(g.hist) ? g.hist : [];
    for (var i = 0; i < GOAL.MAX_CATCHUP; i++) {
      var nx = goalNextReview(g);
      if (nx.at > now) break;
      var from = num(g.at) + (nx.day - GOAL.CYCLE) * DAY, to = nx.at, prev = num(g.goal);
      var s = goalSample(atts, from, to, exInfo), v = goalJudge(s, prev), act = 'hold', next = prev, bs = num(g.bs) || 0;
      if (v === 'above') { next = clampGoal(prev + GOAL.AUTO_STEP); act = next > prev ? 'raise' : 'hold'; bs = 0; }
      else if (v === 'below') { bs++; if (bs >= GOAL.LOWER_CYCLES) { next = clampGoal(prev - GOAL.AUTO_STEP); act = next < prev ? 'lower' : 'hold'; bs = 0; } }
      else bs = 0; // 'within' and 'insufficient' break a run of cycles below the goal
      var r = { k: nx.k, day: nx.day, from: from, to: to, n: s.n, asgs: s.asgs, pooled: s.pooled, verdict: v, act: act, prev: prev, next: next, bs: bs, excl: s.excluded, ts: to };
      g.goal = next; g.bs = bs; g.rk = nx.k;
      g.rv.push(r); if (g.rv.length > 24) g.rv = g.rv.slice(-24);
      if (act !== 'hold') { g.hist.push({ t: to, from: prev, to: next, by: 'review', type: act, k: nx.k }); if (g.hist.length > 50) g.hist = g.hist.slice(-50); }
      done.push(r);
    }
    return { g: g, done: done };
  }

  var H = { BUILTIN: BUILTIN, liveEx: liveEx, PASS_DAYS: PASS_DAYS, attState: attState, exPart: exPart, extPart: extPart, shots: shots, asgEval: asgEval, dueOf: dueOf, nEm: nEm, ms: ms, tOf: tOf, linkOf: linkOf, sibOf: sibOf,
    GOAL: GOAL, goalValid: goalValid, goalDays: goalDays, goalNextReview: goalNextReview, goalManual: goalManual, goalOptions: goalOptions, goalSample: goalSample, goalJudge: goalJudge, goalReview: goalReview };
  if (typeof module !== 'undefined' && module.exports) module.exports = H;
  else root.MDHW = H;
})(typeof self !== 'undefined' ? self : this);
