// Isolated staging (11/2026): a Preview (staging) build never gets the production Firebase settings, and its server refuses to run
// unless it is a correctly set up staging deployment (own Firebase project, own KV namespace with the staging marker, MD_ENV).
// Real build.js + real server code (Firestore / KV replaced in memory). No network. Run: node tests/staging.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..'), BLD = require(path.join(ROOT, 'build.js'));
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const PROD_KEY = (fs.readFileSync(path.join(ROOT, 'md-config.js'), 'utf8').match(/apiKey:\s*'([^']+)'/) || [])[1];
const STG = { FIREBASE_PROJECT_ID: 'md-staging-test', STAGING_FIREBASE_API_KEY: 'AIzaSyB000000000000000000000000000000', STAGING_FIREBASE_APP_ID: '1:123:web:abc123' };

// ---- the server with a chosen BUILD, an in-memory KV and Firestore
function server(build) {
  const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest')
    .replace(/^import BUILD from .*$/m, 'const BUILD = ' + JSON.stringify(build) + ';').replace(/^import MDHW from .*$/m, () => fs.readFileSync(path.join(ROOT, 'md-hw.js'), 'utf8'));
  const DB = {}, writes = [];
  const ctx = vm.createContext({ console: { log() {}, error() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; this.headers = { get: () => null }; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, fetch: async () => { throw new Error('no network in tests'); } });
  vm.runInContext(SRC + `;this.T={onRequest,envState,envScope,adminStaging,envPublic};
    var DB=null;this.setDB=function(d){DB=d};var W=null;this.setW=function(w){W=w};
    fsPut=async function(env,col,id,o){W.push(col+'/'+id);(DB[col]=DB[col]||{})[id]=JSON.parse(JSON.stringify(o))};
    fsBatchPut=async function(env,col,rows){rows.forEach(function(r){W.push(col+'/'+r.id);(DB[col]=DB[col]||{})[r.id]=r.data});return rows.length};
    fsGet=async function(env,col,id){var c=DB[col]||{};return c[id]?{data:c[id],updateTime:'t'}:null};
    fsList=async function(env,col){var c=DB[col]||{};return Object.keys(c).map(function(k){return Object.assign({id:k},c[k])})};`, ctx);
  ctx.setDB(DB); ctx.setW(writes);
  return { T: ctx.T, DB, writes };
}
function kv(init) {
  const M = Object.assign({}, init || {}), puts = [];
  return { M, puts, get: async (k, ty) => (k in M ? (ty === 'json' ? JSON.parse(M[k]) : M[k]) : null), put: async (k, v) => { puts.push(k); M[k] = v; }, delete: async (k) => { delete M[k]; }, list: async () => ({ keys: Object.keys(M).map((name) => ({ name })) }) };
}
const SB = { env: 'staging', branch: 'phase-b', sha: 'abc123', fbProject: 'md-staging-test', fbError: '' };
const goodEnv = (k) => ({ MD_ENV: 'staging', MD_KV: k || kv(), FIREBASE_PROJECT_ID: 'md-staging-test', FIREBASE_CLIENT_EMAIL: 'sa@md-staging-test.iam.gserviceaccount.com', FIREBASE_PRIVATE_KEY: 'x', ADMIN_EMAIL: 'admin@example.test', GEMINI_KEY: 'k', MD_AUDIO: { put() {} } });
const req = (route, method) => ({ request: { url: 'https://phase-b.example.pages.dev/api/' + route, method: method || 'GET', headers: { get: () => null }, json: async () => ({}) } });

(async () => {
  // ---------- build: the app config of each environment
  await t('build: a staging (non-main) build never carries the production Firebase settings', () => {
    fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
    for (const E of [Object.assign({ CF_PAGES: '1', CF_PAGES_BRANCH: 'phase-b' }, STG), { CF_PAGES: '1', CF_PAGES_BRANCH: 'feature/x' }, { CF_PAGES: '1', CF_PAGES_BRANCH: 'x', FIREBASE_PROJECT_ID: 'mini-drills', STAGING_FIREBASE_API_KEY: PROD_KEY, STAGING_FIREBASE_APP_ID: '1:1:web:a' }]) {
      BLD.writeConfig(BLD.envInfo(E), E);
      const c = fs.readFileSync(path.join(ROOT, 'dist', 'md-config.js'), 'utf8');
      assert.ok(!c.includes(PROD_KEY) && !/projectId":\s*"mini-drills"/.test(c), 'no production settings: ' + E.CF_PAGES_BRANCH);
      assert.ok(/"env": "staging"/.test(c));
    }
    fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
  });
  await t('build: staging config = the staging project, or firebase null + the reason (missing vars / production project)', () => {
    const ok = BLD.stagingFirebase(STG); assert.strictEqual(ok.firebase.projectId, 'md-staging-test'); assert.strictEqual(ok.firebase.authDomain, 'md-staging-test.firebaseapp.com');
    assert.ok(/missing Preview variable/.test(BLD.stagingFirebase({}).error));
    assert.ok(/PRODUCTION project/.test(BLD.stagingFirebase(Object.assign({}, STG, { FIREBASE_PROJECT_ID: 'mini-drills' })).error));
    assert.ok(/does not look right/.test(BLD.stagingFirebase(Object.assign({}, STG, { STAGING_FIREBASE_API_KEY: 'nope' })).error));
  });
  await t('build: main = production (md-config.js + env line); not a Cloudflare build = local (unchanged); build-info.js says which', () => {
    assert.strictEqual(BLD.envInfo({ CF_PAGES: '1', CF_PAGES_BRANCH: 'main' }).env, 'production'); assert.strictEqual(BLD.envInfo({}).env, 'local');
    fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
    const r = BLD.writeConfig({ env: 'production', branch: 'main' }, {}); const c = fs.readFileSync(path.join(ROOT, 'dist', 'md-config.js'), 'utf8');
    assert.strictEqual(r.projectId, 'mini-drills'); assert.ok(c.startsWith(fs.readFileSync(path.join(ROOT, 'md-config.js'), 'utf8')) && /window\.MD_CONFIG\.env = 'production';/.test(c));
    const bi = BLD.buildInfoJs({ env: 'staging', branch: 'phase-b', sha: 'a1' }, { projectId: 'md-staging-test' });
    assert.ok(/^\/\/ written by build\.js/.test(bi) && /export default \{"env":"staging","branch":"phase-b","sha":"a1","fbProject":"md-staging-test","fbError":""\};/.test(bi));
    fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
    assert.ok(/export default \{ env: '', branch: '', sha: '', fbProject: '', fbError: '' \};/.test(fs.readFileSync(path.join(ROOT, 'build-info.js'), 'utf8')), 'the committed build-info.js = not a Cloudflare build');
  });
  // ---------- server: staging refuses anything unsafe
  await t('staging server without its Preview variables: every route refuses (503), only GET /api/env answers', async () => {
    const S = server(SB); const env = { MD_KV: kv() };
    const r = await S.T.onRequest(Object.assign({ env }, req('names'))); assert.strictEqual(r.status, 503); assert.ok(/Staging is not set up safely/.test(JSON.parse(r.body).error));
    const e = JSON.parse((await S.T.onRequest(Object.assign({ env }, req('env')))).body); assert.strictEqual(e.env, 'staging'); assert.strictEqual(e.ok, false); assert.ok(e.problems.length >= 2);
    assert.strictEqual(env.MD_KV.puts.length, 0, 'nothing written');
  });
  await t('staging refuses the production Firebase project, a production service account, and another app project', async () => {
    for (const ch of [{ FIREBASE_PROJECT_ID: 'mini-drills' }, { FIREBASE_CLIENT_EMAIL: 'x@mini-drills.iam.gserviceaccount.com' }, { FIREBASE_PROJECT_ID: 'md-other' }, { MD_ENV: 'production' }]) {
      const S = server(SB), env = Object.assign(goodEnv(), ch), st = await S.T.envState(env);
      assert.strictEqual(st.ok, false, JSON.stringify(ch)); assert.strictEqual(env.MD_KV.puts.length, 0);
    }
  });
  await t('staging refuses a KV namespace that already holds data without the staging marker (could be production); writes nothing', async () => {
    const S = server(SB), k = kv({ 'acct:real@student.vn': '{}', staff: '{}' }), st = await S.T.envState(goodEnv(k));
    assert.strictEqual(st.ok, false); assert.ok(/may be the production namespace/.test(st.problems.join())); assert.deepStrictEqual(k.puts, []);
    const k2 = kv({ 'env:marker': 'staging:md-other' }); assert.strictEqual((await server(SB).T.envState(goodEnv(k2))).ok, false, 'marker of another project');
  });
  await t('staging + an EMPTY KV namespace: marked once as staging:<project>, then accepted', async () => {
    const S = server(SB), k = kv(), st = await S.T.envState(goodEnv(k));
    assert.strictEqual(st.ok, true, st.problems.join()); assert.strictEqual(k.M['env:marker'], 'staging:md-staging-test'); assert.strictEqual(st.kv, 'staging-marked');
    const st2 = await S.T.envState(goodEnv(k)); assert.strictEqual(st2.ok, true); assert.deepStrictEqual(k.puts, ['env:marker'], 'marked only once');
  });
  await t('staging: AI off and R2 not used unless switched on explicitly; the reply of /api/env has no secrets', async () => {
    const S = server(SB), env = goodEnv(), st = await S.T.envState(env), e = S.T.envScope(env, st);
    assert.strictEqual(st.ai, 'off'); assert.strictEqual(st.uploads, 'kv'); assert.strictEqual(e.GEMINI_KEY, ''); assert.ok(!('MD_AUDIO' in e)); assert.ok(env.MD_AUDIO, 'the real env object is not changed');
    const on = Object.assign(goodEnv(), { STAGING_AI: 'on', STAGING_R2: 'isolated' }), st2 = await S.T.envState(on); assert.strictEqual(st2.ai, 'on'); assert.strictEqual(st2.uploads, 'r2');
    const pub = JSON.stringify(S.T.envPublic(st)); assert.ok(!/PRIVATE|"x"|gserviceaccount|GEMINI/.test(pub), pub);
  });
  await t('production: refuses MD_ENV = staging or a staging-marked KV; a normal production setup runs and writes no marker', async () => {
    const PB = { env: 'production', branch: 'main', sha: 'p', fbProject: 'mini-drills' };
    assert.strictEqual((await server(PB).T.envState({ MD_ENV: 'staging', MD_KV: kv() })).ok, false);
    assert.strictEqual((await server(PB).T.envState({ MD_KV: kv({ 'env:marker': 'staging:md-staging-test' }) })).ok, false);
    const k = kv({ 'acct:a': '{}' }), st = await server(PB).T.envState({ MD_KV: k, FIREBASE_PROJECT_ID: 'mini-drills' }); assert.strictEqual(st.ok, true); assert.deepStrictEqual(k.puts, []);
    assert.strictEqual((await server({}).T.envState({ MD_KV: kv() })).ok, true, 'not a Cloudflare build (tests): unchanged behaviour');
  });
  // ---------- staging test data
  await t('staging seed: refused on production / local / an unsafe staging; nothing written', async () => {
    for (const b of [{ env: 'production' }, {}, SB]) {
      const S = server(b), env = b === SB ? { MD_KV: kv(), MD_ENV: 'staging' } : goodEnv(); const r = await S.T.adminStaging(env, { op: 'seed' });
      assert.strictEqual(r.status, 403, JSON.stringify(b)); assert.strictEqual(S.writes.length, 0);
    }
  });
  await t('staging seed: 7 made-up accounts on example.test, classes, 3 assignments, 7 attempts, all marked staging; running again keeps passwords', async () => {
    const S = server(SB), k = kv(), env = goodEnv(k);
    const a = JSON.parse((await S.T.adminStaging(env, { op: 'seed' })).body);
    assert.strictEqual(a.accounts.length, 7); assert.ok(a.accounts.every((x) => /@example\.test$/.test(x.email) && x.password.length === 14));
    assert.deepStrictEqual(Object.keys(JSON.parse(k.M.assist)), ['stg.assistant@example.test']); assert.deepStrictEqual(JSON.parse(k.M.assist)['stg.assistant@example.test'].classes, ['STG-A']);
    assert.ok(JSON.parse(k.M.staff)['stg.teacher@example.test']); assert.ok(S.DB.roster['stg.tester@example.test'].tester === true);
    assert.deepStrictEqual(Object.keys(S.DB.assignments).sort(), ['stg_late', 'stg_now', 'stg_old']); assert.strictEqual(Object.keys(S.DB.attempts).length, 7);
    assert.ok([].concat(Object.values(S.DB.roster), Object.values(S.DB.assignments), Object.values(S.DB.attempts)).every((d) => d.staging === true));
    assert.ok(S.DB.attempts.stg_a_legacy.answered === undefined && S.DB.attempts.stg_a_move.cls === 'STG-B' && S.DB.attempts.stg_w_old.kind === 'submission');
    const b = JSON.parse((await S.T.adminStaging(env, { op: 'seed' })).body);
    assert.ok(b.accounts.every((x) => /unchanged/.test(x.password)), 'second run: no new passwords'); assert.strictEqual(Object.keys(S.DB.attempts).length, 7, 'same ids, no copies');
    const c = JSON.parse((await S.T.adminStaging(env, { op: 'bulk' })).body); assert.strictEqual(c.attempts, 620); assert.strictEqual(Object.keys(S.DB.attempts).length, 627);
  });
  await t('the route sits behind the admin key; /api/env comes before every other check', () => {
    const src = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8');
    const i = src.indexOf("if (route.indexOf('admin/') === 0) {"), j = src.indexOf("if (route === 'admin/staging') return await adminStaging(env, body);"); assert.ok(i > 0 && j > i);
    const g = src.indexOf('const est = await envGate(env);'), c = src.indexOf("return fail('Server is not configured yet.', 500);"); assert.ok(g > 0 && g < c);
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
})();
