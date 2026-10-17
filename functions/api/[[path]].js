// Mini Drills auth API (Cloudflare Pages Function, served at /api/*).
// Everyone signs in with email + password. Students pick class + name the first time;
// teachers create their password once with a setup key. Teachers reset forgotten student passwords.
// After a successful login it returns a Firebase custom token, so Firestore rules keep working.
//
// Pages -> Settings -> Variables and Secrets:
//   FIREBASE_PROJECT_ID    text    e.g. mini-drills
//   FIREBASE_CLIENT_EMAIL  secret  from the service account JSON (client_email)
//   FIREBASE_PRIVATE_KEY   secret  from the service account JSON (private_key)
//   TEACHERS               text    comma list, e.g. lorenkids795@gmail.com
//   ADMIN_SETUP_KEY        secret  any long phrase only the teacher knows (first-time teacher password)
// Pages -> Settings -> Bindings: KV namespace, variable name MD_KV

const enc = new TextEncoder();
const PBKDF2_ITER = 100000; // Workers maximum

/* ---------- small helpers ---------- */
const json = (data, status) =>
  new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
const fail = (msg, status) => json({ error: msg }, status || 400);

function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const b64urlStr = (str) => b64url(enc.encode(str));
function fromB64(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 160;
const normEmail = (e) => String(e || '').trim().toLowerCase();
const teachers = (env) =>
  String(env.TEACHERS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

function timingEq(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function sha256Hex(text) {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(pw, saltB64) {
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' }, key, 256);
  return { salt: b64url(salt), hash: b64url(bits) };
}

/* ---------- rate limit (KV, best effort) ---------- */
async function bump(env, key, ttl) {
  const cur = parseInt((await env.MD_KV.get(key)) || '0', 10) + 1;
  await env.MD_KV.put(key, String(cur), { expirationTtl: Math.max(60, ttl) });
  return cur;
}
async function count(env, key) {
  return parseInt((await env.MD_KV.get(key)) || '0', 10);
}

/* ---------- Google service account: OAuth token + Firebase custom token ---------- */
let keyCache = null;
async function signingKey(env) {
  if (keyCache) return keyCache;
  const pem = String(env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  keyCache = await crypto.subtle.importKey(
    'pkcs8', fromB64(body),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  return keyCache;
}
async function signJwt(env, payload) {
  const head = b64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64urlStr(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await signingKey(env), enc.encode(head + '.' + body));
  return head + '.' + body + '.' + b64url(sig);
}

let tokCache = { v: '', exp: 0 };
async function accessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (tokCache.v && tokCache.exp - 60 > now) return tokCache.v;
  const jwt = await signJwt(env, {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  });
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt,
  });
  if (!r.ok) throw new Error('google token ' + r.status);
  const d = await r.json();
  tokCache = { v: d.access_token, exp: now + (d.expires_in || 3600) };
  return tokCache.v;
}

// claims: em = email, role = student | teacher, nm = display name (used by firestore.rules and the app)
async function customToken(env, email, role, name) {
  const now = Math.floor(Date.now() / 1000);
  const uid = 'u' + (await sha256Hex(email)).slice(0, 40);
  return signJwt(env, {
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now, exp: now + 3600,
    uid,
    claims: { em: email, role, nm: String(name || '').slice(0, 80) },
  });
}

/* ---------- Firestore REST (admin) ---------- */
const fsBase = (env) =>
  'https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents';

function toFields(obj) {
  const f = {};
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (typeof v === 'boolean') f[k] = { booleanValue: v };
    else if (typeof v === 'number') f[k] = { integerValue: String(Math.round(v)) };
    else f[k] = { stringValue: String(v == null ? '' : v) };
  });
  return f;
}
function fromFields(fields) {
  const o = {};
  Object.keys(fields || {}).forEach((k) => {
    const v = fields[k];
    if ('stringValue' in v) o[k] = v.stringValue;
    else if ('booleanValue' in v) o[k] = v.booleanValue;
    else if ('integerValue' in v) o[k] = Number(v.integerValue);
  });
  return o;
}
async function fs(env, method, path, body) {
  const r = await fetch(fsBase(env) + path, {
    method,
    headers: { Authorization: 'Bearer ' + (await accessToken(env)), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r;
}
async function fsGet(env, col, id) {
  const r = await fs(env, 'GET', '/' + col + '/' + encodeURIComponent(id));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('firestore get ' + r.status);
  const d = await r.json();
  return { data: fromFields(d.fields), updateTime: d.updateTime };
}
async function fsList(env, col) {
  const out = [];
  let tok = '';
  for (let i = 0; i < 10; i++) {
    const r = await fs(env, 'GET', '/' + col + '?pageSize=300' + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''));
    if (!r.ok) throw new Error('firestore list ' + r.status);
    const d = await r.json();
    (d.documents || []).forEach((doc) => {
      out.push(Object.assign({ id: decodeURIComponent(doc.name.split('/').pop()) }, fromFields(doc.fields)));
    });
    tok = d.nextPageToken || '';
    if (!tok) break;
  }
  return out;
}
// create or fully replace a document
async function fsPut(env, col, id, obj) {
  const r = await fs(env, 'PATCH', '/' + col + '/' + encodeURIComponent(id), { fields: toFields(obj) });
  if (!r.ok) throw new Error('firestore put ' + r.status);
}
// update only some fields, only if the doc has not changed since we read it
async function fsUpdate(env, col, id, obj, updateTime) {
  const mask = Object.keys(obj).map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const pre = updateTime ? '&currentDocument.updateTime=' + encodeURIComponent(updateTime) : '';
  const r = await fs(env, 'PATCH', '/' + col + '/' + encodeURIComponent(id) + '?' + mask + pre, { fields: toFields(obj) });
  return r.ok;
}

/* ---------- routes ---------- */
async function listNames(env) {
  const rows = await fsList(env, 'names');
  return rows
    .filter((n) => !n.claimed && n.name && n.cls)
    .map((n) => ({ id: n.id, name: n.name, cls: n.cls, course: n.course || '' }))
    .sort((a, b) => (a.cls + a.name).localeCompare(b.cls + b.name));
}

// 'ok' | 'bad' | 'locked'. Ten wrong tries lock the email for 15 minutes.
async function checkPassword(env, email, pw) {
  if ((await count(env, 'rl:' + email)) >= 10) return 'locked';
  const acct = await env.MD_KV.get('acct:' + email, 'json');
  let ok = false;
  if (acct) {
    const h = await hashPassword(pw, acct.salt);
    ok = timingEq(h.hash, acct.hash);
  } else {
    await hashPassword(pw); // keep timing similar
  }
  if (!ok) { await bump(env, 'rl:' + email, 900); return 'bad'; }
  await env.MD_KV.delete('rl:' + email);
  return 'ok';
}
async function savePassword(env, email, pw) {
  const h = await hashPassword(pw);
  await env.MD_KV.put('acct:' + email, JSON.stringify({ salt: h.salt, hash: h.hash, ts: Date.now() }));
}

async function login(env, body) {
  const email = normEmail(body.email), pw = String(body.password || '');
  if (!emailOk(email) || !pw) return fail('Enter your email and password.');
  const st = await checkPassword(env, email, pw);
  if (st === 'locked') return fail('Too many tries. Wait 15 minutes and try again.', 429);
  if (st !== 'ok') return fail('Wrong email or password.', 401);
  if (teachers(env).indexOf(email) >= 0) {
    return json({ token: await customToken(env, email, 'teacher', 'Teacher'), user: { email, name: 'Teacher', role: 'teacher' } });
  }
  const row = await fsGet(env, 'roster', email);
  if (!row || row.data.role === 'teacher') return fail('This email is not on the class list. Ask your teacher.', 403);
  return json({ token: await customToken(env, email, 'student', row.data.name), user: { email, name: row.data.name, role: 'student' } });
}

async function register(env, body, ip) {
  const email = normEmail(body.email), pw = String(body.password || ''), nameId = String(body.nameId || '');
  if (!emailOk(email)) return fail('Enter a valid email.');
  if (pw.length < 6) return fail('Password needs at least 6 characters.');
  if ((await bump(env, 'reg:' + ip, 3600)) > 30) return fail('Too many sign-ups from this network. Try again later.', 429);
  if (await env.MD_KV.get('acct:' + email)) return fail('This email already has a password. Use Sign in. If you forgot it, ask your teacher to reset it.', 409);

  if (teachers(env).indexOf(email) >= 0) {
    const key = String(body.setupKey || '');
    if ((await bump(env, 'setup:' + ip, 3600)) > 10) return fail('Too many tries. Try again later.', 429);
    if (!env.ADMIN_SETUP_KEY || String(env.ADMIN_SETUP_KEY).length < 8 || !timingEq(key, String(env.ADMIN_SETUP_KEY))) {
      return fail('Wrong teacher setup key.', 403);
    }
    await savePassword(env, email, pw);
    return json({ token: await customToken(env, email, 'teacher', 'Teacher'), user: { email, name: 'Teacher', role: 'teacher' } });
  }

  let name = '';
  if (nameId) {
    const n = await fsGet(env, 'names', nameId);
    if (!n || n.data.claimed) return fail('That name was already taken. Pick it again from the list.', 409);
    if (await fsGet(env, 'roster', email)) return fail('This email is already on the class list. Choose "my teacher already added my email" instead.', 409);
    const okClaim = await fsUpdate(env, 'names', nameId, { claimed: true, email }, n.updateTime);
    if (!okClaim) return fail('That name was just taken. Reload and pick again.', 409);
    name = n.data.name;
    await fsPut(env, 'roster', email, {
      email, name, role: 'student', course: n.data.course || '', cls: n.data.cls || '', self: true, ts: Date.now(),
    });
  } else {
    const row = await fsGet(env, 'roster', email);
    if (!row || row.data.role === 'teacher') return fail('This email is not on the class list. Pick your name, or ask your teacher.', 404);
    name = row.data.name;
  }
  await savePassword(env, email, pw);
  return json({ token: await customToken(env, email, 'student', name), user: { email, name, role: 'student' } });
}

// A teacher sets a new password for a student (or another teacher). The teacher proves who they are with their own password.
async function resetPassword(env, body) {
  const admin = normEmail(body.email), apw = String(body.password || '');
  const target = normEmail(body.target), npw = String(body.newPassword || '');
  if (teachers(env).indexOf(admin) < 0) return fail('Only a teacher can do this.', 403);
  if (!emailOk(target)) return fail('Enter the student email.');
  if (npw.length < 6) return fail('The new password needs at least 6 characters.');
  const st = await checkPassword(env, admin, apw);
  if (st === 'locked') return fail('Too many tries. Wait 15 minutes and try again.', 429);
  if (st !== 'ok') return fail('Your teacher password is wrong.', 401);
  if (teachers(env).indexOf(target) < 0 && !(await fsGet(env, 'roster', target))) return fail('That email is not on the class list.', 404);
  await savePassword(env, target, npw);
  await env.MD_KV.delete('rl:' + target);
  return json({ ok: true });
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  try {
    if (!env.MD_KV || !env.FIREBASE_PROJECT_ID || !env.FIREBASE_PRIVATE_KEY) return fail('Server is not configured yet.', 500);
    if (route === 'names' && request.method === 'GET') return json(await listNames(env));
    if (request.method !== 'POST') return fail('Not found.', 404);
    let body = {};
    try { body = await request.json(); } catch (e) { return fail('Bad request.'); }
    const ip = request.headers.get('CF-Connecting-IP') || 'x';
    if (route === 'login') return await login(env, body);
    if (route === 'register') return await register(env, body, ip);
    if (route === 'reset') return await resetPassword(env, body);
    return fail('Not found.', 404);
  } catch (e) {
    return fail('Server error. Try again.', 500);
  }
}
