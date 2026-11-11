// Real-browser QA of the STAGING Preview (Playwright, headless Chrome). NOT part of the *.test.js suite.
// Needs playwright-core installed OUTSIDE the repo (NODE_PATH) and a local, git-ignored file .qa.env in the repo root:
//   STG_ADMIN_EMAIL=...        (the Preview ADMIN_EMAIL)
//   STG_ADMIN_PASSWORD=...     (the Preview ADMIN_PASSWORD)
// Values are never printed, logged or put in screenshots. The script refuses to run unless GET /api/env says: staging, ok,
// project mini-drills-staging (checked again before every group of writes). It rotates the passwords of the made-up
// @example.test accounts to new random values kept only in memory (so old ones seen in screenshots stop working).
// Run: NODE_PATH=<dir with playwright-core>/node_modules node tests/browser-qa.js [outDir]
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright-core');
const BASE = process.env.QA_BASE || 'https://phase-b.myhomeworkmyfuture.pages.dev', PROJECT = 'mini-drills-staging';
const OUT = process.argv[2] || path.join(__dirname, '..', 'qa-artifacts'); fs.mkdirSync(OUT, { recursive: true });
const ENVF = path.join(__dirname, '..', '.qa.env');
const R = []; // results: {id, role, test, expected, observed, result, evidence}
const rec = (role, test, expected, observed, ok, evidence) => { R.push({ role, test, expected, observed: String(observed).slice(0, 300), result: ok === null ? 'NOT TESTED' : ok ? 'PASS' : 'FAIL', evidence: evidence || '' }); console.log((ok === null ? 'SKIP' : ok ? 'PASS' : 'FAIL') + ' [' + role + '] ' + test + (ok ? '' : ' -> ' + String(observed).slice(0, 200))); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const secretWords = [];
const clean = (s) => { let t = String(s); secretWords.forEach((w) => { if (w) t = t.split(w).join('***'); }); return t; };

function readEnv() {
  if (!fs.existsSync(ENVF)) return null;
  const o = {}; fs.readFileSync(ENVF, 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, ''); });
  return o.STG_ADMIN_EMAIL && o.STG_ADMIN_PASSWORD ? o : null;
}
async function envGate(page, what) {
  const e = await page.evaluate(async () => (await fetch('/api/env', { cache: 'no-store' })).json());
  const ok = e.env === 'staging' && e.ok === true && e.serverProject === PROJECT && e.frontendProject === PROJECT;
  if (!ok) throw new Error('STOP before ' + what + ': /api/env is not the safe staging (' + JSON.stringify(e) + ')');
  return e;
}
async function newCtx(b, opt) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 860 } }, opt || {}));
  const page = await ctx.newPage(); page.errs = []; page.bad = [];
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push(clean(m.text()).slice(0, 200)); });
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + clean(String(e)).slice(0, 200)));
  page.on('response', (r) => { if (r.status() >= 400 && !/\/api\/(status|names)/.test(r.url())) page.bad.push(r.status() + ' ' + r.url().replace(BASE, '')); });
  return { ctx, page };
}
async function login(page, email, pw) {
  await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'networkidle' });
  await page.fill('#sEmail', email); await page.fill('#sPass', pw);
  await page.click('#mdAuth form button[type=submit], #mdAuth form .lgbtn');
  await page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
}
const shot = async (page, name) => { const f = path.join(OUT, name + '.png'); await page.screenshot({ path: f, fullPage: true }); return path.basename(f); };
const tab = async (page, t) => { await page.click('#tabs [data-act="tab"][data-tab="' + t + '"]'); await page.waitForTimeout(1500); };
async function api(page, p, body, admin) {
  return page.evaluate(async ([p, body, admin]) => {
    const h = { 'Content-Type': 'application/json' };
    if (admin) h['X-Admin-Key'] = sessionStorage.getItem('md-akey') || '';
    else { const u = window.firebase && firebase.auth().currentUser; if (u) h.Authorization = 'Bearer ' + (await u.getIdToken()); }
    const r = await fetch('/api/' + p, { method: 'POST', headers: h, body: JSON.stringify(body || {}) });
    let d = {}; try { d = await r.json(); } catch (e) {}
    return { status: r.status, d };
  }, [p, body, admin]);
}
// answer the open self-marked exercise: n of the questions right, the rest wrong; blanks = question indexes to leave empty
async function answer(page, ex, right, blanks) {
  for (let i = 0; i < ex.qs.length; i++) {
    const q = ex.qs[i]; if ((blanks || []).indexOf(i) >= 0) continue; const good = i < right;
    if (q.type === 'gap') await page.fill('input.gap[data-id="' + q.id + '"]', good ? q.ans[0] : 'zzz');
    else await page.check('input[name="' + q.id + '"][value="' + (good ? q.ans : (q.ans + 1) % q.opts.length) + '"]');
  }
}
// back to Home first (the Library tab button keeps an open exercise open), then open the exercise row of the homework card
async function openEx(page, exId) {
  await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'load' }); await page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 }); await page.waitForTimeout(2500);
  await page.click('[data-act="nav"][data-ex="' + exId + '"] >> nth=0'); await page.waitForTimeout(1500);
}

(async () => {
  const E = readEnv();
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  // ---------- anonymous: environment, banner, layout (no secrets needed)
  for (const [nm, vp, cs] of [['desktop-light', { width: 1280, height: 860 }, 'light'], ['mobile-dark', { width: 390, height: 844 }, 'dark']]) {
    const { ctx, page } = await newCtx(b, { viewport: vp, colorScheme: cs });
    await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    const e = await envGate(page, 'anything');
    const badge = await page.locator('#mdStg').textContent().catch(() => '');
    const hs = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    rec('Anonymous', 'sign-in page ' + nm + ': staging banner, staging project, no console / HTTP errors, no sideways scroll', 'banner, mini-drills-staging, 0 errors, no h-scroll',
      JSON.stringify({ badge, env: e.env, project: e.serverProject, sha: e.sha, errs: page.errs, http: page.bad, hs }), /STAGING · mini-drills-staging/.test(badge) && !page.errs.length && !page.bad.length && !hs, await shot(page, 'anon-' + nm));
    await ctx.close();
  }
  for (const p of ['/CLAUDE.md', '/STAGING.md', '/build-info.js', '/tests/browser-qa.js']) {
    const { ctx, page } = await newCtx(b); const r = await page.goto(BASE + p + '?qa=' + Date.now());
    rec('Anonymous', 'internal file ' + p + ' is not public', '404', r.status(), r.status() === 404); await ctx.close();
  }
  if (!E) {
    rec('Admin', 'signed-in checks', 'run', 'NOT RUN: .qa.env with STG_ADMIN_EMAIL / STG_ADMIN_PASSWORD is missing', null);
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(R, null, 2)); await b.close(); return;
  }
  secretWords.push(E.STG_ADMIN_PASSWORD);
  const PW = {}; const ACC = ['stg.teacher@example.test', 'stg.assistant@example.test', 'stg.student@example.test', 'stg.late@example.test', 'stg.mover@example.test', 'stg.other@example.test', 'stg.tester@example.test'];
  ACC.forEach((a) => { PW[a] = 'Qa-' + crypto.randomBytes(9).toString('base64url'); secretWords.push(PW[a]); });
  let FIX = null;

  // ---------- Admin
  {
    const { ctx, page } = await newCtx(b);
    await login(page, E.STG_ADMIN_EMAIL, E.STG_ADMIN_PASSWORD);
    const me = await page.evaluate(() => window.MD_USER);
    rec('Admin', 'admin signs in on staging', 'role teacher + adm', JSON.stringify({ role: me.role, adm: me.adm }), me.role === 'teacher' && me.adm === true);
    await envGate(page, 'QA fixture');
    const pv = await api(page, 'admin/staging', { op: 'qa-preview' }, true);
    rec('Admin', 'QA fixture dry run writes nothing and lists the plan', '200, dry, 7 records', pv.status + ' ' + JSON.stringify({ dry: pv.d.dry, n: (pv.d.plan || []).length, c: pv.d.created, u: pv.d.updated, s: pv.d.skipped }), pv.status === 200 && pv.d.dry === true && (pv.d.plan || []).length === 7);
    const qa = await api(page, 'admin/staging', { op: 'qa' }, true); FIX = qa.d;
    rec('Admin', 'QA fixture created / updated (idempotent)', '200, 0 skipped', qa.status + ' ' + JSON.stringify({ c: qa.d.created, u: qa.d.updated, s: qa.d.skipped }), qa.status === 200 && qa.d.skipped === 0);
    await envGate(page, 'password rotation');
    let rot = 0; for (const a of ACC) { const r = await api(page, 'admin/password', { email: a, newPassword: PW[a] }, true); if (r.status === 200) rot++; else rec('Admin', 'rotate password ' + a, '200', r.status + ' ' + clean(JSON.stringify(r.d)), false); }
    rec('Admin', 'made-up accounts get new random passwords (old ones seen in screenshots stop working)', '7 of 7', rot + ' of 7', rot === 7);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2500);
    await tab(page, 'admin');
    await page.evaluate(() => { const b = document.querySelector('[data-act="ad-sub"][data-v="me"]'); if (b) b.click(); }); await page.waitForTimeout(1500);
    const diag = await page.locator('#adVer').textContent().catch(() => '');
    const envl = await page.locator('#v-admin').textContent();
    rec('Admin', 'Diagnostics: app + server versions, environment staging, project', 'app 2026-11-11a · server 2026-11-11a · staging · mini-drills-staging', clean(diag) + ' | ' + (/environment staging/.test(envl) ? 'env staging' : 'env ?') + (/mini-drills-staging/.test(envl) ? ' · project ok' : ''), /app 2026-11-11a/.test(diag) && /server 2026-11-11a/.test(diag) && /environment staging/.test(envl) && /mini-drills-staging/.test(envl), await shot(page, 'admin-diagnostics'));
    await tab(page, 'library');
    const cam14 = await page.locator('button.bk[data-v="cam14"]').getAttribute('class').catch(() => '');
    const cam21 = await page.locator('button.bk[data-v="cam21"]').textContent().catch(() => '');
    rec('Admin', 'Cam 14 samples stay hidden (grey Empty), QA exercises in Cam 21', 'cam14 "bk e", cam21 3 exercises', cam14 + ' | ' + cam21, /\be\b/.test(cam14 || '') && /3 exercises/.test(cam21 || ''), await shot(page, 'admin-library'));
    rec('Admin', 'no console errors / failed requests (admin session)', '0', JSON.stringify({ errs: page.errs, http: page.bad }), !page.errs.length && !page.bad.length);
    await ctx.close();
  }
  // exercise definitions as the app sees them (for answering)
  const EX = {}; (function () { const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'api', '[[path]].js'), 'utf8'); const m = src.match(/function qaExercises\(\) \{[\s\S]*?\n\}/); const fn = new Function('QA_TFN', 'QA_PASSAGE', m[0] + '; return qaExercises();'); fn(['True', 'False', 'Not Given'], '').forEach(([id, d]) => { EX[id] = d; }); })();

  // ---------- Tester: real answering, blanks, 60/70/80 %, Writing, external screenshot
  {
    const { ctx, page } = await newCtx(b);
    await login(page, 'stg.tester@example.test', PW['stg.tester@example.test']);
    await envGate(page, 'tester submissions');
    let home = await page.locator('#libBody').textContent();
    rec('Tester', 'Home shows the QA homework of class Test (not STG-A homework)', 'STAGING/QA this week + overdue + mixed', clean(home).slice(0, 200), /STAGING\/QA this week \(tester\)/.test(home) && !/STG old homework/.test(home), await shot(page, 'tester-home'));
    // 3 of 5 answered → warning → submit anyway → Submitted · Incomplete (3/5)
    await openEx(page, 'c_qa_r5'); await answer(page, EX.qa_r5, 3, [3, 4]);
    await page.click('#submit'); await page.waitForTimeout(600);
    const ask = await page.locator('#uiDlg').textContent().catch(() => '');
    rec('Tester', 'blank answers: warning before submit', 'Submit with 2 blank answers? … Submitted · Incomplete', clean(ask).slice(0, 160), /Submit with 2 blank answers/.test(ask) && /Incomplete/.test(ask));
    await page.click('#uiDlg [data-act="ui-ok"]'); await page.waitForTimeout(2500);
    let res = await page.locator('#result').textContent();
    rec('Tester', '3/5 answered → Submitted · Incomplete (3/5), and Passed / Not passed shown apart', 'Submitted · Incomplete (3/5 answered) + Not passed', clean(res).slice(0, 200), /Submitted · Incomplete \(3\/5 answered\)/.test(res) && /Not passed/.test(res), await shot(page, 'tester-r5-incomplete'));
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(3000); await tab(page, 'library'); home = await page.locator('#libBody').textContent();
    rec('Tester', 'after reload: still Incomplete 3/5, not silently complete', 'Incomplete · 3/5 answered', clean(home).match(/Incomplete · \d\/\d answered/) || 'not found', /Incomplete · 3\/5 answered/.test(home), await shot(page, 'tester-home-after-reload'));
    // 10 questions: 7 right = exactly 70 % = Passed + Completed
    await openEx(page, 'c_qa_r10'); await answer(page, EX.qa_r10, 7, []); await page.click('#submit'); await page.waitForTimeout(2500);
    res = await page.locator('#result').textContent();
    rec('Tester', '10/10 answered, 7 right = 70 % → Completed + Passed', 'Completed · Passed · 7/10', clean(res).slice(0, 160), /Completed/.test(res) && /\bPassed\b/.test(res) && !/Not passed/.test(res) && /7\/10/.test(res), await shot(page, 'tester-r10-70'));
    for (const [n, pass] of [[6, false], [8, true]]) {
      await page.click('[data-act="retry"]').catch(() => {}); await page.waitForTimeout(1200); await answer(page, EX.qa_r10, n, []); await page.click('#submit'); await page.waitForTimeout(2500);
      res = await page.locator('#result').textContent();
      rec('Tester', 'retry: ' + n + '/10 = ' + n * 10 + ' % → Completed + ' + (pass ? 'Passed' : 'Not passed'), (pass ? 'Passed' : 'Not passed'), clean(res).slice(0, 160), /Completed/.test(res) && (pass ? /\bPassed\b/.test(res) && !/Not passed/.test(res) : /Not passed/.test(res)));
    }
    rec('Tester', '69 % boundary', 'Not passed', 'NOT TESTED in the browser: a 69 % result needs 100 questions; covered by tests/pass-rule.test.js (69/100 fails, 70/100 passes)', null);
    // finish the 5-question exercise fully → this part becomes complete (and late for the overdue assignment)
    await openEx(page, 'c_qa_r5'); await page.click('[data-act="retry"]').catch(() => {}); await page.waitForTimeout(800); await answer(page, EX.qa_r5, 5, []); await page.click('#submit'); await page.waitForTimeout(2500);
    res = await page.locator('#result').textContent(); rec('Tester', 'all 5 answered → Completed', 'Completed', clean(res).slice(0, 120), /Completed/.test(res));
    // Writing
    await openEx(page, 'c_qa_w1'); await page.click('button:has-text("Start")').catch(() => {});
    await page.fill('#wText', 'STAGING QA essay. The library lent 120 items in January, then 180 in February, which was the highest month. In March the number fell to 150. Overall, lending rose in February and then dropped, but it stayed above the January figure.');
    await page.click('#submit'); await page.waitForTimeout(3000); res = await page.locator('#result').textContent().catch(() => '');
    rec('Tester', 'Writing Task 1 submits', 'Submitted', clean(res).slice(0, 120), /Submitted/.test(res), await shot(page, 'tester-writing'));
    res = await page.locator('#result').textContent().catch(() => '');
    rec('Tester', 'AI is off on staging: Writing still saved, clear message (no broken screen)', '"not available right now. Your answer is saved"', clean(res).slice(0, 160), /Your answer is saved/.test(res));
    page.bad = page.bad.filter((x) => !/\/api\/ai\/correct/.test(x)); page.errs = page.errs.filter((x) => !/status of 502/.test(x)); // expected: AI switched off on staging
    // external task screenshot (mixed, overdue) → late
    await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'load' }); await page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 }); await page.waitForTimeout(2500);
    const k = 'qa_hw_mixed|x1'; await page.click('[data-act="hw-xopen"][data-k="' + k + '"]').catch(() => {}); await page.waitForTimeout(600);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const inp = page.locator('input#hwShot_qa_hw_mixed_x1'); let upOk = false;
    if (await inp.count()) { await inp.setInputFiles({ name: 'qa.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(4000); upOk = /Submitted late|Submitted/.test(await page.locator('#libBody').textContent()); }
    rec('Tester', 'external task screenshot after the deadline = Submitted late', 'Submitted late', upOk ? 'uploaded, status shown' : 'upload input not found / failed', upOk, await shot(page, 'tester-external'));
    rec('Tester', 'no console errors / failed requests (tester session)', '0', JSON.stringify({ errs: page.errs, http: page.bad }), !page.errs.length && !page.bad.length);
    // mobile dark, signed in
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark' }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2500);
    const hs = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    rec('Tester', 'Home at 390 px, dark: no sideways scroll', 'no h-scroll', hs ? 'h-scroll' : 'ok', !hs, await shot(page, 'tester-mobile-dark'));
    await ctx.close();
  }
  // ---------- Student (STG-A, made-up): partial work on the STG-A QA homework, class boundary
  {
    const { ctx, page } = await newCtx(b);
    await login(page, 'stg.student@example.test', PW['stg.student@example.test']); await envGate(page, 'student submission');
    const home = await page.locator('#libBody').textContent();
    rec('Student', 'sees STG-A homework only (no tester / class Test homework)', 'STG-A QA homework, no "(tester)"', clean(home).slice(0, 160), /STAGING\/QA this week \(STG-A\)/.test(home) && !/\(tester\)/.test(home), await shot(page, 'student-home'));
    await openEx(page, 'c_qa_r5'); await answer(page, EX.qa_r5, 3, [3, 4]); await page.click('#submit'); await page.waitForTimeout(500); await page.click('#uiDlg [data-act="ui-ok"]').catch(() => {}); await page.waitForTimeout(2500);
    const other = await api(page, 'hwa/data', { days: 60 }); rec('Student', 'a student cannot open the assistant API', '403', other.status, other.status === 403);
    await ctx.close();
  }
  // ---------- Teacher
  {
    const { ctx, page } = await newCtx(b);
    await login(page, 'stg.teacher@example.test', PW['stg.teacher@example.test']);
    const tabs = await page.locator('#tabs').textContent();
    rec('Teacher', 'no Admin / Create / Prizes tools', 'only Classes, Marking, Dashboard, Library', clean(tabs), !/Admin|Create|Prizes/.test(tabs));
    await tab(page, 'mark'); const mk = await page.locator('#v-mark').textContent();
    rec('Teacher', 'Marking: unmarked Writing says Submitted (not Done); counts', '"submitted · 0 marked" style + Submitted pill', clean(mk).slice(0, 200), /Submitted/.test(mk) && !/\bDone\b/.test(mk), await shot(page, 'teacher-marking'));
    rec('Teacher', 'old unmarked Writing (200 days) listed in Marking', 'present', /made-up staging essay that nobody has marked/.test(mk) || /STG Student An/.test(mk) ? 'present' : 'missing', /STG Student An/.test(mk));
    await tab(page, 'asg'); await page.waitForTimeout(1000);
    const cls = page.locator('[data-act="cls-open"], .ccard button').first(); await cls.click().catch(() => {}); await page.waitForTimeout(1500);
    const op = page.locator('[data-act="asg-open"]').filter({ hasText: 'STAGING/QA this week (STG-A)' }); await op.click().catch(() => {}); await page.waitForTimeout(2500);
    const mtx = await page.locator('.adet').first().textContent().catch(() => '');
    rec('Teacher', 'STG-A QA homework table: STG Student An has 3/5 (incomplete) for the 5-question exercise', '! 3/5 · Submitted · Incomplete', clean(mtx).slice(0, 300), /3\/5/.test(mtx), await shot(page, 'teacher-stga-matrix'));
    const old = page.locator('[data-act="asg-open"]').filter({ hasText: 'STG old homework' }); await old.click().catch(() => {}); await page.waitForTimeout(4000);
    const om = await page.locator('#v-asg').textContent();
    rec('Teacher', 'assignment older than 60 days loads its older work (✓ late, 3/5 incomplete, Completion column), no "Loading…" left', 'late + 3/5 + Completion', clean(om).match(/STG old homework[\s\S]{0,40}/) ? 'table shown' : 'not found', /late/.test(om) && /3\/5/.test(om) && /Completion|COMPLETION/i.test(om) && !/Loading the work/.test(om), await shot(page, 'teacher-old-asg'));
    rec('Teacher', 'no console errors / failed requests (teacher session)', '0', JSON.stringify({ errs: page.errs, http: page.bad }), !page.errs.length && !page.bad.length);
    await ctx.close();
  }
  // ---------- Homework Assistant
  {
    const { ctx, page } = await newCtx(b);
    await login(page, 'stg.assistant@example.test', PW['stg.assistant@example.test']);
    const me = await page.evaluate(() => window.MD_USER); rec('Assistant', 'opens its own workspace (role assistant, not student)', 'assistant', me.role, me.role === 'assistant', await shot(page, 'hwa-home'));
    const d = await api(page, 'hwa/data', { days: 120, classes: ['Test', 'STG-B'], cls: 'STG-B' });
    rec('Assistant', 'API: only STG-A, whatever the request asks', 'classes ["STG-A"], no class Test / STG-B students', JSON.stringify({ s: d.status, classes: d.d.classes, stuCls: [...new Set((d.d.students || []).map((s) => s.cls))] }), d.status === 200 && JSON.stringify(d.d.classes) === '["STG-A"]' && (d.d.students || []).every((s) => s.cls === 'STG-A'));
    rec('Assistant', 'API reply has no email address', 'no @', /@/.test(JSON.stringify(d.d)) ? 'email found' : 'none', !/@example\.test/.test(JSON.stringify(d.d)));
    const an = (d.d.students || []).find((s) => /An$/.test(s.name)); const qa = (d.d.assignments || []).find((a) => a.id === 'qa_hw_stga');
    const st = an && qa ? d.d.status[qa.id][an.key] : null;
    rec('Assistant', 'same student + homework as the teacher table: partial (not complete), parts listed', 'incomplete or pending, done < n, parts', JSON.stringify(st), !!st && st.st !== 'done' && st.done < st.n && Array.isArray(st.parts));
    const mv = (d.d.students || []).find((s) => /Chi/.test(s.name)), lt = (d.d.assignments || []).find((a) => a.id === 'stg_late');
    const cs = mv && lt ? d.d.status[lt.id][mv.key] : null, cp = cs && (cs.parts || []).find((p) => p.k === 'ex');
    rec('Assistant', 'student who changed class: the Library exercise done in the old class counts (the external task is still missing)', 'Library part done/late, 1/2 parts', JSON.stringify(cs), !!cp && (cp.st === 'late' || cp.st === 'done') && cs.done === 1);
    await page.click('#tabs [data-act="tab"][data-tab="hwa-miss"]').catch(() => {}); await page.waitForTimeout(1500);
    rec('Assistant', 'Missing homework page shows partial progress text', '"parts done · missing"', /parts done/.test(await page.locator('#v-hwa').textContent()) ? 'shown' : 'not shown', /parts done/.test(await page.locator('#v-hwa').textContent()), await shot(page, 'hwa-missing'));
    rec('Assistant', 'no console errors / failed requests (assistant session)', '0', JSON.stringify({ errs: page.errs, http: page.bad }), !page.errs.length && !page.bad.length);
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(R, null, 2));
  console.log('---- ' + R.filter((r) => r.result === 'PASS').length + ' pass · ' + R.filter((r) => r.result === 'FAIL').length + ' fail · ' + R.filter((r) => r.result === 'NOT TESTED').length + ' not tested');
  await b.close();
})().catch((e) => { console.error('QA stopped: ' + clean(e && e.message)); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(R, null, 2)); process.exit(1); });
