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
const R = []; let TEACHER_A = {}, FORGE = null, LIVE = {};
const VER = (fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').match(/var APP_VERSION='([^']+)'/) || [])[1], SVER = (fs.readFileSync(path.join(__dirname, '..', 'functions', 'api', '[[path]].js'), 'utf8').match(/const API_VERSION = '([^']+)'/) || [])[1]; // results: {id, role, test, expected, observed, result, evidence}
const rec = (role, test, expected, observed, ok, evidence) => { R.push({ role, test, expected, observed: String(observed).slice(0, 800), result: ok === null ? 'NOT TESTED' : ok ? 'PASS' : 'FAIL', evidence: evidence || '' }); console.log((ok === null ? 'SKIP' : ok ? 'PASS' : 'FAIL') + ' [' + role + '] ' + test + (ok ? '' : ' -> ' + String(observed).slice(0, 200))); };
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
  const page = await ctx.newPage(); page.errs = []; page.bad = []; page.fs = []; page.nav = Date.now();
  // Firestore listen-channel errors are recorded with evidence (status, body, time since the last navigation), never dropped:
  // see fsCheck(). Other "Failed to load resource" lines stay errors.
  const LISTEN = /firestore\.googleapis\.com\/google\.firestore\.v1\.Firestore\/(Listen|Write)\/channel/;
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) page.nav = Date.now(); });
  page.on('console', (m) => { if (m.type() !== 'error') return; const u = (m.location() && m.location().url) || ''; if (LISTEN.test(u) && /Failed to load resource/.test(m.text())) return; page.errs.push(clean(m.text()).slice(0, 200)); });
  page.on('response', async (r) => { if (r.status() < 400 || !LISTEN.test(r.url())) return; let body = ''; try { body = (await r.text()).slice(0, 200); } catch (e) { body = '(body unavailable)'; }
    const q = new URL(r.url()).searchParams; page.fs.push({ status: r.status(), method: r.request().method(), type: q.get('TYPE') || '', rid: q.get('RID') || '', msAfterNav: Date.now() - page.nav, body: clean(body).replace(/\s+/g, ' ') }); });
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + clean(String(e)).slice(0, 200)));
  page.on('response', (r) => { if (r.status() >= 400 && !/\/api\/(status|names)/.test(r.url()) && !LISTEN.test(r.url())) page.bad.push(r.status() + ' ' + r.url().replace(BASE, '')); });
  return { ctx, page };
}
// Firestore channel errors of one session: listed with their evidence. PASS only when every one is a channel-session error
// the SDK recovers from by itself (body names the session: "Unknown SID" / session not found) AND the app is still live
// afterwards (status dot "saved" = a snapshot arrived after the error). Anything else = FAIL.
async function fsCheck(page, role) {
  const st = await page.evaluate(() => { const s = document.querySelector('#status'); return s ? s.getAttribute('data-s') : ''; }).catch(() => '');
  const ok = page.fs.every((x) => /unknown sid|session/i.test(x.body)) && st === 'saved';
  rec(role, 'Firestore channel errors: each explained, app still live', 'none, or only session-expired channel errors + status saved',
    JSON.stringify({ n: page.fs.length, status: st, errors: page.fs.slice(0, 6) }), page.fs.length ? ok : st === 'saved' ? true : null);
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
    rec('Admin', 'QA fixture dry run writes nothing and lists the plan', '200, dry, 16 records', pv.status + ' ' + JSON.stringify({ dry: pv.d.dry, n: (pv.d.plan || []).length, c: pv.d.created, u: pv.d.updated, s: pv.d.skipped }), pv.status === 200 && pv.d.dry === true && (pv.d.plan || []).length === 16);
    const qa = await api(page, 'admin/staging', { op: 'qa' }, true); FIX = qa.d;
    rec('Admin', 'QA fixture created / updated (idempotent)', '200, 0 skipped', qa.status + ' ' + JSON.stringify({ c: qa.d.created, u: qa.d.updated, s: qa.d.skipped }), qa.status === 200 && qa.d.skipped === 0);
    // which rules are LIVE in the staging project (read from Firebase, not from GitHub)
    const lr = await api(page, 'admin/staging', { op: 'rules' }, true); LIVE = (lr.d.firestore && lr.d.firestore.has) || {};
    rec('Admin', 'live staging Firestore rules (read from Firebase)', 'newest rules: class proof + exercise check', JSON.stringify({ release: lr.d.firestore && lr.d.firestore.release, has: LIVE }), !!(LIVE.vnMonth && LIVE.classProof && LIVE.classFailClosed && LIVE.exInAsg));
    // old Lucky Wheel 1-day Extensions (no server record): preview → retire → preview again (0 old)
    const ex1 = await api(page, 'admin/extlegacy', { op: 'preview' }, true), ex2 = await api(page, 'admin/extlegacy', { op: 'apply', confirm: 'RETIRE' }, true), ex3 = await api(page, 'admin/extlegacy', { op: 'preview' }, true);
    rec('Admin', 'old 1-day Extensions: preview counts, retire (backup first), preview again = 0 old; server-issued items kept', 'apply 200, then 0 old', JSON.stringify({ before: ex1.d.counts, sample: ex1.d.sample, retired: ex2.d.itemsRetired, failed: ex2.d.failed, after: ex3.d.counts && ex3.d.counts.legacy }), ex2.status === 200 && ex3.d.counts && ex3.d.counts.legacy === 0);
    // late passes made before the quota markers existed: preview → create missing markers → preview again (0 missing)
    const pm1 = await api(page, 'admin/passmarkers', { op: 'preview' }, true), pm2 = await api(page, 'admin/passmarkers', { op: 'apply' }, true), pm3 = await api(page, 'admin/passmarkers', { op: 'preview' }, true);
    const pmT = (pm1.d.rows || []).filter((r) => /stg\.tester/.test(r.email)).map((r) => r.kind + ':' + r.asgId + ':' + r.state);
    rec('Admin', 'old late passes of this month get their quota marker (preview, apply, preview again = 0 missing)', 'apply 200, then 0 missing', JSON.stringify({ month: pm1.d.month, before: pm1.d.missing, tester: pmT, created: pm2.d.created, after: pm3.d.missing }), pm1.status === 200 && pm2.status === 200 && pm3.d.missing === 0);
    await envGate(page, 'password rotation');
    let rot = 0; for (const a of ACC) { const r = await api(page, 'admin/password', { email: a, newPassword: PW[a] }, true); if (r.status === 200) rot++; else rec('Admin', 'rotate password ' + a, '200', r.status + ' ' + clean(JSON.stringify(r.d)), false); }
    rec('Admin', 'made-up accounts get new random passwords (old ones seen in screenshots stop working)', '7 of 7', rot + ' of 7', rot === 7);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2500);
    await tab(page, 'admin');
    await page.evaluate(() => { const b = document.querySelector('[data-act="ad-sub"][data-v="me"]'); if (b) b.click(); }); await page.waitForTimeout(1500);
    const diag = await page.locator('#adVer').textContent().catch(() => '');
    const envl = await page.locator('#v-admin').textContent();
    rec('Admin', 'Diagnostics: app + server versions, environment staging, project', 'app ' + VER + ' · server ' + SVER + ' · staging · mini-drills-staging', clean(diag) + ' | ' + (/environment staging/.test(envl) ? 'env staging' : 'env ?') + (/mini-drills-staging/.test(envl) ? ' · project ok' : ''), diag.indexOf('app ' + VER) >= 0 && diag.indexOf('server ' + SVER) >= 0 && /environment staging/.test(envl) && /mini-drills-staging/.test(envl), await shot(page, 'admin-diagnostics'));
    await tab(page, 'library');
    const cam14 = await page.locator('button.bk[data-v="cam14"]').getAttribute('class').catch(() => '');
    const cam21 = await page.locator('button.bk[data-v="cam21"]').textContent().catch(() => '');
    rec('Admin', 'Cam 14 samples stay hidden (grey Empty), QA exercises in Cam 21', 'cam14 "bk e", cam21 3 exercises', cam14 + ' | ' + cam21, /\be\b/.test(cam14 || '') && /3 exercises/.test(cam21 || ''), await shot(page, 'admin-library'));
    rec('Admin', 'no console errors / failed requests (admin session)', '0', JSON.stringify({ errs: page.errs, http: page.bad }), !page.errs.length && !page.bad.length);
    await fsCheck(page, 'Admin');
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
    const doneBefore = !/Incomplete · \d\/\d answered/.test(home) && /Reading · 5 questions[\s\S]{0,120}\d\/5/.test(home);
    rec('Tester', 'after reload: still Incomplete 3/5, not silently complete', 'Incomplete · 3/5 answered', doneBefore ? 'already completed in an earlier QA run (a complete attempt wins): not testable on this account again' : (clean(home).match(/Incomplete · \d\/\d answered/) || 'not found'), doneBefore ? null : /Incomplete · 3\/5 answered/.test(home), await shot(page, 'tester-home-after-reload'));
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
    if (!(await page.locator('#wText').count())) { await page.click('[data-act="w-new"]').catch(() => {}); await page.waitForTimeout(1200); } // submitted in an earlier run: write a new version
    await page.fill('#wText', 'STAGING QA essay. The library lent 120 items in January, then 180 in February, which was the highest month. In March the number fell to 150. Overall, lending rose in February and then dropped, but it stayed above the January figure.');
    await page.click('#submit'); await page.waitForTimeout(3000); res = await page.locator('#result').textContent().catch(() => '');
    rec('Tester', 'Writing Task 1 submits', 'Submitted', clean(res).slice(0, 120), /Submitted/.test(res), await shot(page, 'tester-writing'));
    res = await page.locator('#result').textContent().catch(() => '');
    rec('Tester', 'AI is off on staging: Writing still saved, clear message (no broken screen)', '"not available right now. Your answer is saved"', clean(res).slice(0, 160), /Your answer is saved/.test(res));
    page.bad = page.bad.filter((x) => !/\/api\/ai\/correct/.test(x)); page.errs = page.errs.filter((x) => !/status of 502/.test(x)); // expected: AI switched off on staging
    // external task screenshot (mixed, overdue) → late
    await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'load' }); await page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 }); await page.waitForTimeout(2500);
    const k = 'qa_hw_mixed|x1'; await page.click('[data-act="hw-xopen"][data-k="' + k + '"]').catch(() => {}); await page.waitForTimeout(600);
    const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 240, height: 160 } }); // a real picture (the server refuses files under 100 bytes)
    const inp = page.locator('input#hwShot_qa_hw_mixed_x1'); let upOk = false, upTxt = 'upload input not found';
    if (await inp.count()) {
      const resp = page.waitForResponse((r) => /\/api\/image\?kind=hwshot/.test(r.url()), { timeout: 20000 }).catch(() => null);
      await inp.setInputFiles({ name: 'qa.png', mimeType: 'image/png', buffer: png }); const r = await resp; await page.waitForTimeout(2500);
      const rowL = page.locator('[data-act="hw-xopen"][data-k="' + k + '"]'), row = (await rowL.count()) ? clean(await rowL.first().textContent()) : '';
      const gone = !(await page.locator('text=STAGING/QA mixed').count()); // overdue homework lists only unfinished parts: all done → the card leaves Home
      upOk = !!r && r.status() === 200 && (/Submitted late/.test(row) || gone);
      upTxt = 'upload HTTP ' + (r ? r.status() : 'none') + (row ? ' · row: ' + row.slice(0, 80) : gone ? ' · every part now done, the overdue card left Home (label "Submitted late" not visible on Home after the deadline; covered by tests/hw-mixed.test.js)' : ' · card still there, no late label');
    }
    if (!(await inp.count()) && !(await page.locator('text=STAGING/QA mixed').count())) rec('Tester', 'external task screenshot after the deadline is accepted and counts', 'HTTP 200 + homework finished', 'already uploaded in an earlier QA run (homework finished, card gone): not testable on this account again', null, await shot(page, 'tester-external'));
    else rec('Tester', 'external task screenshot after the deadline is accepted and counts', 'HTTP 200 + row "Submitted late" or homework finished', upTxt, upOk, await shot(page, 'tester-external'));
    rec('Tester', 'no console errors / failed requests (tester session)', '0', JSON.stringify({ errs: page.errs, http: page.bad }), !page.errs.length && !page.bad.length);
    await fsCheck(page, 'Tester');
    // ---------- (11/2026) assignment-scoped deadlines: A closed 100 days ago and B open share c_qa_r5
    await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'load' }); await page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 }); await page.waitForTimeout(2500);
    home = await page.locator('#libBody').textContent();
    rec('Tester', 'Home lists A (closed 100 days) as missing', 'card "scenario A: closed 100 days ago"', /scenario A: closed 100 days ago/.test(home) ? 'shown' : 'not shown', /scenario A: closed 100 days ago/.test(home));
    await page.click('[data-act="nav"][data-asg="qa_sc_A"][data-ex="c_qa_r5"]').catch(() => {}); await page.waitForTimeout(1200);
    let body = await page.locator('#libBody').textContent();
    rec('Tester', 'opening A after its deadline (no late pass) = Locked, even though B with the same exercise is open', 'Locked + offer to do it for B', clean(body).slice(0, 260),
      /Locked\./.test(body) && /scenario A/.test(body) && /Do it for STAGING\/QA this week \(tester\)/.test(body) && (await page.locator('[data-act="ctx-pick"][data-asg="qa_sc_A"]').count()) === 0 && !(await page.locator('#submit').count()), await shot(page, 'scope-A-locked'));
    await page.click('[data-act="ctx-pick"][data-asg="qa_hw_now"]').catch(() => {}); await page.waitForTimeout(1200);
    body = await page.locator('#libBody').textContent();
    rec('Tester', 'switching to B: the bar says the work counts for B', '"Counts for STAGING/QA this week (tester)"', clean(body).slice(0, 160), /Counts for STAGING\/QA this week \(tester\)/.test(body) && (await page.locator('#submit').count()) > 0, await shot(page, 'scope-B-context'));
    await answer(page, EX.qa_r5, 5, []); await page.click('#submit'); await page.waitForTimeout(3500);
    const mine = await page.evaluate(async () => { const db = firebase.firestore(), me = window.MD_USER.email.toLowerCase();
      const s = await db.collection('attempts').where('email', '==', me).get(); const L = s.docs.map((d) => d.data()).filter((a) => a.ex === 'c_qa_r5').sort((x, y) => y.ts - x.ts);
      const a = L[0] || {}; return { asg: a.asg, sts: !!(a.sts && a.sts.toMillis), skew: a.sts && a.sts.toMillis ? Math.abs(a.sts.toMillis() - a.ts) : null }; });
    rec('Tester', 'the attempt done through B is saved for B (asg = qa_hw_now) with server time', 'asg qa_hw_now, sts set', JSON.stringify(mine), mine.asg === 'qa_hw_now' && mine.sts);
    // are the new rules published in the staging Firebase project? Harmless probe: an attempt with no server time for an
    // exercise id that does not exist (new rules refuse it; old rules accept it, and it counts for nothing)
    const rulesNew = await page.evaluate(async () => { try { await firebase.firestore().collection('attempts').add({ email: window.MD_USER.email.toLowerCase(), ex: 'qa_rules_probe', score: 0, total: 1, items: [], ts: Date.now() }); return false; } catch (e) { return e.code === 'permission-denied'; } });
    rec('Tester', 'staging Firestore rules are the new ones (server time required)', 'probe refused', rulesNew ? 'refused (new rules)' : 'accepted (old rules still published)', rulesNew);
    // direct Firestore writes (what a student could try from the console): all refused by the rules
    const tamper = !rulesNew ? { skipped: 'old rules' } : await page.evaluate(async () => { const db = firebase.firestore(), FV = firebase.firestore.FieldValue, me = window.MD_USER.email.toLowerCase();
      const sl = me.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), r = {};
      const tr = async (k, f) => { try { await f(); r[k] = 'ALLOWED'; } catch (e) { r[k] = e.code || String(e).slice(0, 40); } };
      const att = (o) => Object.assign({ email: me, student: 'QA', cls: 'Test', ex: 'c_qa_r5', score: 5, total: 5, answered: 5, required: 5, items: [], ts: Date.now(), sts: FV.serverTimestamp() }, o);
      await tr('attempt for closed A', () => db.collection('attempts').add(att({ asg: 'qa_sc_A' })));
      await tr('attempt with no server time', () => { const a = att({ asg: 'qa_hw_now' }); delete a.sts; return db.collection('attempts').add(a); });
      await tr('attempt with a made-up old time', () => db.collection('attempts').add(att({ asg: 'qa_hw_now', sts: new Date(Date.now() - 200 * 864e5) })));
      await tr('attempt for an assignment that does not exist', () => db.collection('attempts').add(att({ asg: 'qa_nope' })));
      await tr('late pass for A (would end 93 days ago)', () => db.doc('passes/' + sl + '_qa_sc_A').set({ email: me, asgId: 'qa_sc_A', kind: 'week', month: '2026-11', ts: Date.now() }));
      await tr('change the ended late pass to a week', () => db.doc('passes/' + sl + '_qa_sc_ended').set({ email: me, asgId: 'qa_sc_ended', kind: 'week', month: '2026-11', ts: Date.now() }));
      const bt = (o) => { const b = db.batch(), m = o.month; b.set(db.doc('passes/' + sl + '_qa_hw_now'), { email: me, asgId: 'qa_hw_now', kind: 'day', month: m, ts: Date.now() }); if (o.marker) b.set(db.doc('passq/' + sl + '_' + m + '_day'), { email: me, asgId: 'qa_hw_now', kind: 'day', month: m, ts: Date.now() }); return b.commit(); };
      await tr('late pass without the month marker', () => bt({ month: new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 7) }));
      await tr('late pass + marker with a made-up month', () => bt({ month: '2001-01', marker: true }));
      await tr('screenshot record for closed A', () => db.doc('hwdone/' + sl + '_qa_sc_A').set({ email: me, asgId: 'qa_sc_A', done: true, ts: Date.now() }));
      return r; });
    rec('Tester', 'direct Firestore writes cannot unlock or credit A (rules refuse every one)', 'all permission-denied', rulesNew ? JSON.stringify(tamper) : 'not run: the staging project still has the old rules (would write junk and use up the tester late pass)', rulesNew ? Object.keys(tamper).length === 9 && Object.values(tamper).every((v) => v === 'permission-denied') : null);
    // ---------- late-pass quota on the real staging rules (targets qa_q1..qa_q3 have no exercises: invisible on Home)
    if (!rulesNew) rec('Tester', 'late-pass quota on staging', 'run', 'not run: old rules', null);
    else {
      const q = await page.evaluate(async () => { const db = firebase.firestore(), me = window.MD_USER.email.toLowerCase(), sl = me.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const VM = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 7), r = {};
        const go = (asg, kind) => { const b = db.batch(); b.set(db.doc('passes/' + sl + '_' + asg), { email: me, asgId: asg, kind, month: VM, ts: Date.now() }); b.set(db.doc('passq/' + sl + '_' + VM + '_' + kind), { email: me, asgId: asg, kind, month: VM, ts: Date.now() }); return b.commit(); };
        const res = (p) => p.then(() => 'ALLOWED', (e) => e.code || 'error');
        const mk = (await db.collection('passq').where('email', '==', me).get()).docs.map((d) => d.id); // a student cannot read a marker that does not exist
        const has = async (k) => { const q = await db.collection('passq').where('email', '==', me).get(); return q.docs.some((d) => d.id === sl + '_' + VM + '_' + k); };
        r.month = VM;
        r.dayMarkerBefore = await has('day');
        if (!r.dayMarkerBefore) r.day1 = await res(go('qa_q1', 'day'));
        r.day2 = await res(go('qa_q2', 'day'));
        r.weekMarkerBefore = await has('week');
        if (!r.weekMarkerBefore) { const st = await Promise.allSettled([go('qa_q2', 'week'), go('qa_q3', 'week')]); r.weekRace = st.map((x) => x.status); const w = st.findIndex((x) => x.status === 'fulfilled'); r.weekRetry = w < 0 ? 'none won' : await res(go(['qa_q2', 'qa_q3'][w], 'week')); }
        else r.week3 = await res(go('qa_q3', 'week'));
        r.markers = { day: await has('day'), week: await has('week') };
        try { await db.doc('passes/' + sl + '_qa_q3').set({ email: me, asgId: 'qa_q3', kind: 'day', month: 'item-x', item: 'x', ts: Date.now() }); r.itemByHand = 'ALLOWED'; } catch (e) { r.itemByHand = e.code; }
        return r; });
      const dayOk = (q.dayMarkerBefore || q.day1 === 'ALLOWED') && q.day2 === 'permission-denied';
      rec('Tester', 'monthly quota: a second 1-day pass in the same month (another homework) is refused by the rules', 'first allowed (or already used), second permission-denied', JSON.stringify({ month: q.month, before: q.dayMarkerBefore, first: q.day1, second: q.day2 }), dayOk);
      const weekOk = q.weekMarkerBefore ? q.week3 === 'permission-denied' : JSON.stringify(q.weekRace.slice().sort()) === '["fulfilled","rejected"]' && q.weekRetry === 'permission-denied';
      rec('Tester', 'monthly quota: two 1-week requests at the same time → exactly one; sending it again → refused', 'one fulfilled, one rejected; retry denied', JSON.stringify({ before: q.weekMarkerBefore, race: q.weekRace, retry: q.weekRetry, after: q.week3 }), weekOk);
      // assignment of ANOTHER class, and an exercise that is NOT in the assignment: the write itself, then whether it counts anywhere
      const fk = await page.evaluate(async () => { const db = firebase.firestore(), FV = firebase.firestore.FieldValue, me = window.MD_USER.email.toLowerCase(), r = {};
        const att = (o) => Object.assign({ email: me, student: 'QA', cls: 'Test', score: 5, total: 5, answered: 5, required: 5, items: [], ts: Date.now(), sts: FV.serverTimestamp(), qaProbe: true }, o);
        const tr = async (k, f) => { try { await f(); r[k] = 'ALLOWED'; } catch (e) { r[k] = e.code || 'error'; } };
        await tr('otherClassAsg', () => db.collection('attempts').add(att({ asg: 'qa_hw_stga', ex: 'c_qa_r5', cls: 'STG-A' })));
        await tr('exerciseNotInAsg', () => db.collection('attempts').add(att({ asg: 'qa_hw_now', ex: 'c_qa_not_in_it' })));
        await tr('closedAsgViaOtherEx', () => db.collection('attempts').add(att({ asg: 'qa_sc_A', ex: 'c_qa_r10' })));
        return r; });
      FORGE = fk;
      const allNo = fk.otherClassAsg === 'permission-denied' && fk.exerciseNotInAsg === 'permission-denied' && fk.closedAsgViaOtherEx === 'permission-denied';
      rec('Tester', 'forged links refused by the rules: another class\'s open homework / an exercise not in the homework / a closed homework', 'all permission-denied', JSON.stringify(fk) + (LIVE.classProof ? '' : ' (staging still has rules without the class check: republish)'), LIVE.classProof ? allNo : null);
      // an old-style 1-day Extension (no server record, retired by the admin above) can never be redeemed
      const lx = await api(page, 'pass', { asgId: 'qa_q2', itemId: 'qa_legacy_ext' });
      rec('Tester', 'an old 1-day Extension (no server record) cannot be redeemed', '409 noitem', JSON.stringify([lx.status, lx.d.code]), lx.status === 409 && lx.d.code === 'noitem');
      rec('Tester', 'a student cannot write a Lucky Wheel item pass directly', 'permission-denied', q.itemByHand, q.itemByHand === 'permission-denied');
      // Lucky Wheel 1-day Extension: server ledger item qa_ext_1 (made by the QA fixture)
      const i1 = await api(page, 'pass', { asgId: 'qa_hw_now', itemId: 'qa_ext_1' });
      const i2 = await api(page, 'pass', { asgId: 'qa_hw_now', itemId: 'qa_ext_1' });
      const i3 = await api(page, 'pass', { asgId: 'qa_hw_late', itemId: 'qa_ext_1' });
      const i4 = await api(page, 'pass', { asgId: 'qa_q1', itemId: 'made_up_item_42' });
      rec('Tester', 'Lucky Wheel extension: used once (or already used for this homework); retry returns the same pass', '200 then 200 again', JSON.stringify([i1.status, i1.d.code || (i1.d.again ? 'again' : 'new'), i2.status, i2.d.again]), i1.status === 200 && i2.status === 200 && i2.d.again === true);
      rec('Tester', 'Lucky Wheel extension: a used item cannot be used again for another homework', '409 used', JSON.stringify([i3.status, i3.d.code]), i3.status === 409 && i3.d.code === 'used');
      rec('Tester', 'Lucky Wheel extension: an item the server never gave is refused', '409 noitem', JSON.stringify([i4.status, i4.d.code]), i4.status === 409 && i4.d.code === 'noitem');
    }
    page.errs = page.errs.filter((x) => !/PERMISSION_DENIED|Missing or insufficient permissions/i.test(x)); // the refusals above log on purpose
    page.bad = page.bad.filter((x) => !/^409 \/api\/pass/.test(x)); // refused extensions above, on purpose
    // a late pass that has already ended: still locked
    await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'load' }); await page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 }); await page.waitForTimeout(2500);
    await page.click('[data-act="nav"][data-asg="qa_sc_ended"][data-ex="c_qa_r10"]').catch(() => {}); await page.waitForTimeout(1200);
    body = await page.locator('#libBody').textContent();
    rec('Tester', 'late pass already ended → locked again', 'Locked', clean(body).slice(0, 160), /Locked\./.test(body) && /late pass already ended/.test(body) && !(await page.locator('#submit').count()), await shot(page, 'scope-pass-ended'));
    // a late pass in its valid window: use the real button on the overdue card (if this month's week pass is still free)
    await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'load' }); await page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 }); await page.waitForTimeout(2500);
    const lateCard = page.locator('.hw').filter({ hasText: 'STAGING/QA overdue (tester)' });
    let passNote = '';
    if (await lateCard.locator('[data-act="needtime"]').count()) {
      await lateCard.locator('[data-act="needtime"]').click(); await page.waitForTimeout(600);
      const wk = lateCard.locator('[data-act="pass-ask"][data-kind="week"]:not([disabled])');
      if (await wk.count()) { await wk.click(); await page.waitForTimeout(400); await page.click('[data-act="pass-use"]'); await page.waitForTimeout(2500); passNote = 'week pass used now'; }
      else passNote = 'no week pass left this month';
    } else passNote = 'pass already on this homework (earlier run)';
    await page.click('[data-act="nav"][data-asg="qa_hw_late"][data-ex="c_qa_r5"]').catch(() => {}); await page.waitForTimeout(1200);
    body = await page.locator('#libBody').textContent();
    const lpOpen = /late pass<\/b>|late pass: this work counts as late/.test(await page.locator('#libBody').innerHTML()) && (await page.locator('#submit').count()) > 0;
    if (passNote === 'no week pass left this month') rec('Tester', 'late pass in its window: A opens, the work counts as late', 'bar "late pass … counts as late"', passNote, null);
    else {
      rec('Tester', 'late pass in its window: the overdue homework opens, the bar says it counts as late', 'bar "late pass … counts as late" + Submit', passNote + ' · ' + clean(body).slice(0, 140), lpOpen, await shot(page, 'scope-latepass-open'));
      if (lpOpen) { await answer(page, EX.qa_r5, 5, []); await page.click('#submit'); await page.waitForTimeout(3500);
        await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'load' }); await page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 }); await page.waitForTimeout(2500);
        const lc = clean(await page.locator('.hw').filter({ hasText: 'STAGING/QA overdue (tester)' }).first().textContent().catch(() => '(card gone)'));
        rec('Tester', 'work done inside the late pass is counted as late for that homework', '"Done late (late pass)"', lc.slice(0, 200), /Done late \(late pass\)/.test(lc) && !/Missed/.test(lc), await shot(page, 'scope-latepass-done'));
      }
    }
    await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'load' }); await page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 }); await page.waitForTimeout(2500);
    await tab(page, 'bag'); const bag = clean(await page.locator('#v-bag').textContent().catch(() => ''));
    rec('Tester', 'Inventory: the retired old extension shows "No longer valid", no Use button for it', '"No longer valid"', (bag.match(/1-day Extension[\s\S]{0,60}/) || [''])[0], /No longer valid/.test(bag), await shot(page, 'tester-inventory'));
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
    rec('Teacher', 'assignment older than 60 days loads its older work (Legacy · Unverified, Completion column); recent work is NOT counted as late', 'Unverified + Completion, no "late", no Loading', clean(om).match(/STG old homework[\s\S]{0,40}/) ? 'table shown' : 'not found', /Unverified/.test(om) && !/✓ late|Complete · late/.test(om) && /Completion|COMPLETION/i.test(om) && !/Loading the work/.test(om), await shot(page, 'teacher-old-asg'));
    const opA = page.locator('[data-act="asg-open"]').filter({ hasText: 'STAGING/QA scenario A (STG-A)' }); await opA.click().catch(() => {}); await page.waitForTimeout(3000);
    const am = clean(await page.locator('#v-asg').textContent()); const anRow = (am.match(/STG Student An[\s\S]{0,120}/) || [''])[0];
    TEACHER_A.an = /Complete/.test(anRow) ? 'complete' : /Unverified/.test(anRow) ? 'unverified' : /Not started|Not done/.test(anRow) ? 'missing' : '(row not found)';
    rec('Teacher', 'A (STG-A, closed 100 days): An is not credited with work done for the open homework', 'missing or unverified (flagged older work), never complete', TEACHER_A.an + ' · ' + anRow.slice(0, 120), TEACHER_A.an === 'missing' || TEACHER_A.an === 'unverified', await shot(page, 'scope-teacher-A'));
    rec('Teacher', 'no console errors / failed requests (teacher session)', '0', JSON.stringify({ errs: page.errs, http: page.bad }), !page.errs.length && !page.bad.length);
    await fsCheck(page, 'Teacher');
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
    const nw = (d.d.assignments || []).find((a) => a.id === 'stg_now'), ns = mv && nw ? d.d.status[nw.id][mv.key] : null, np = ns && (ns.parts || [])[0];
    rec('Assistant', 'student who changed class: work done (in the old class) during "this week" counts for this week, not for last week\'s closed homework', 'stg_now part done; stg_late Library part not credited', JSON.stringify({ now: ns, last: cs }), !!np && np.st === 'done' && !!cp && cp.st !== 'done' && cp.st !== 'late');
    const sa = (d.d.assignments || []).find((a) => a.id === 'qa_sc_A_stga'), sas = an && sa ? d.d.status[sa.id][an.key] : null;
    rec('Assistant', 'A (STG-A, closed 100 days) for An: not credited, although An works on the same exercise in the open homework', 'missing or unverified, done 0', JSON.stringify(sas), !!sas && (sas.st === 'missing' || sas.st === 'unverified') && sas.done === 0);
    rec('Teacher + Assistant', 'same answer for An on A (STG-A)', 'teacher = assistant', JSON.stringify({ teacher: TEACHER_A.an, assistant: sas && sas.st }), !!sas && sas.st === TEACHER_A.an);
    await page.click('#tabs [data-act="tab"][data-tab="hwa-miss"]').catch(() => {}); await page.waitForTimeout(1500);
    rec('Assistant', 'Missing homework page shows partial progress text', '"parts done · missing"', /parts done/.test(await page.locator('#v-hwa').textContent()) ? 'shown' : 'not shown', /parts done/.test(await page.locator('#v-hwa').textContent()), await shot(page, 'hwa-missing'));
    const stgaKeys = (d.d.students || []).map((x) => x.name), qs = qa ? d.d.status[qa.id] : {};
    rec('Assistant', 'forged STG-A homework attempt of the tester (class Test) counts for nobody in STG-A', 'no tester in STG-A list; STG-A statuses unchanged by it', JSON.stringify({ forge: FORGE && FORGE.otherClassAsg, students: stgaKeys }), !stgaKeys.some((n) => /Tester/i.test(n)));
    rec('Assistant', 'no console errors / failed requests (assistant session)', '0', JSON.stringify({ errs: page.errs, http: page.bad }), !page.errs.length && !page.bad.length);
    await fsCheck(page, 'Assistant');
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(R, null, 2));
  console.log('---- ' + R.filter((r) => r.result === 'PASS').length + ' pass · ' + R.filter((r) => r.result === 'FAIL').length + ' fail · ' + R.filter((r) => r.result === 'NOT TESTED').length + ' not tested');
  await b.close();
})().catch((e) => { console.error('QA stopped: ' + clean(e && e.message)); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(R, null, 2)); process.exit(1); });
