// Mini Drills auth API (Cloudflare Pages Function, served at /api/*).
// Everyone signs in with email + password. Students pick class + name the first time;
// teachers create their password once with a setup key. Teachers reset forgotten student passwords.
// After a successful login it returns a Firebase custom token, so Firestore rules keep working.
//
// Pages -> Settings -> Variables and Secrets:
//   FIREBASE_PROJECT_ID    text    e.g. mini-drills
//   FIREBASE_CLIENT_EMAIL  secret  from the service account JSON (client_email)
//   FIREBASE_PRIVATE_KEY   secret  from the service account JSON (private_key)
//   TEACHERS               text    comma list, e.g. lorenkids795@gmail.com (old way to add teachers, still works)
//   ADMIN_SETUP_KEY        secret  any long phrase only the teacher knows (first-time teacher password)
//   ADMIN_EMAIL            text    the one admin account (a teacher who also manages users)
//   ADMIN_PASSWORD         secret  the admin's first password (used once, when acct:<ADMIN_EMAIL> does not exist yet)
//   GEMINI_KEY             secret  Google AI Studio key, for /api/ai/correct (AI Writing correction)
//   GEMINI_MODELS          text    optional, free models tried in order, default gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite
//   GEMINI_MODEL           text    optional, old setting: one model tried before the default list (delete it if it is gemini-2.5-flash)
//   AI_DAILY_LIMIT         text    optional, AI checks per student per day, default 10
//   GEMINI_PROXY_URL       text    optional, Google Apps Script relay (gemini-relay.gs) /exec link. Use it when Gemini answers
//                                  "User location is not supported" (Cloudflare served from a blocked region, e.g. Hong Kong)
//   GEMINI_PROXY_SECRET    secret  same value as RELAY_SECRET in the script; then GEMINI_KEY lives in the script, not here
// Pages -> Settings -> Bindings: KV namespace, variable name MD_KV
//
// Roles at login, in order: ADMIN_EMAIL -> KV "staff" or TEACHERS -> Firestore roster/{email} (student).
// Claims: { em, role: 'student' | 'teacher', nm, adm?: true }. The admin has role 'teacher' + adm, so every
// teacher check in the app and in firestore.rules keeps working.
// KV keys:
//   acct:<email>   { salt, hash, ts }            password
//   rl:<email>     wrong-password counter (10 = locked 15 minutes)
//   staff          { "<email>": { name, ts } }   teachers added by the admin
//   off:<email>    '1' = paused, 'moved:<new>'   blocks login; the app checks /api/status every 10 minutes
//   adm:<key>      ADMIN_EMAIL, 12 h             admin session key, sent as X-Admin-Key to /api/admin/*
//   sheet          { url, csv, ts }              Google Sheet class list; sheetcache = last read, 5 minutes
//   ai:<attemptId> 'pending:<ts>' | 'done', 2 days  one AI check per Writing submission (pending older than 6 min = dead, may run again)
//   aiq:<email>:<day>  AI checks used that day
//   aipq:<email>:<day> AI practice exercises made that day (50)

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
const adminEmail = (env) => normEmail(env.ADMIN_EMAIL);

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

// claims: em = email, role = student | teacher, nm = display name, adm = admin (used by firestore.rules and the app)
async function customToken(env, email, who) {
  const now = Math.floor(Date.now() / 1000);
  const uid = 'u' + (await sha256Hex(email)).slice(0, 40);
  const claims = { em: email, role: who.role, nm: String(who.name || '').slice(0, 80) };
  if (who.adm) claims.adm = true;
  return signJwt(env, {
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now, exp: now + 3600,
    uid,
    claims,
  });
}

/* ---------- Firestore REST (admin) ---------- */
const fsBase = (env) =>
  'https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents';

// JS value <-> Firestore REST value. Flat values work as before (whole numbers -> integerValue, null -> '');
// objects become mapValue and arrays arrayValue, so attempts.ai can be stored as real data.
function toValue(v) {
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (!isFinite(v)) return { integerValue: '0' };
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (v && typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v == null ? '' : v) };
}
function fromValue(v) {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return fromFields(v.mapValue.fields);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  return undefined;
}
function toFields(obj) {
  const f = {};
  Object.keys(obj).forEach((k) => { f[k] = toValue(obj[k]); });
  return f;
}
function fromFields(fields) {
  const o = {};
  Object.keys(fields || {}).forEach((k) => {
    const v = fromValue(fields[k]);
    if (v !== undefined) o[k] = v;
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
async function fsDelete(env, col, id) {
  const r = await fs(env, 'DELETE', '/' + col + '/' + encodeURIComponent(id));
  if (!r.ok && r.status !== 404) throw new Error('firestore delete ' + r.status);
}
// create only if the document does not exist yet (false = it already exists)
async function fsCreate(env, col, id, obj) {
  const r = await fs(env, 'PATCH', '/' + col + '/' + encodeURIComponent(id) + '?currentDocument.exists=false', { fields: toFields(obj) });
  return r.ok;
}

/* ---------- Google Sheet class list (CSV link, no Google API) ---------- */
// KV sheet = { url, csv, ts }; KV sheetcache = { url, ts, rows, cols } kept 5 minutes.
// Row id = hash of (class + full name with accents), or of the "id" column when the Sheet has one.
// Plain slug() would mix up names that differ only by accents (VĂN THIÊN / VĂN THIỆN).
const SHEET_TTL = 300000;
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
const SHEET_COLS = {
  name: ['name', 'full name', 'student', 'student name', 'ho va ten', 'ho ten', 'ten', 'hoc sinh', 'ten hoc sinh'],
  cls: ['class', 'lop', 'lop hoc', 'ca', 'ca hoc', 'gio', 'gio hoc', 'time'],
  id: ['id', 'student id', 'ma', 'ma hs', 'ma hoc sinh'],
  course: ['course', 'khoa', 'khoa hoc'],
  grade: ['hien tai', 'khoi hien tai', 'grade'], // current grade; when empty, "Khối" is used
  grade2: ['khoi'],
  teacher: ['teacher', 'giao vien', 'gv'],
};
// Classes are named by time: "7H30" -> "7h30", "15H" -> "15h", "17PM" / "5PM" -> "17h", "7:30" -> "7h30". Other names stay as written.
function classLabel(raw) {
  const s = String(raw || '').trim();
  const m = /^(\d{1,2})\s*(?:h|g|:|\.)?\s*(\d{2})?\s*(am|pm)?$/i.exec(s);
  if (!m) return s;
  let h = Number(m[1]);
  const mi = m[2] || '';
  if (m[3] && m[3].toLowerCase() === 'pm' && h < 12) h += 12;
  if (h > 23 || (mi && Number(mi) > 59)) return s;
  return h + 'h' + (mi && mi !== '00' ? mi : '');
}
const classMinutes = (c) => { const m = /^(\d{1,2})h(\d{2})?$/.exec(c); return m ? Number(m[1]) * 60 + Number(m[2] || 0) : 9999; };
const byClassThenName = (a, b) => (classMinutes(a.cls) - classMinutes(b.cls)) || a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name, 'vi');
const nameKey = (cls, name) => String(cls || '').trim().toLowerCase() + '|' + String(name || '').normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();

// edit / share link -> CSV link. '' = not a Google Sheet link.
function sheetCsvUrl(url) {
  const u = String(url || '').trim();
  if (!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(u)) return '';
  const g = /[#?&]gid=(\d+)/.exec(u);
  if (/\/spreadsheets\/d\/e\//.test(u)) { // File -> Share -> Publish to web
    return u.split(/[?#]/)[0].replace(/\/pub(html)?$/, '') + '/pub?output=csv' + (g ? '&single=true&gid=' + g[1] : '');
  }
  const m = /\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/.exec(u);
  return m ? 'https://docs.google.com/spreadsheets/d/' + m[1] + '/export?format=csv&gid=' + (g ? g[1] : '0') : '';
}
function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
// Finds the header row (title rows above it are skipped) -> { rows: [{id, name, cls, course, teacher}], cols }
async function parseSheet(text) {
  const grid = parseCsv(String(text).replace(/^﻿/, ''));
  let hi = -1, map = null;
  for (let i = 0; i < Math.min(grid.length, 20) && hi < 0; i++) {
    const f = grid[i].map(fold), m = {};
    Object.keys(SHEET_COLS).forEach((k) => {
      m[k] = -1;
      for (const a of SHEET_COLS[k]) { const j = f.indexOf(a); if (j >= 0) { m[k] = j; break; } }
    });
    if (m.name >= 0 && m.cls >= 0) { hi = i; map = m; }
  }
  if (hi < 0) throw new Error('The Sheet needs a header row with a name column (Họ và tên or name) and a class column (Lớp or class).');
  const rows = [], seen = {};
  for (const r of grid.slice(hi + 1)) {
    const cell = (k) => (map[k] >= 0 ? String(r[map[k]] || '').replace(/\s+/g, ' ').trim() : '');
    const name = cell('name'), cls = classLabel(cell('cls'));
    if (!name || !cls) continue;
    let key = cell('id') ? 'id|' + cell('id') : nameKey(cls, name);
    seen[key] = (seen[key] || 0) + 1;
    if (seen[key] > 1) key += '#' + seen[key];
    const grade = cell('grade') || cell('grade2');
    rows.push({
      id: 's' + (await sha256Hex(key)).slice(0, 20), name, cls,
      course: cell('course') || (grade ? 'Grade ' + grade : ''), teacher: cell('teacher'),
    });
  }
  const cols = {};
  Object.keys(map).forEach((k) => { if (map[k] >= 0) cols[k] = grid[hi][map[k]]; });
  return { rows, cols };
}
async function fetchSheet(csv) {
  let r;
  try { r = await fetch(csv, { redirect: 'follow' }); } catch (e) { throw new Error('Could not reach Google. Try again in a minute.'); }
  if (r.status === 404) throw new Error('This Sheet was not found. Check the link.');
  // a private Sheet answers with Google's sign-in page (HTML), not CSV
  if (!r.ok || /text\/html/.test(r.headers.get('Content-Type') || '')) {
    throw new Error('Google did not let the app read this Sheet. In the Sheet: Share → General access → "Anyone with the link" → Viewer.');
  }
  return parseSheet(await r.text());
}
// null = no Sheet linked. Fresh = skip the 5-minute cache. If Google fails, the last good copy is used.
async function sheetRows(env, fresh) {
  const conf = await env.MD_KV.get('sheet', 'json');
  if (!conf || !conf.csv) return null;
  const old = await env.MD_KV.get('sheetcache', 'json');
  if (!fresh && old && old.url === conf.csv && Date.now() - old.ts < SHEET_TTL) return old;
  try {
    const s = await fetchSheet(conf.csv);
    const c = { url: conf.csv, ts: Date.now(), rows: s.rows, cols: s.cols };
    await env.MD_KV.put('sheetcache', JSON.stringify(c));
    return c;
  } catch (e) {
    if (old && old.url === conf.csv) return Object.assign(old, { stale: true, error: e.message });
    throw e;
  }
}
// Sheet rows already used: names/{id} claimed, or a student with the same class + name in the roster (old CSV sign-ups)
async function takenSet(env) {
  const [names, roster] = await Promise.all([fsList(env, 'names'), fsList(env, 'roster')]);
  const ids = {}, keys = {};
  names.forEach((n) => { if (n.claimed) ids[n.id] = 1; });
  roster.forEach((r) => {
    if (r.role === 'teacher') return;
    if (r.sid) ids[r.sid] = 1;
    keys[nameKey(r.cls, r.name)] = 1;
  });
  return { ids, keys, taken: (row) => !!(ids[row.id] || keys[nameKey(row.cls, row.name)]) };
}

/* ---------- roles, paused accounts, admin session ---------- */
async function staffMap(env) {
  return (await env.MD_KV.get('staff', 'json')) || {};
}
// -> { role, adm, name } or null. Order: ADMIN_EMAIL, then staff / TEACHERS, then a student in the roster.
async function roleOf(env, email) {
  if (!email) return null;
  if (email === adminEmail(env)) return { role: 'teacher', adm: true, name: 'Admin' };
  const st = await staffMap(env);
  if (st[email]) return { role: 'teacher', adm: false, name: st[email].name || 'Teacher' };
  if (teachers(env).indexOf(email) >= 0) return { role: 'teacher', adm: false, name: 'Teacher' };
  const row = await fsGet(env, 'roster', email);
  if (row && row.data.role !== 'teacher') return { role: 'student', adm: false, name: row.data.name };
  return null;
}
// '' | 'off' (paused by the admin) | 'moved' (email changed by the admin) | 'kicked' (account deleted, may register again)
async function offState(env, email) {
  const v = await env.MD_KV.get('off:' + email);
  if (!v) return '';
  if (v === 'kicked') return 'kicked';
  return v.indexOf('moved:') === 0 ? 'moved' : 'off';
}
const OFF_MSG = {
  off: 'Your account is paused. Ask your teacher.',
  moved: 'Your email was changed by the admin. Sign in with your new email.',
  kicked: 'Your account was removed. To come back, create your password again on the sign-in page.',
};

// The first admin login creates the password from ADMIN_PASSWORD. After that the password in KV is used.
async function seedAdmin(env, email) {
  if (!email || email !== adminEmail(env) || String(env.ADMIN_PASSWORD || '').length < 6) return;
  if (await env.MD_KV.get('acct:' + email)) return;
  await savePassword(env, email, String(env.ADMIN_PASSWORD));
}
// Random key for /api/admin/* (header X-Admin-Key), valid 12 hours.
async function newAdminKey(env, email) {
  const k = b64url(crypto.getRandomValues(new Uint8Array(32)));
  await env.MD_KV.put('adm:' + k, email, { expirationTtl: 43200 });
  return k;
}
async function adminKeyOk(env, request) {
  const k = request.headers.get('X-Admin-Key') || '';
  if (!/^[A-Za-z0-9_-]{40,}$/.test(k)) return false;
  const em = await env.MD_KV.get('adm:' + k);
  return !!em && em === adminEmail(env);
}

/* ---------- routes ---------- */
// Names a new student can pick. With a Sheet linked: Sheet rows nobody has taken yet, classes in time order.
async function listNames(env) {
  const sh = await sheetRows(env, false);
  if (sh) {
    const t = await takenSet(env);
    return sh.rows.filter((r) => !t.taken(r)).map((r) => ({ id: r.id, name: r.name, cls: r.cls, course: r.course })).sort(byClassThenName);
  }
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
  await seedAdmin(env, email);
  const st = await checkPassword(env, email, pw);
  if (st === 'locked') return fail('Too many tries. Wait 15 minutes and try again.', 429);
  if (st !== 'ok') return fail('Wrong email or password.', 401);
  const off = await offState(env, email);
  if (off) return fail(OFF_MSG[off], 403);
  const who = await roleOf(env, email);
  if (!who) return fail('This email is not on the class list. Ask your teacher.', 403);
  const res = { token: await customToken(env, email, who), user: { email, name: who.name, role: who.role, adm: !!who.adm } };
  if (who.adm) res.adminKey = await newAdminKey(env, email);
  return json(res);
}

async function register(env, body, ip) {
  const email = normEmail(body.email), pw = String(body.password || ''), nameId = String(body.nameId || '');
  if (!emailOk(email)) return fail('Enter a valid email.');
  if (pw.length < 6) return fail('Password needs at least 6 characters.');
  if ((await bump(env, 'reg:' + ip, 3600)) > 30) return fail('Too many sign-ups from this network. Try again later.', 429);
  // the admin password only comes from ADMIN_PASSWORD (first login), never from this form
  if (email === adminEmail(env)) return fail('This is the admin email. Use Sign in.', 403);
  if (await env.MD_KV.get('acct:' + email)) return fail('This email already has a password. Use Sign in. If you forgot it, ask your teacher to reset it.', 409);
  const off = await offState(env, email);
  if (off && off !== 'kicked') return fail(OFF_MSG[off], 403); // a kicked student may register again

  if (teachers(env).indexOf(email) >= 0) {
    const key = String(body.setupKey || '');
    if ((await bump(env, 'setup:' + ip, 3600)) > 10) return fail('Too many tries. Try again later.', 429);
    if (!env.ADMIN_SETUP_KEY || String(env.ADMIN_SETUP_KEY).length < 8 || !timingEq(key, String(env.ADMIN_SETUP_KEY))) {
      return fail('Wrong teacher setup key.', 403);
    }
    await savePassword(env, email, pw);
    return json({ token: await customToken(env, email, { role: 'teacher', name: 'Teacher' }), user: { email, name: 'Teacher', role: 'teacher' } });
  }

  let name = '';
  let sh = null;
  try { sh = nameId ? await sheetRows(env, true) : null; } catch (e) { return fail('Could not read the class list. Try again in a minute.', 503); }
  if (sh) {
    // Sheet linked: the name must be in the Sheet now and not taken; names/{id} is created only once
    const row = sh.rows.filter((r) => r.id === nameId)[0];
    if (!row) return fail('That name is no longer on the class list. Reload the page and pick again.', 409);
    if (await fsGet(env, 'roster', email)) return fail('This email is already on the class list. Choose "my teacher already added my email" instead.', 409);
    if ((await takenSet(env)).taken(row)) return fail('That name was already taken. Pick it again from the list, or ask your teacher.', 409);
    const okClaim = await fsCreate(env, 'names', row.id, {
      name: row.name, cls: row.cls, course: row.course, teacher: row.teacher, claimed: true, email, sid: row.id, ts: Date.now(),
    });
    if (!okClaim) return fail('That name was just taken. Reload and pick again.', 409);
    name = row.name;
    await fsPut(env, 'roster', email, {
      email, name, role: 'student', course: row.course, cls: row.cls, teacher: row.teacher, self: true, sid: row.id, ts: Date.now(),
    });
  } else if (nameId) {
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
  if (off === 'kicked') await env.MD_KV.delete('off:' + email);
  return json({ token: await customToken(env, email, { role: 'student', name }), user: { email, name, role: 'student' } });
}

// A teacher sets a new password for a student (or another teacher). The teacher proves who they are with their own password.
async function resetPassword(env, body) {
  const admin = normEmail(body.email), apw = String(body.password || '');
  const target = normEmail(body.target), npw = String(body.newPassword || '');
  const me = await roleOf(env, admin);
  if (!me || me.role !== 'teacher' || (await offState(env, admin))) return fail('Only a teacher can do this.', 403);
  if (!emailOk(target)) return fail('Enter the student email.');
  if (target === adminEmail(env)) return fail('Only the admin can change the admin password.', 403);
  if (npw.length < 6) return fail('The new password needs at least 6 characters.');
  const st = await checkPassword(env, admin, apw);
  if (st === 'locked') return fail('Too many tries. Wait 15 minutes and try again.', 429);
  if (st !== 'ok') return fail('Your teacher password is wrong.', 401);
  if (!(await roleOf(env, target))) return fail('That email is not on the class list.', 404);
  await savePassword(env, target, npw);
  await env.MD_KV.delete('rl:' + target);
  return json({ ok: true });
}

/* ---------- admin APIs (header X-Admin-Key) ---------- */
// Everyone in the app: admin, teachers (KV + TEACHERS), students (roster), with paused / moved status.
async function adminUsers(env) {
  const out = [], seen = {};
  const add = (r) => { if (r.email && !seen[r.email]) { seen[r.email] = 1; out.push(r); } };
  const ad = adminEmail(env);
  if (ad) add({ email: ad, name: 'Admin', role: 'admin', cls: '', course: '', src: 'env' });
  const st = await staffMap(env);
  Object.keys(st).forEach((e) => add({ email: e, name: st[e].name || 'Teacher', role: 'teacher', cls: '', course: '', src: 'admin' }));
  teachers(env).forEach((e) => add({ email: e, name: 'Teacher', role: 'teacher', cls: '', course: '', src: 'env' }));
  (await fsList(env, 'roster')).forEach((r) => {
    if (r.role === 'teacher') return;
    add({ email: normEmail(r.email || r.id), name: r.name || '', role: 'student', cls: r.cls || '', course: r.course || '', src: 'roster' });
  });
  await Promise.all(out.map(async (r) => {
    const off = await env.MD_KV.get('off:' + r.email);
    // 'kicked' is only seen for a teacher still listed in the TEACHERS variable (kicked students leave the roster)
    r.status = !off ? 'active' : off === 'kicked' ? 'kicked' : off.indexOf('moved:') === 0 ? 'moved' : 'paused';
    r.hasPassword = !!(await env.MD_KV.get('acct:' + r.email));
  }));
  return json({ users: out, me: ad });
}

// Set a new password for anyone. For the admin's own account the current password is needed too.
async function adminPassword(env, body) {
  const email = normEmail(body.email), pw = String(body.newPassword || '');
  if (!emailOk(email)) return fail('Enter a valid email.');
  if (pw.length < 6) return fail('The new password needs at least 6 characters.');
  if (email === adminEmail(env)) {
    const st = await checkPassword(env, email, String(body.oldPassword || ''));
    if (st === 'locked') return fail('Too many tries. Wait 15 minutes and try again.', 429);
    if (st !== 'ok') return fail('Your current password is wrong.', 401);
  } else if (!(await roleOf(env, email)) && !(await rosterRow(env, email))) {
    return fail('This email is not a student or teacher in the app.', 404);
  }
  await savePassword(env, email, pw);
  await env.MD_KV.delete('rl:' + email);
  return json({ ok: true });
}

// Pause (active:false) or resume. Paused accounts cannot sign in; open devices are signed out within 10 minutes.
async function adminActive(env, body) {
  const email = normEmail(body.email);
  if (!emailOk(email)) return fail('Enter a valid email.');
  if (email === adminEmail(env)) return fail('The admin account cannot be paused.', 403);
  if (!(await roleOf(env, email))) return fail('This email is not a student or teacher in the app.', 404);
  if ((await offState(env, email)) === 'moved') return fail('This email was changed to a new one. Manage the new email instead.', 409);
  if (body.active === false) await env.MD_KV.put('off:' + email, '1');
  else await env.MD_KV.delete('off:' + email);
  return json({ ok: true });
}

// Add a teacher (with a password the admin chose) or remove one. Removing keeps all their data.
async function adminTeachers(env, body) {
  const op = String(body.op || ''), email = normEmail(body.email);
  if (!emailOk(email)) return fail('Enter a valid email.');
  if (email === adminEmail(env)) return fail('This is the admin account.', 403);
  const st = await staffMap(env);
  if (op === 'add') {
    const name = String(body.name || '').trim().slice(0, 80), pw = String(body.password || '');
    if (!name) return fail('Enter the teacher name.');
    if (pw.length < 6) return fail('The password needs at least 6 characters.');
    if (st[email] || teachers(env).indexOf(email) >= 0) return fail('This email is already a teacher. If it is paused, use Resume in Users.', 409);
    const row = await fsGet(env, 'roster', email);
    if (row && row.data.role !== 'teacher') return fail('This email belongs to a student. Use another email.', 409);
    if ((await offState(env, email)) === 'moved') return fail('This email was changed to a new one. Use another email.', 409);
    st[email] = { name, ts: Date.now() };
    await env.MD_KV.put('staff', JSON.stringify(st));
    await savePassword(env, email, pw);
    await env.MD_KV.delete('rl:' + email);
    await env.MD_KV.delete('off:' + email);
    return json({ ok: true });
  }
  if (op === 'remove') {
    if (!st[email] && teachers(env).indexOf(email) < 0) return fail('This teacher was not found.', 404);
    delete st[email];
    await env.MD_KV.put('staff', JSON.stringify(st));
    await env.MD_KV.put('off:' + email, '1'); // also stops a TEACHERS email, which cannot be edited from here
    return json({ ok: true });
  }
  return fail('Unknown action.');
}

async function adminUnlock(env, body) {
  const ad = adminEmail(env);
  if (!ad) return fail('ADMIN_EMAIL is not set on Cloudflare.', 403);
  await seedAdmin(env, ad);
  const st = await checkPassword(env, ad, String(body.password || ''));
  if (st === 'locked') return fail('Too many tries. Wait 15 minutes and try again.', 429);
  if (st !== 'ok') return fail('Wrong admin password.', 401);
  return json({ adminKey: await newAdminKey(env, ad) });
}

// What the admin sees about the Sheet: columns found, 5 first rows, and per class who has not registered yet.
async function sheetSummary(env, c) {
  const t = await takenSet(env), by = {};
  c.rows.forEach((r) => {
    const k = by[r.cls] || (by[r.cls] = { cls: r.cls, total: 0, open: [] });
    k.total++;
    if (!t.taken(r)) k.open.push(r.name);
  });
  const classes = Object.keys(by).map((k) => by[k]).sort((a, b) => byClassThenName({ cls: a.cls, name: '' }, { cls: b.cls, name: '' }));
  return { ts: c.ts, cols: c.cols, total: c.rows.length, classes, preview: c.rows.slice(0, 5), stale: !!c.stale, error: c.error || '' };
}
// op: 'get' | 'check' (read a link, save nothing) | 'save' | 'refresh' (read again now) | 'unlink'
async function adminSheet(env, body) {
  const op = String(body.op || 'get');
  if (op === 'check' || op === 'save') {
    const url = String(body.url || '').trim(), csv = sheetCsvUrl(url);
    if (!csv) return fail('Paste the link of a Google Sheet (it starts with https://docs.google.com/spreadsheets/).');
    let s;
    try { s = await fetchSheet(csv); } catch (e) { return fail(e.message); }
    if (!s.rows.length) return fail('The Sheet has a header row but no students under it.');
    const c = { url: csv, ts: Date.now(), rows: s.rows, cols: s.cols };
    if (op === 'save') {
      await env.MD_KV.put('sheet', JSON.stringify({ url, csv, ts: Date.now() }));
      await env.MD_KV.put('sheetcache', JSON.stringify(c));
      await fsPut(env, 'config', 'sheet', { linked: true, ts: Date.now() }); // lets the teacher Students tab hide the CSV box
    }
    return json(Object.assign({ linked: op === 'save', url, saved: op === 'save' }, await sheetSummary(env, c)));
  }
  if (op === 'unlink') {
    await env.MD_KV.delete('sheet');
    await env.MD_KV.delete('sheetcache');
    await fsPut(env, 'config', 'sheet', { linked: false, ts: Date.now() });
    return json({ linked: false });
  }
  const conf = await env.MD_KV.get('sheet', 'json');
  if (!conf) return json({ linked: false });
  let c;
  try { c = await sheetRows(env, op === 'refresh'); } catch (e) { return json({ linked: true, url: conf.url, error: e.message, classes: [], preview: [], total: 0, cols: {} }); }
  return json(Object.assign({ linked: true, url: conf.url }, await sheetSummary(env, c)));
}

// Kick a student or a teacher: delete the account (password, class-list entry / staff entry) and free the Sheet name,
// so the person must register again by picking their name (a teacher is added again in Admin → Teachers).
// Learning data (attempts, XP, flashcards…) is kept: registering again with the same email brings it back.
// roster/{email} for a student. Users lists rows by their email field (or id), so an older row whose id is not the
// normalized email (capital letters, spaces) is found by that field too. -> { id, data } | null
async function rosterRow(env, email) {
  const row = await fsGet(env, 'roster', email);
  if (row) return { id: email, data: row.data };
  const hit = (await fsList(env, 'roster')).filter((r) => normEmail(r.email || r.id) === email)[0];
  return hit ? { id: hit.id, data: hit } : null;
}

async function adminKick(env, body) {
  const email = normEmail(body.email);
  if (!emailOk(email)) return fail('Enter a valid email.');
  if (email === adminEmail(env)) return fail('The admin account cannot be kicked.', 403);
  // students (roster) and teachers (KV staff, TEACHERS variable, or a teacher row in roster) can both be kicked
  const st = await staffMap(env), envTeacher = teachers(env).indexOf(email) >= 0;
  const row = await rosterRow(env, email);
  const teacher = !!st[email] || envTeacher || !!(row && row.data.role === 'teacher');
  if (!teacher && !row) return fail('This account was not found. Reload the list.', 404);
  if (st[email]) { delete st[email]; await env.MD_KV.put('staff', JSON.stringify(st)); }
  // free the name: Sheet claims (have sid) are deleted, old CSV names are marked unclaimed again
  const names = (await fsList(env, 'names')).filter((n) => normEmail(n.email) === email);
  for (const n of names) {
    if (n.sid) await fsDelete(env, 'names', n.id);
    else await fsUpdate(env, 'names', n.id, { claimed: false, email: '' });
  }
  if (row) await fsDelete(env, 'roster', row.id);
  await env.MD_KV.delete('acct:' + email);
  await env.MD_KV.delete('rl:' + email);
  await env.MD_KV.put('off:' + email, 'kicked'); // open devices are signed out by /api/status
  return json({ ok: true, role: teacher ? 'teacher' : 'student', envTeacher });
}

// Move a registered student to another class (the Sheet only matters before sign-up).
async function adminClass(env, body) {
  const email = normEmail(body.email), cls = classLabel(String(body.cls || '').slice(0, 60)), course = String(body.course || '').trim().slice(0, 60);
  if (!cls) return fail('Choose a class.');
  const row = await rosterRow(env, email);
  if (!row || row.data.role === 'teacher') return fail('This student was not found.', 404);
  if (!(await fsUpdate(env, 'roster', row.id, { cls, course }))) return fail('Could not save. Try again.', 500);
  return json({ ok: true, cls });
}

/* ---------- AI writing correction (Gemini) ---------- */
// POST /api/ai/correct { attemptId, task, exTitle, tzo }. No session: the attempt must exist in Firestore
// (only a signed-in student can create one), be a Writing submission, and be less than 2 hours old.
// KV ai:<attemptId> = 'pending' | 'done' (2 days): one AI check per attempt.
// KV aiq:<email>:<YYYY-MM-DD> = checks used today (limit AI_DAILY_LIMIT, default 10).
// Shared by /api/ai/correct (inside each correction) and /api/ai/practice.
const AI_PRACTICE_RULES =
  'Practice rules (field "practice", exactly 2 items for every mistake that is not Off-topic; Off-topic gets []):\n' +
  '- practice[0] uses the student\'s OWN sentence (the sentence that contains the mistake). Fix every OTHER mistake in that sentence, so only ONE blank is left, for this mistake.\n' +
  '- practice[1] is a NEW natural sentence on a different IELTS-style topic that tests the same rule.\n' +
  '- sentence: a complete English sentence of 8-25 words with exactly ONE "___". The blank replaces only the part to fix (at most 4 words). Right after the blank write the clue in brackets, e.g. "___ (protect) nature is the duty of every citizen."\n' +
  '- The clue must NOT contain the answer. Grammar: the base form, e.g. (protect), (go), (person). Vocabulary (word choice, collocation): the Vietnamese meaning, e.g. (đưa ra quyết định), or the first letter and letter count, e.g. (m_ _ _). Spelling: the Vietnamese meaning.\n' +
  '- Articles or words that belong to the mistake are part of the blank. Example: "protect the nature" -> "___ (protect) nature is ..." (the rest is already correct, no "the").\n' +
  '- answers: every correct way to fill the blank (capital letter at the start of a sentence, equivalent tenses), e.g. ["Protecting"], ["wrote", "was writing"].\n' +
  '- clue_type: "base_form", "meaning" or "wrong_word".\n';
const AI_PRACTICE_ITEMS = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      sentence: { type: 'STRING' },
      answers: { type: 'ARRAY', items: { type: 'STRING' } },
      clue_type: { type: 'STRING' },
    },
    required: ['sentence', 'answers', 'clue_type'],
  },
};
const AI_PROMPT =
  'You are an IELTS Writing examiner and tutor. Read the task and the student essay below and return JSON that matches the schema.\n' +
  'Rules:\n' +
  '- corrections: real mistakes only. Never invent mistakes. If the essay has no mistakes, return "corrections": [].\n' +
  '- original_text must be copied EXACTLY from the essay (same spelling, case and punctuation), as short as possible but long enough to be found in the essay.\n' +
  '- corrected_text is the fixed words. Two good options may be written as "wrote / was writing". For an Off-topic sentence, corrected_text may be "".\n' +
  '- category is a short error-notebook label, for example: Stative Verbs, Gerund as Subject & Articles, Irregular Plural Nouns, Subject-Verb Agreement, Verb Tense, Articles, Prepositions, Collocation, Word Form, Spelling, Punctuation, Off-topic.\n' +
  '- type: "Grammar" (includes punctuation), "Vocabulary" (word choice, collocation, spelling) or "Off-topic" (a sentence that does not answer the task).\n' +
  '- explanation: one short sentence in simple English.\n' +
  '- explanation_vi: the same idea in Vietnamese, ONE sentence of at most about 20 words, the way a teacher talks to a 13-16 year old student. ' +
  'Name the exact word in brackets or quotes. Only use these simple labels: V nguyên mẫu, V-ing, V3/V-ed, danh từ, tính từ, trạng từ, số ít, số nhiều. ' +
  'NEVER use grammar terms such as absolute clause, participle clause, stative verb, base verb, direct object, uncountable, gerund, auxiliary: say it in plain words instead. Examples:\n' +
  '  could accessing -> could access: "Sau could phải là V nguyên mẫu."\n' +
  '  illustrate about -> illustrates: "Sau illustrate không dùng about."\n' +
  '  most highest -> highest: "highest đã là \'cao nhất\' rồi, không thêm most."\n' +
  '  18 percents -> 18 percent: "percent không thêm s, kể cả khi có số đứng trước."\n' +
  '  Despite of -> Despite: "Despite không đi với of (hoặc dùng In spite of)."\n' +
  '  with Country C stayed -> with Country C staying: "Sau with + danh từ, động từ dùng V-ing."\n' +
  '- At most 15 corrections, most important first.\n' +
  '- vocabulary_upgrades: up to 6 simple words or phrases from the essay and a better IELTS alternative, with a short example sentence and a short note.\n' +
  AI_PRACTICE_RULES;
const AI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    corrections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          original_text: { type: 'STRING' },
          corrected_text: { type: 'STRING' },
          category: { type: 'STRING' },
          explanation: { type: 'STRING' },
          explanation_vi: { type: 'STRING' },
          type: { type: 'STRING' },
          practice: AI_PRACTICE_ITEMS,
        },
        required: ['original_text', 'corrected_text', 'category', 'explanation', 'explanation_vi', 'type', 'practice'],
      },
    },
    vocabulary_upgrades: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          original: { type: 'STRING' },
          upgraded: { type: 'STRING' },
          example: { type: 'STRING' },
          note: { type: 'STRING' },
        },
        required: ['original', 'upgraded'],
      },
    },
  },
  required: ['corrections', 'vocabulary_upgrades'],
};
const AI_MAX_AGE = 2 * 3600 * 1000;
const aiStr = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); // same as slug() in the app

// The sentence that contains text[i .. i+len] (split on . ! ? and new lines), at most 300 characters.
function sentenceAt(text, i, len) {
  let s = i, e = i + len;
  while (s > 0 && !/[.!?\n]/.test(text[s - 1])) s--;
  while (e < text.length && !/[.!?\n]/.test(text[e])) e++;
  if (e < text.length && text[e] !== '\n') e++;
  let out = text.slice(s, e).trim();
  if (out.length > 300) {
    const a = Math.max(s, i - 120);
    out = (a > s ? '…' : '') + text.slice(a, Math.min(e, a + 298)).trim() + '…';
  }
  return out;
}

// Gemini call. Every failure has a short code (shown to the student as "code: …", logged for Cloudflare Real-time logs):
// nokey, timeout, network, relay, http<status> (400/403 key or blocked location, 404 model, 429 quota, 5xx busy), blocked, empty, too_long, parse.
// One automatic retry: without the schema if Gemini rejects it, without thinking settings if those are rejected,
// or after a short wait when Gemini is busy / returned something unreadable.
class AiError extends Error {
  constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; this.detail = String(detail || ''); }
}
const aiReady = (env) => !!(env.GEMINI_KEY || env.GEMINI_PROXY_URL); // key on Cloudflare, or in the Apps Script relay
const AI_TIMEOUT = 300000; // 5 minutes: long essays (corrections + 2 practice sentences per mistake) can be slow on a busy day
const AI_SHAPE =
  '\nReturn ONLY one JSON object, no other text, in this shape: {"corrections":[{"original_text":"...","corrected_text":"...","category":"...","explanation":"...","explanation_vi":"...","type":"Grammar","practice":[{"sentence":"... ___ (clue) ...","answers":["..."],"clue_type":"base_form"}]}],"vocabulary_upgrades":[{"original":"...","upgraded":"...","example":"...","note":"..."}]}\n';
const PRACTICE_SHAPE = '\nReturn ONLY one JSON object, no other text, in this shape: {"practice":[{"sentence":"... ___ (clue) ...","answers":["..."],"clue_type":"base_form"}]}\n';
function parseJsonLoose(raw) {
  try { return JSON.parse(raw); } catch (e) { /* try the part between the first { and the last } */ }
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(raw.slice(a, b + 1)); } catch (e) { return null; } }
  return null;
}
// Free-tier models, tried in this order (all "Free of charge" on the Gemini API Free Tier, checked 10/2026).
// GEMINI_MODELS (comma list) replaces the list; the old GEMINI_MODEL (one model) is tried first.
// Paid-only models (Pro, Argon, Gemini 4…) are never used, even when written in a variable.
const AI_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
const PAID_ONLY = /(^|-)pro(-|$)|argon|^gemini-[4-9]/i;
function aiModels(env) {
  const want = env.GEMINI_MODELS ? String(env.GEMINI_MODELS).split(',') : [String(env.GEMINI_MODEL || '')].concat(AI_MODELS);
  const out = [];
  want.map((m) => m.trim()).filter(Boolean).forEach((m) => {
    if (PAID_ONLY.test(m)) { console.log('[gemini] skipped paid-only model', m); return; }
    if (out.indexOf(m) < 0) out.push(m);
  });
  return out.length ? out : AI_MODELS.slice();
}
// Grammar correction does not need long thinking: as little as each model allows (faster, fewer tokens).
// Gemini 3+: Google recommends keeping the default temperature, so it is only lowered for older models.
function genConfig(model, schema, thinking) {
  const gc = { responseMimeType: 'application/json' };
  if (!/^gemini-[3-9]/.test(model)) gc.temperature = 0.2;
  if (schema) gc.responseSchema = schema;
  if (thinking) {
    if (/^gemini-2\.5-flash/.test(model)) gc.thinkingConfig = { thinkingBudget: 0 };
    else if (/^gemini-3\.[89]/.test(model)) gc.thinkingConfig = { thinkingLevel: 'low' }; // 3.8: low is the lowest
    else if (/^gemini-3/.test(model)) gc.thinkingConfig = { thinkingLevel: 'minimal' };
  }
  return gc;
}
async function geminiOnce(env, model, prompt, schema, thinking, ms) {
  const gc = genConfig(model, schema, thinking);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms || AI_TIMEOUT);
  const req = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: gc };
  let r, d;
  try {
    if (env.GEMINI_PROXY_URL) {
      // Relay (gemini-relay.gs on Google Apps Script, runs in the US): it always answers 200 with { status, body } or { relayError }
      r = await fetch(String(env.GEMINI_PROXY_URL).trim(), {
        method: 'POST',
        signal: ctl.signal,
        redirect: 'follow', // Apps Script answers POST with a redirect to the result
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: String(env.GEMINI_PROXY_SECRET || ''), model, body: req }),
      });
      const txt = await r.text().catch(() => '');
      let j = null;
      try { j = JSON.parse(txt); } catch (e) { /* not JSON = wrong URL or the script is not shared with "Anyone" */ }
      if (!r.ok || !j) throw new AiError('relay', 'HTTP ' + r.status + ' ' + txt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
      if (j.relayError) throw new AiError('relay', String(j.relayError).slice(0, 300));
      if (Number(j.status) !== 200) throw new AiError('http' + Number(j.status || 0), String(j.body || '').slice(0, 400));
      try { d = JSON.parse(j.body); } catch (e) { d = null; }
    } else {
      r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) +
          ':generateContent?key=' + encodeURIComponent(env.GEMINI_KEY),
        { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) });
      if (!r.ok) throw new AiError('http' + r.status, (await r.text().catch(() => '')).slice(0, 400));
      d = await r.json().catch(() => null);
    }
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(e && e.name === 'AbortError' ? 'timeout' : 'network', String((e && e.message) || e).slice(0, 200));
  } finally {
    clearTimeout(timer);
  }
  const cand = d && d.candidates && d.candidates[0];
  if (!cand) throw new AiError('blocked', JSON.stringify((d && d.promptFeedback) || d || {}).slice(0, 200));
  const raw = ((cand.content && cand.content.parts) || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
  const fr = String(cand.finishReason || '');
  if (!raw.trim()) throw new AiError(fr === 'MAX_TOKENS' ? 'too_long' : (fr && fr !== 'STOP' ? 'blocked' : 'empty'), fr);
  const out = parseJsonLoose(raw);
  if (!out || typeof out !== 'object') throw new AiError(fr === 'MAX_TOKENS' ? 'too_long' : 'parse', raw.slice(0, 160));
  return out;
}
async function askGemini(env, prompt, schema, shape) {
  if (!aiReady(env)) throw new AiError('nokey', 'GEMINI_KEY / GEMINI_PROXY_URL is not set');
  const models = aiModels(env), t0 = Date.now(), via = env.GEMINI_PROXY_URL ? 'relay' : 'direct', tried = [];
  let last = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (i && Date.now() - t0 > 90000) break; // never start another model after a long wait
    let thinking = true, useSchema = true;
    for (let k = 0; k < 2; k++) {
      try {
        const left = Math.max(20000, AI_TIMEOUT - (Date.now() - t0)); // all models together stay within AI_TIMEOUT
        const out = await geminiOnce(env, model, useSchema ? prompt : prompt + (shape || ''), useSchema ? schema : null, thinking, left);
        return { out, model, via, retried: tried.join(', ') };
      } catch (e) {
        last = e;
        const c = e.code || 'error', det = e.detail || '';
        console.log('[gemini] failed', model, c, det.slice(0, 200));
        tried.push(model + ' ' + c);
        // same model once more: without the thinking setting, or without the schema (JSON shape in the prompt instead)
        if (k === 0 && c === 'http400' && /thinking/i.test(det)) { thinking = false; continue; }
        if (k === 0 && c === 'http400' && /schema|response_schema|responseSchema|Invalid JSON payload|too many states|enum/i.test(det)) { useSchema = false; continue; }
        break;
      }
    }
    // Next model when this one is busy, over its free quota, unknown, or answered badly.
    // Stop at once for problems every model would have: wrong key (403), blocked location / bad key (400), timeout, safety, relay.
    const c = last.code || '', det = last.detail || '';
    const next = /^http(404|429|500|502|503|504)$/.test(c) || ['network', 'empty', 'parse', 'too_long'].indexOf(c) >= 0 ||
      (c === 'http400' && !/location|api[ _]?key/i.test(det));
    if (!next) throw last;
    if (/^http(429|5)/.test(c)) await new Promise((res) => setTimeout(res, 800));
  }
  throw last;
}

// Practice check: one ___ with a (clue) right after it, answers not empty and at most 4 words,
// the clue must not give the answer away (except when the answer is the clue word itself and was already
// in the mistake, e.g. "am disagree" -> "disagree"), and practice[0] filled in must not contain the mistake.
const pNorm = (s) => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
const pHas = (hay, needle) => (' ' + pNorm(hay) + ' ').indexOf(' ' + pNorm(needle) + ' ') >= 0;
function cleanPractice(list, c) {
  if (c.type === 'Off-topic' || !Array.isArray(list)) return [];
  const out = [];
  list.slice(0, 2).forEach((p, i) => {
    let sentence = aiStr(p && p.sentence, 300).replace(/_{3,}/g, '___');
    const answers = (Array.isArray(p && p.answers) ? p.answers : [])
      .map((a) => aiStr(a, 60)).filter((a) => a && a.split(' ').length <= 4)
      .filter((a, j, arr) => arr.indexOf(a) === j).slice(0, 6);
    if (!sentence || sentence.split('___').length !== 2 || !answers.length) return;
    const m = /___\s*\(([^()]{1,60})\)/.exec(sentence);
    if (!m) return;
    const clue = m[1];
    const gives = answers.some((a) => pHas(clue, a) && !(pNorm(clue) === pNorm(a) && pHas(c.original_text, a)));
    if (gives) return;
    if (i === 0) {
      const filled = sentence.replace(/___\s*\([^()]*\)/, answers[0]);
      if (pHas(filled, c.original_text) && pNorm(c.original_text) !== pNorm(answers[0])) return;
    }
    const wc = sentence.replace(/\([^()]*\)/, '').split(/\s+/).filter(Boolean).length;
    if (wc < 4 || wc > 40) return;
    const ct = ['base_form', 'meaning', 'wrong_word'].indexOf(p.clue_type) >= 0 ? p.clue_type : 'base_form';
    out.push({ sentence, answers, clue_type: ct, own: i === 0 });
  });
  return out;
}

// explanation_vi: one short Vietnamese sentence, cut at about 160 characters (on a word boundary)
function viShort(v) {
  const t = aiStr(v, 400);
  if (t.length <= 160) return t;
  const cut = t.slice(0, 158), sp = cut.lastIndexOf(' ');
  return (sp > 100 ? cut.slice(0, sp) : cut).replace(/[,;:\s]+$/, '') + '…';
}

// Do not trust the AI blindly: keep only mistakes found word for word in the essay, sorted by position.
function cleanAi(raw, text, model) {
  const seen = {};
  const corrections = (Array.isArray(raw && raw.corrections) ? raw.corrections : [])
    .map((c) => {
      const type = ['Grammar', 'Vocabulary', 'Off-topic'].indexOf(c && c.type) >= 0 ? c.type : 'Grammar';
      const original = String((c && c.original_text) || '').trim().slice(0, 400);
      const corrected = aiStr(c && c.corrected_text, 400);
      const category = aiStr(c && c.category, 60);
      const pos = original ? text.indexOf(original) : -1;
      if (pos < 0 || !category || seen[original]) return null;
      if (type !== 'Off-topic' && (!corrected || corrected === original)) return null;
      seen[original] = 1;
      const out = {
        original_text: original, corrected_text: corrected,
        category, explanation: aiStr(c.explanation, 300), type, context: sentenceAt(text, pos, original.length), pos,
      };
      out.explanation_vi = viShort(c.explanation_vi) || out.explanation; // Vietnamese for students; English when missing
      out.practice = cleanPractice(c.practice, out);
      return out;
    })
    .filter(Boolean)
    .sort((a, b) => a.pos - b.pos)
    .slice(0, 15)
    .map((c) => { delete c.pos; return c; });
  const vocabulary_upgrades = (Array.isArray(raw && raw.vocabulary_upgrades) ? raw.vocabulary_upgrades : [])
    .map((v) => ({ original: aiStr(v && v.original, 80), upgraded: aiStr(v && v.upgraded, 80), example: aiStr(v && v.example, 240), note: aiStr(v && v.note, 200) }))
    .filter((v) => v.original && v.upgraded && v.original !== v.upgraded)
    .slice(0, 8);
  // attempts.ai = { corrections, vocabulary_upgrades, model, ts } (no summary / improved essay any more)
  return {
    corrections,
    vocabulary_upgrades,
    model,
    ts: Date.now(),
  };
}

// One errors/{slug(email)}_{attemptId}_{i} doc per mistake (repeated mistakes are NOT merged; each has its own boxes).
// The id is fixed per attempt + position, so running again never makes duplicates (existing docs are skipped).
// 2 requests in total: batchGet (which already exist) + one atomic commit.
async function saveErrors(env, att, attemptId, ai, meta) {
  if (!ai.corrections.length) return 0;
  const em = normEmail(att.email), now = Date.now();
  const docBase = 'projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents/errors/';
  const rows = ai.corrections.map((c, i) => ({ id: slug(em) + '_' + attemptId + '_' + i, c }));
  const g = await fs(env, 'POST', ':batchGet', { documents: rows.map((r) => docBase + r.id) });
  if (!g.ok) throw new Error('firestore batchGet ' + g.status);
  const found = {};
  (await g.json()).forEach((x) => { if (x.found) found[x.found.name.split('/').pop()] = 1; });
  const writes = rows.filter((r) => !found[r.id]).map((r) => ({
    update: {
      name: docBase + r.id,
      fields: toFields({
        email: em, student: String(att.student || ''), cls: String(att.cls || ''),
        original: r.c.original_text, corrected: r.c.corrected_text, category: r.c.category,
        explanation: r.c.explanation, explanation_vi: r.c.explanation_vi || r.c.explanation, type: r.c.type, context: r.c.context, practice: r.c.practice || [],
        attemptId, ex: String(att.ex || ''), exTitle: meta.exTitle,
        box: 1, due: meta.dayStart, reviews: 0, lapses: 0, mastered: false, createdAt: now, lastPractice: 0,
      }),
    },
    currentDocument: { exists: false },
  }));
  if (writes.length) {
    const r = await fs(env, 'POST', ':commit', { writes });
    if (!r.ok) throw new Error('firestore commit ' + r.status);
  }
  return rows.length;
}

// Student day from tzo (= getTimezoneOffset() in minutes, Vietnam = -420)
function dayOf(tzoIn) {
  let tzo = Number(tzoIn);
  if (!isFinite(tzo) || Math.abs(tzo) > 840) tzo = -420;
  const day = new Date(Date.now() - tzo * 60000).toISOString().slice(0, 10);
  return { day, dayStart: Date.parse(day + 'T00:00:00Z') + tzo * 60000 };
}

// 502 { error: 'busy', code } + a log line (Cloudflare Pages -> Functions -> Real-time logs)
function aiFail(code, where, detail) {
  console.log('[ai] failed', code, where || '', String(detail || '').slice(0, 300));
  return json({ error: 'busy', code }, 502);
}

async function aiCorrect(env, body) {
  const id = String(body.attemptId || '');
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return fail('This submission was not found.', 404);
  if (!aiReady(env)) return aiFail('nokey', id);
  const doc = await fsGet(env, 'attempts', id);
  if (!doc) return fail('This submission was not found.', 404);
  const att = doc.data, text = String(att.text || '');
  if (att.kind !== 'submission' || !text) return fail('Only Writing submissions can be checked.', 400);
  // already checked: return the saved result, no new Gemini call, no quota used
  if (att.ai && typeof att.ai === 'object' && Array.isArray(att.ai.corrections)) return json({ ai: att.ai, added: (att.ai.corrections || []).length, again: true });
  if (text.trim().length < 8) return fail('Your answer is too short for an AI check.', 400);
  if (text.length > 6000) return fail('Your answer is too long for an AI check (6000 characters at most).', 400);
  if (!(Number(att.ts) > Date.now() - AI_MAX_AGE)) return fail('AI checks are only available within 2 hours of submitting.', 400);
  const em = normEmail(att.email);
  if (!emailOk(em)) return fail('This submission was not found.', 404);
  // 'pending:<ts>' = a check is running. Older than 6 minutes (longer than the 5-minute Gemini limit) = that request died: run again.
  const lock = String((await env.MD_KV.get('ai:' + id)) || '');
  if (/^pending/.test(lock) && Date.now() - Number(lock.split(':')[1] || 0) < 360000) return fail('Your writing is already being checked. Wait a few seconds.', 409);
  const { day, dayStart } = dayOf(body.tzo);
  const limit = Math.max(1, parseInt(env.AI_DAILY_LIMIT || '10', 10) || 10);
  const qKey = 'aiq:' + em + ':' + day;
  if ((await count(env, qKey)) >= limit) return fail("You have used today's AI checks. Try again tomorrow.", 429);
  await env.MD_KV.put('ai:' + id, 'pending:' + Date.now(), { expirationTtl: 172800 });
  let ai;
  try {
    const task = String(body.task || '').slice(0, 1500);
    const g = await askGemini(env, AI_PROMPT + '\nTASK:\n' + (task || '(not given)') + '\n\nSTUDENT ESSAY:\n' + text, AI_SCHEMA, AI_SHAPE);
    ai = cleanAi(g.out, text, g.model);
  } catch (e) {
    await env.MD_KV.delete('ai:' + id); // a failed call may be tried again
    return aiFail(e.code || 'error', id, e.detail || e.message);
  }
  const fixes = ai.corrections.filter((c) => c.type !== 'Off-topic')
    .map((c) => ({ from: c.original_text, to: c.corrected_text, type: c.type, why: c.explanation }));
  if (!(await fsUpdate(env, 'attempts', id, { ai, fixes }))) {
    await env.MD_KV.delete('ai:' + id);
    return aiFail('save', id, 'attempts update failed');
  }
  await env.MD_KV.put('ai:' + id, 'done', { expirationTtl: 172800 });
  await bump(env, qKey, 172800);
  let added = 0;
  try { added = await saveErrors(env, att, id, ai, { dayStart, exTitle: aiStr(body.exTitle, 120) }); } catch (e) { added = 0; }
  return json({ ai, added });
}

// POST /api/ai/practice { errorId, tzo }: makes the 2 practice items for a mistake saved before practice existed.
// Same simple check as /api/ai/correct: the errors doc must exist. KV aipq:<email>:<day>, 50 a day.
const PRACTICE_PROMPT =
  'You write fill-in-the-blank practice for one IELTS student mistake. Return JSON that matches the schema.\n' + AI_PRACTICE_RULES;
const PRACTICE_SCHEMA = { type: 'OBJECT', properties: { practice: AI_PRACTICE_ITEMS }, required: ['practice'] };
async function aiPractice(env, body) {
  const id = String(body.errorId || '');
  if (!/^[A-Za-z0-9_-]{5,200}$/.test(id)) return fail('This mistake was not found.', 404);
  const doc = await fsGet(env, 'errors', id);
  if (!doc) return fail('This mistake was not found.', 404);
  const e = doc.data;
  if (Array.isArray(e.practice) && e.practice.length) return json({ practice: e.practice, again: true });
  if (e.type === 'Off-topic') return json({ practice: [] });
  if (!aiReady(env)) return aiFail('nokey', id);
  const em = normEmail(e.email);
  if (!emailOk(em)) return fail('This mistake was not found.', 404);
  const qKey = 'aipq:' + em + ':' + dayOf(body.tzo).day;
  if ((await count(env, qKey)) >= 50) return fail("You have used today's AI exercises. Try again tomorrow.", 429);
  const c = { original_text: String(e.original || ''), corrected_text: String(e.corrected || ''), type: String(e.type || 'Grammar') };
  let practice;
  try {
    const g = await askGemini(env, PRACTICE_PROMPT + '\nMISTAKE:\n' + JSON.stringify({
      original_text: c.original_text, corrected_text: c.corrected_text, category: String(e.category || ''),
      explanation: String(e.explanation || ''), context: String(e.context || ''),
    }), PRACTICE_SCHEMA, PRACTICE_SHAPE);
    practice = cleanPractice(g.out && g.out.practice, c);
  } catch (err) {
    return aiFail(err.code || 'error', id, err.detail || err.message);
  }
  await bump(env, qKey, 172800);
  if (!practice.length) return json({ practice: [] });
  await fsUpdate(env, 'errors', id, { practice });
  return json({ practice });
}

// POST /api/admin/aitest { text, task }: the admin checks any essay with the real AI (same prompt, schema and filter
// as /api/ai/correct). Nothing is saved, no student quota is used. KV aitest:<day>, 200 a day.
const AI_WHY = {
  nokey: 'GEMINI_KEY is not set on Cloudflare, or the site was not deployed again after adding it.',
  timeout: 'Gemini did not answer within 5 minutes. Try again in a few minutes.',
  network: 'The server could not reach Gemini. Try again.',
  http400: 'Gemini rejected the request: a wrong GEMINI_KEY, a model that does not support these settings, or "User location is not supported" (Cloudflare runs in a blocked region: set up the Apps Script relay, README 3e).',
  relay: 'The Apps Script relay failed: check GEMINI_PROXY_URL (the /exec link), GEMINI_PROXY_SECRET = RELAY_SECRET in the script, and that the web app is deployed for "Anyone".',
  http403: 'The key is not allowed: check GEMINI_KEY (Google AI Studio) and that the Gemini API is enabled.',
  http404: 'Model not found or not available to this key: check GEMINI_MODELS (default gemini-3.8-flash, gemini-3.6-flash, gemini-3.5-flash-lite).',
  http429: 'The free Gemini quota of every model in the list is used up for now. Wait a minute (per-minute limit) or until tomorrow (daily limit).',
  http5xx: 'Every Gemini model in the list is busy right now. Try again in a few minutes.',
  blocked: 'Gemini refused to answer this text (safety filter).',
  empty: 'Gemini returned an empty answer. Try again.',
  too_long: 'The answer was cut off (too long). Try a shorter essay.',
  parse: 'Gemini returned something that is not JSON. Try again.',
};
async function adminAiTest(env, body) {
  const text = String(body.text || '');
  if (text.trim().length < 8) return fail('Paste an essay first (at least a few words).');
  if (text.length > 6000) return fail('The essay is too long (6000 characters at most).');
  if (!aiReady(env)) return fail('GEMINI_KEY (or GEMINI_PROXY_URL) is not set on Cloudflare (Settings → Variables and Secrets), or the site was not deployed again after adding it.');
  const qKey = 'aitest:' + new Date().toISOString().slice(0, 10);
  if ((await count(env, qKey)) >= 200) return fail('AI test limit reached for today (200).', 429);
  const task = String(body.task || '').slice(0, 1500), t0 = Date.now();
  let g;
  try {
    g = await askGemini(env, AI_PROMPT + '\nTASK:\n' + (task || '(not given)') + '\n\nSTUDENT ESSAY:\n' + text, AI_SCHEMA, AI_SHAPE);
  } catch (e) {
    const c = e.code || 'error', why = AI_WHY[c] || AI_WHY[c.replace(/\d+$/, (n) => n[0] + 'xx')] || '';
    console.log('[ai] admin test failed', c, String(e.detail || e.message || '').slice(0, 300));
    return json({ error: 'Gemini failed (code: ' + c + '). ' + why + (e.detail ? ' Details: ' + String(e.detail).slice(0, 300) : ''), code: c }, 502);
  }
  await bump(env, qKey, 172800);
  const ai = cleanAi(g.out, text, g.model);
  const raw = Array.isArray(g.out && g.out.corrections) ? g.out.corrections : [];
  const kept = {};
  ai.corrections.forEach((c) => { kept[c.original_text] = 1; });
  const dropped = raw.map((c) => String((c && c.original_text) || '')).filter((o) => o && !kept[o.trim()]).slice(0, 10);
  return json({ ai, ms: Date.now() - t0, model: g.model + (g.via === 'relay' ? ' via Apps Script relay' : ' direct'), raw: raw.length, dropped });
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  try {
    if (!env.MD_KV || !env.FIREBASE_PROJECT_ID || !env.FIREBASE_PRIVATE_KEY) return fail('Server is not configured yet.', 500);
    if (route === 'names' && request.method === 'GET') return json(await listNames(env));
    if (route === 'status' && request.method === 'GET') {
      const em = normEmail(url.searchParams.get('em'));
      const s = emailOk(em) ? await offState(env, em) : '';
      const st = {}; st[s || 'ok'] = true; // { ok } | { off } | { moved } | { kicked }
      return json(st);
    }
    if (request.method !== 'POST') return fail('Not found.', 404);
    let body = {};
    try { body = await request.json(); } catch (e) { return fail('Bad request.'); }
    const ip = request.headers.get('CF-Connecting-IP') || 'x';
    if (route === 'login') return await login(env, body);
    if (route === 'register') return await register(env, body, ip);
    if (route === 'reset') return await resetPassword(env, body);
    if (route === 'admin/unlock') return await adminUnlock(env, body);
    if (route === 'ai/correct') return await aiCorrect(env, body);
    if (route === 'ai/practice') return await aiPractice(env, body);
    if (route.indexOf('admin/') === 0) {
      if (!(await adminKeyOk(env, request))) {
        return json({ error: 'Your admin session ended. Enter your admin password to continue.', needUnlock: true }, 401);
      }
      if (route === 'admin/users') return await adminUsers(env);
      if (route === 'admin/password') return await adminPassword(env, body);
      if (route === 'admin/active') return await adminActive(env, body);
      if (route === 'admin/teachers') return await adminTeachers(env, body);
      if (route === 'admin/sheet') return await adminSheet(env, body);
      if (route === 'admin/class') return await adminClass(env, body);
      if (route === 'admin/kick') return await adminKick(env, body);
      if (route === 'admin/aitest') return await adminAiTest(env, body);
    }
    return fail('Not found.', 404);
  } catch (e) {
    console.log('[api] server error', route, String((e && e.stack) || e).slice(0, 500));
    return json({ error: 'Server error. Try again.', code: 'server' }, 500);
  }
}
