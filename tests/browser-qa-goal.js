// Real-browser smoke test of Phase C (Personal Goal) on a STAGING Preview. NOT part of the *.test.js suite.
// Same setup as tests/browser-qa.js: playwright-core outside the repo (NODE_PATH) and the git-ignored .qa.env (staging admin).
// Refuses to run unless GET /api/env = staging, ok, project mini-drills-staging. Passwords stay in memory, never printed.
// Uses a FRESH made-up student each run (admin/staging qa-legacy + admin/rosterids), kicked at the end (data purged).
// Run: QA_BASE=https://<preview> NODE_PATH=<dir>/node_modules node tests/browser-qa-goal.js [outDir]
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright-core');
const BASE = process.env.QA_BASE || 'https://feature-phase-c-personal-goa.myhomeworkmyfuture.pages.dev', PROJECT = 'mini-drills-staging';
const OUT = process.argv[2] || path.join(__dirname, '..', 'qa-artifacts'); fs.mkdirSync(OUT, { recursive: true });
const R = [], secret = [];
const clean = (s) => { let t = String(s); secret.forEach((w) => { if (w) t = t.split(w).join('***'); }); return t; };
const rec = (role, test, expected, observed, ok, ev) => { R.push({ role, test, expected, observed: clean(observed).slice(0, 600), result: ok === null ? 'NOT TESTED' : ok ? 'PASS' : 'FAIL', evidence: ev || '' }); console.log((ok === null ? 'SKIP' : ok ? 'PASS' : 'FAIL') + ' [' + role + '] ' + test + (ok ? '' : ' -> ' + clean(observed).slice(0, 220))); };
const env = (() => { const o = {}; fs.readFileSync(path.join(__dirname, '..', '.qa.env'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, ''); }); return o; })();
secret.push(env.STG_ADMIN_PASSWORD);
async function ctxPage(b, opt) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 860 } }, opt || {})), page = await ctx.newPage(); page.errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/firestore\.googleapis\.com.*channel/.test((m.location() || {}).url || '')) page.errs.push(clean(m.text()).slice(0, 160)); });
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + clean(String(e)).slice(0, 160)));
  return { ctx, page };
}
async function gate(page) {
  const e = await page.evaluate(async () => (await fetch('/api/env', { cache: 'no-store' })).json());
  if (!(e.env === 'staging' && e.ok === true && e.serverProject === PROJECT && e.frontendProject === PROJECT)) throw new Error('STOP: not the safe staging ' + JSON.stringify(e));
  return e;
}
async function login(page, email, pw) {
  await page.goto(BASE + '/?qa=' + Date.now(), { waitUntil: 'networkidle' }); await gate(page);
  await page.fill('#sEmail', email); await page.fill('#sPass', pw); await page.click('#mdAuth form .lgbtn');
  await page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 }); await page.waitForTimeout(2500);
}
const adm = (page, p, body) => page.evaluate(async ([p, body]) => { const r = await fetch('/api/' + p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': sessionStorage.getItem('md-akey') || '' }, body: JSON.stringify(body) }); let d = {}; try { d = await r.json(); } catch (e) {} return { status: r.status, d }; }, [p, body]);
const goalApi = (page, body) => page.evaluate(async (body) => { const u = firebase.auth().currentUser, h = { 'Content-Type': 'application/json' }; if (u) h.Authorization = 'Bearer ' + (await u.getIdToken());
  const r = await fetch('/api/goal', { method: 'POST', headers: h, body: JSON.stringify(body) }); let d = {}; try { d = await r.json(); } catch (e) {} return { status: r.status, code: d.code || '', goal: d.goal ? d.goal.goal : d.goal, again: !!d.again, nextManual: d.goal && d.goal.nextManual }; }, body);
const shot = async (page, n) => { await page.screenshot({ path: path.join(OUT, n + '.png'), fullPage: true }); return n + '.png'; };

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  let E;
  try {
    const A = await ctxPage(b); await login(A.page, env.STG_ADMIN_EMAIL, env.STG_ADMIN_PASSWORD); E = await gate(A.page);
    rec('Admin', 'staging preview of the Phase C branch', 'staging · ok · mini-drills-staging', JSON.stringify(E), E.branch === 'feature/phase-c-personal-goal');
    const lr = await adm(A.page, 'admin/staging', { op: 'rules' }); const live = lr.d.firestore || {};
    const local = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8').replace(/\n$/, ''), want = crypto.createHash('sha256').update(local).digest('hex').slice(0, 16);
    const rulesNew = live.sha256 === want;
    rec('Admin', 'live staging Firestore rules = rules of this branch (goals block)', want, JSON.stringify({ live: live.sha256, release: live.release }), rulesNew ? true : null);
    // other made-up accounts get fresh random passwords (kept in memory only)
    const PW = {}; for (const em of ['stg.teacher@example.test', 'stg.assistant@example.test']) { PW[em] = 'Qa-' + crypto.randomBytes(9).toString('base64url'); secret.push(PW[em]); await adm(A.page, 'admin/password', { email: em, newPassword: PW[em] }); }
    const fx = await adm(A.page, 'admin/staging', { op: 'qa-legacy', newPassword: true }); if (fx.d.password) secret.push(fx.d.password);
    const mv = await adm(A.page, 'admin/rosterids', { op: 'apply', confirm: 'MOVE' });
    if (fx.status !== 200 || !fx.d.email) throw new Error('fresh student fixture failed: ' + fx.status);
    rec('Admin', 'fresh made-up student (no history)', 'fixture 200, purged, row fixed', JSON.stringify({ fx: fx.status, purged: fx.d.purged, moved: mv.d.moved }), fx.status === 200 && mv.status === 200);
    const em = fx.d.email, sl = em.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // ---------- student, desktop light: onboarding → set 80 → reload
    const S = await ctxPage(b, { colorScheme: 'light' }); await login(S.page, em, fx.d.password);
    await S.page.waitForSelector('#pgBox [data-act="pg-pick"]', { timeout: 20000 }).catch(() => {});
    const card0 = await S.page.locator('#pgBox').innerText().catch(() => '');
    const picks = await S.page.locator('#pgBox [data-act="pg-pick"]').count(), disabled0 = await S.page.locator('#pgBox [data-act="pg-set"]').isDisabled().catch(() => null);
    rec('Student', 'first visit: onboarding card with 6 choices, PASS 70% stated apart, Set disabled', '6 choices, "PASS is always 70%", disabled', JSON.stringify({ picks, disabled0, text: card0.slice(0, 180) }), picks === 6 && /PASS is always 70%/.test(card0) && disabled0 === true, await shot(S.page, 'goal-onboarding-desktop-light'));
    await S.page.click('#pgBox [data-act="pg-pick"][data-v="80"]'); await S.page.click('#pgBox [data-act="pg-commit"]');
    const setResp = S.page.waitForResponse((r) => /\/api\/goal$/.test(r.url()) && r.request().method() === 'POST', { timeout: 20000 }).catch(() => null);
    await S.page.click('#pgBox [data-act="pg-set"]'); const sr = await setResp; await S.page.waitForTimeout(1500);
    const card1 = await S.page.locator('#pgBox').innerText().catch(() => '');
    rec('Student', 'Set my goal 80% → saved by the server, card shows the goal and PASS 70% apart', 'HTTP 200, "My goal 80%"', JSON.stringify({ http: sr && sr.status(), text: card1.slice(0, 200) }), !!sr && sr.status() === 200 && /My goal\s*80%/.test(card1) && /PASS 70%/.test(card1), await shot(S.page, 'goal-set-desktop-light'));
    await S.page.reload({ waitUntil: 'load' }); await S.page.waitForFunction(() => !!(window.MD_USER && window.MD_USER.email), null, { timeout: 30000 }); await S.page.waitForTimeout(3500);
    const card2 = await S.page.locator('#pgBox').innerText().catch(() => '');
    rec('Student', 'after reload: same goal, no onboarding again, change locked for 30 days (date shown, no Change button)', '"My goal 80%", "You can change your goal from"', card2.slice(0, 220), /My goal\s*80%/.test(card2) && /You can change your goal from/.test(card2) && !(await S.page.locator('[data-act="pg-open"]').count()));
    // ---------- student API / Firestore negatives
    const n1 = await goalApi(S.page, { op: 'adjust', goal: 85, base: 80 });
    const n2 = await goalApi(S.page, { op: 'set', goal: 95, commit: true });
    const n3 = await goalApi(S.page, { op: 'set', goal: 72, commit: true });
    rec('Student', 'API: change before day 30 refused; a second Set keeps the first goal; 72% refused', '409 early · again goal 80 · 400', JSON.stringify([n1, n2, n3]), n1.status === 409 && n1.code === 'early' && n2.again && n2.goal === 80 && n3.status === 400);
    const fw = await S.page.evaluate(async (sl) => { const db = firebase.firestore(), r = {}; const tr = async (k, f) => { try { await f(); r[k] = 'ALLOWED'; } catch (e) { r[k] = e.code || 'error'; } };
      await tr('writeOwnGoal', () => db.doc('goals/' + sl).set({ goal: 95 }, { merge: true })); await tr('moveActivation', () => db.doc('goals/' + sl).update({ at: 0 }));
      await tr('resetCooldown', () => db.doc('goals/' + sl).update({ mt: 0 })); await tr('otherGoal', () => db.doc('goals/stg-tester-example-test').set({ goal: 70 }));
      await tr('readOwnGoal', () => db.doc('goals/' + sl).get()); await tr('readOtherGoal', () => db.doc('goals/stg-tester-example-test').get()); return r; }, sl);
    rec('Student', 'Firestore direct writes to goals (own value, activation time, cooldown, another student) are refused', 'all permission-denied', JSON.stringify(fw), ['writeOwnGoal', 'moveActivation', 'resetCooldown', 'otherGoal'].every((k) => fw[k] === 'permission-denied'));
    rec('Student', 'reads: own goal readable, another student goal refused', 'own ALLOWED · other denied', JSON.stringify({ own: fw.readOwnGoal, other: fw.readOtherGoal }), rulesNew ? fw.readOwnGoal === 'ALLOWED' && fw.readOtherGoal === 'permission-denied' : null);
    rec('Student', 'no console errors (student session)', '0', JSON.stringify(S.page.errs.filter((x) => !/PERMISSION_DENIED|insufficient permissions|status of 4\d\d/.test(x))), !S.page.errs.filter((x) => !/PERMISSION_DENIED|insufficient permissions|status of 4\d\d/.test(x)).length);
    // ---------- mobile dark
    const M = await ctxPage(b, { viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); await login(M.page, em, fx.d.password);
    await M.page.waitForSelector('#pgBox .pgv', { timeout: 20000 }).catch(() => {});
    const hs = await M.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), mt = await M.page.locator('#pgBox').innerText().catch(() => '');
    rec('Student', '390 px dark: goal card readable, no sideways scroll', 'My goal 80%, no h-scroll', JSON.stringify({ hs, text: mt.slice(0, 120) }), !hs && /My goal\s*80%/.test(mt), await shot(M.page, 'goal-mobile-dark'));
    await M.ctx.close();
    // ---------- assistant and teacher
    const H = await ctxPage(b); await login(H.page, 'stg.assistant@example.test', PW['stg.assistant@example.test']);
    const ha = await goalApi(H.page, { op: 'get' });
    rec('Assistant', 'cannot use the goal API', '403', JSON.stringify(ha), ha.status === 403); await H.ctx.close();
    const T = await ctxPage(b); await login(T.page, 'stg.teacher@example.test', PW['stg.teacher@example.test']);
    const ta = await goalApi(T.page, { op: 'get' });
    const tr = await T.page.evaluate(async (sl) => { try { const d = await firebase.firestore().doc('goals/' + sl).get(); return { read: 'ALLOWED', goal: d.exists ? d.data().goal : null }; } catch (e) { return { read: e.code || 'error' }; } }, sl);
    const tw = await T.page.evaluate(async (sl) => { try { await firebase.firestore().doc('goals/' + sl).update({ goal: 70 }); return 'ALLOWED'; } catch (e) { return e.code || 'error'; } }, sl);
    rec('Teacher', 'goal API is for students only; teacher cannot change a goal', '403 · permission-denied', JSON.stringify({ api: ta.status, write: tw }), ta.status === 403 && tw === 'permission-denied');
    rec('Teacher', 'teacher can read the student goal (read-only display)', 'ALLOWED, goal 80', JSON.stringify(tr), rulesNew ? tr.read === 'ALLOWED' && tr.goal === 80 : null);
    await T.ctx.close();
    // ---------- kick with the old session open
    const kk = await adm(A.page, 'admin/kick', { email: em });
    const kg = await goalApi(S.page, { op: 'get' });
    rec('Student', 'kicked, old session: goal API refused, goal deleted with the account', 'kick 200, 401', JSON.stringify({ kick: kk.status, purged: kk.d.purged && kk.d.purged.goals, api: kg.status }), kk.status === 200 && kg.status === 401);
    await S.ctx.close(); await A.ctx.close();
  } catch (e) { rec('QA', 'run', 'no crash', String(e && e.message), false); }
  fs.writeFileSync(path.join(OUT, 'goal-report.json'), JSON.stringify({ base: BASE, env: E, results: R }, null, 1));
  const c = { PASS: 0, FAIL: 0, 'NOT TESTED': 0 }; R.forEach((r) => c[r.result]++); console.log(JSON.stringify(c));
  await b.close();
})();
