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
//   GEMINI_MODEL           text    optional, default gemini-2.5-flash
//   AI_DAILY_LIMIT         text    optional, AI checks per student per day, default 10
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
//   ai:<attemptId> 'pending' | 'done', 2 days    one AI check per Writing submission
//   aiq:<email>:<day>  AI checks used that day

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
    r.status = !off || off === 'kicked' ? 'active' : off.indexOf('moved:') === 0 ? 'moved' : 'paused';
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
  } else if (!(await roleOf(env, email))) {
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

// Kick a student: delete the account (password, class-list entry) and free their name, so they must register again.
// Learning data (attempts, XP, flashcards…) is kept: registering again with the same email brings it back.
async function adminKick(env, body) {
  const email = normEmail(body.email);
  if (!emailOk(email)) return fail('Enter a valid email.');
  if (email === adminEmail(env)) return fail('The admin account cannot be kicked.', 403);
  const row = await fsGet(env, 'roster', email);
  if (!row || row.data.role === 'teacher') return fail('Only students can be kicked. To remove a teacher, use the Teachers tab.', 404);
  // free the name: Sheet claims (have sid) are deleted, old CSV names are marked unclaimed again
  const names = (await fsList(env, 'names')).filter((n) => normEmail(n.email) === email);
  for (const n of names) {
    if (n.sid) await fsDelete(env, 'names', n.id);
    else await fsUpdate(env, 'names', n.id, { claimed: false, email: '' });
  }
  await fsDelete(env, 'roster', email);
  await env.MD_KV.delete('acct:' + email);
  await env.MD_KV.delete('rl:' + email);
  await env.MD_KV.put('off:' + email, 'kicked'); // open devices are signed out by /api/status
  return json({ ok: true });
}

// Move a registered student to another class (the Sheet only matters before sign-up).
async function adminClass(env, body) {
  const email = normEmail(body.email), cls = classLabel(String(body.cls || '').slice(0, 60)), course = String(body.course || '').trim().slice(0, 60);
  if (!cls) return fail('Choose a class.');
  const row = await fsGet(env, 'roster', email);
  if (!row || row.data.role === 'teacher') return fail('This student was not found.', 404);
  if (!(await fsUpdate(env, 'roster', email, { cls, course }))) return fail('Could not save. Try again.', 500);
  return json({ ok: true, cls });
}

/* ---------- AI writing correction (Gemini) ---------- */
// POST /api/ai/correct { attemptId, task, exTitle, tzo }. No session: the attempt must exist in Firestore
// (only a signed-in student can create one), be a Writing submission, and be less than 2 hours old.
// KV ai:<attemptId> = 'pending' | 'done' (2 days): one AI check per attempt.
// KV aiq:<email>:<YYYY-MM-DD> = checks used today (limit AI_DAILY_LIMIT, default 10).
const AI_PROMPT =
  'You are an IELTS Writing examiner and tutor. Read the task and the student essay below and return JSON that matches the schema.\n' +
  'Rules:\n' +
  '- corrections: real mistakes only. Never invent mistakes. If the essay has no mistakes, return "corrections": [].\n' +
  '- original_text must be copied EXACTLY from the essay (same spelling, case and punctuation), as short as possible but long enough to be found in the essay.\n' +
  '- corrected_text is the fixed words. Two good options may be written as "wrote / was writing". For an Off-topic sentence, corrected_text may be "".\n' +
  '- category is a short error-notebook label, for example: Stative Verbs, Gerund as Subject & Articles, Irregular Plural Nouns, Subject-Verb Agreement, Verb Tense, Articles, Prepositions, Collocation, Word Form, Spelling, Punctuation, Off-topic.\n' +
  '- type: "Grammar" (includes punctuation), "Vocabulary" (word choice, collocation, spelling) or "Off-topic" (a sentence that does not answer the task).\n' +
  '- explanation: one short sentence in simple English.\n' +
  '- At most 15 corrections, most important first.\n' +
  '- vocabulary_upgrades: up to 6 simple words or phrases from the essay and a better IELTS alternative, with a short example sentence and a short note.\n' +
  '- summary.grammar_band_est looks like "Band 6.0". summary.topic_relevance is High, Medium or Low. summary.general_feedback: 2-4 short sentences in VIETNAMESE.\n' +
  '- improved_essay: the essay corrected and slightly improved, keeping the student\'s ideas and structure.\n';
const AI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: {
      type: 'OBJECT',
      properties: {
        word_count: { type: 'NUMBER' },
        grammar_band_est: { type: 'STRING' },
        topic_relevance: { type: 'STRING', enum: ['High', 'Medium', 'Low'] },
        general_feedback: { type: 'STRING' },
      },
      required: ['grammar_band_est', 'topic_relevance', 'general_feedback'],
    },
    corrections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          original_text: { type: 'STRING' },
          corrected_text: { type: 'STRING' },
          category: { type: 'STRING' },
          explanation: { type: 'STRING' },
          type: { type: 'STRING', enum: ['Grammar', 'Vocabulary', 'Off-topic'] },
        },
        required: ['original_text', 'corrected_text', 'category', 'explanation', 'type'],
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
    improved_essay: { type: 'STRING' },
  },
  required: ['summary', 'corrections', 'vocabulary_upgrades', 'improved_essay'],
};
const AI_MAX_AGE = 2 * 3600 * 1000;
const aiStr = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
const wordCountOf = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length; // same as wordCount() in the app
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

async function askGemini(env, task, text) {
  const model = String(env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) +
        ':generateContent?key=' + encodeURIComponent(env.GEMINI_KEY),
      {
        method: 'POST',
        signal: ctl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: AI_PROMPT + '\nTASK:\n' + (task || '(not given)') + '\n\nSTUDENT ESSAY:\n' + text }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: AI_SCHEMA },
        }),
      });
    if (!r.ok) throw new Error('gemini ' + r.status);
    const d = await r.json();
    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const raw = parts.map((p) => p.text || '').join('');
    return { out: JSON.parse(raw), model };
  } finally {
    clearTimeout(timer);
  }
}

// Do not trust the AI blindly: keep only mistakes found word for word in the essay, sorted by position.
function cleanAi(raw, text, model) {
  const s = (raw && raw.summary) || {};
  const rel = ['High', 'Medium', 'Low'].indexOf(s.topic_relevance) >= 0 ? s.topic_relevance : 'Medium';
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
      return {
        original_text: original, corrected_text: corrected,
        category, explanation: aiStr(c.explanation, 300), type, context: sentenceAt(text, pos, original.length), pos,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.pos - b.pos)
    .slice(0, 15)
    .map((c) => { delete c.pos; return c; });
  const vocabulary_upgrades = (Array.isArray(raw && raw.vocabulary_upgrades) ? raw.vocabulary_upgrades : [])
    .map((v) => ({ original: aiStr(v && v.original, 80), upgraded: aiStr(v && v.upgraded, 80), example: aiStr(v && v.example, 240), note: aiStr(v && v.note, 200) }))
    .filter((v) => v.original && v.upgraded && v.original !== v.upgraded)
    .slice(0, 8);
  return {
    summary: {
      word_count: wordCountOf(text),
      grammar_band_est: aiStr(s.grammar_band_est, 20) || 'Band ?',
      topic_relevance: rel,
      general_feedback: aiStr(s.general_feedback, 800),
    },
    corrections,
    vocabulary_upgrades,
    improved_essay: String((raw && raw.improved_essay) || '').trim().slice(0, 8000),
    model,
    ts: Date.now(),
  };
}

// One errors/{slug(email)}_{hash} doc per mistake. Seen again -> count + 1 and back to box 1 (no duplicate).
// 2 requests in total: batchGet (which already exist) + one atomic commit.
async function saveErrors(env, att, attemptId, ai, meta) {
  if (!ai.corrections.length) return 0;
  const em = normEmail(att.email), today = meta.dayStart, now = Date.now();
  const docBase = 'projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents/errors/';
  const rows = [], ids = {};
  for (const c of ai.corrections) {
    const h = (await sha256Hex(c.original_text.toLowerCase() + '|' + c.corrected_text.toLowerCase())).slice(0, 12);
    const id = slug(em) + '_' + h;
    if (ids[id]) continue;
    ids[id] = 1;
    rows.push({ id, c });
  }
  const g = await fs(env, 'POST', ':batchGet', { documents: rows.map((r) => docBase + r.id) });
  if (!g.ok) throw new Error('firestore batchGet ' + g.status);
  const found = {};
  (await g.json()).forEach((x) => { if (x.found) found[x.found.name.split('/').pop()] = 1; });
  const writes = rows.map((r) => {
    const content = {
      email: em, student: String(att.student || ''), cls: String(att.cls || ''),
      original: r.c.original_text, corrected: r.c.corrected_text, category: r.c.category,
      explanation: r.c.explanation, type: r.c.type, context: r.c.context,
      attemptId, ex: String(att.ex || ''), exTitle: meta.exTitle,
      box: 1, due: today, mastered: false, lastSeen: now,
    };
    if (found[r.id]) {
      return {
        update: { name: docBase + r.id, fields: toFields(content) },
        updateMask: { fieldPaths: Object.keys(content) },
        updateTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }],
        currentDocument: { exists: true },
      };
    }
    const full = Object.assign(content, { reviews: 0, lapses: 0, count: 1, createdAt: now, lastPractice: 0 });
    return { update: { name: docBase + r.id, fields: toFields(full) }, currentDocument: { exists: false } };
  });
  const r = await fs(env, 'POST', ':commit', { writes });
  if (!r.ok) throw new Error('firestore commit ' + r.status);
  return rows.length;
}

async function aiCorrect(env, body) {
  const id = String(body.attemptId || '');
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return fail('This submission was not found.', 404);
  if (!env.GEMINI_KEY) return fail('busy', 502);
  const doc = await fsGet(env, 'attempts', id);
  if (!doc) return fail('This submission was not found.', 404);
  const att = doc.data, text = String(att.text || '');
  if (att.kind !== 'submission' || !text) return fail('Only Writing submissions can be checked.', 400);
  // already checked: return the saved result, no new Gemini call, no quota used
  if (att.ai && typeof att.ai === 'object' && att.ai.summary) return json({ ai: att.ai, added: (att.ai.corrections || []).length, again: true });
  if (text.trim().length < 8) return fail('Your answer is too short for an AI check.', 400);
  if (text.length > 6000) return fail('Your answer is too long for an AI check (6000 characters at most).', 400);
  if (!(Number(att.ts) > Date.now() - AI_MAX_AGE)) return fail('AI checks are only available within 2 hours of submitting.', 400);
  const em = normEmail(att.email);
  if (!emailOk(em)) return fail('This submission was not found.', 404);
  const lock = await env.MD_KV.get('ai:' + id);
  if (lock === 'pending') return fail('Your writing is already being checked. Wait a few seconds.', 409);
  if (lock === 'done') return fail('busy', 502); // marked done but the result was not saved
  // day of the student (tzo = getTimezoneOffset() in minutes, Vietnam = -420)
  let tzo = Number(body.tzo);
  if (!isFinite(tzo) || Math.abs(tzo) > 840) tzo = -420;
  const local = Date.now() - tzo * 60000, day = new Date(local).toISOString().slice(0, 10);
  const dayStart = Date.parse(day + 'T00:00:00Z') + tzo * 60000;
  const limit = Math.max(1, parseInt(env.AI_DAILY_LIMIT || '10', 10) || 10);
  const qKey = 'aiq:' + em + ':' + day;
  if ((await count(env, qKey)) >= limit) return fail("You have used today's AI checks. Try again tomorrow.", 429);
  await env.MD_KV.put('ai:' + id, 'pending', { expirationTtl: 172800 });
  let ai;
  try {
    const g = await askGemini(env, String(body.task || '').slice(0, 1500), text);
    ai = cleanAi(g.out, text, g.model);
  } catch (e) {
    await env.MD_KV.delete('ai:' + id); // a failed call may be tried again
    return fail('busy', 502);
  }
  const fixes = ai.corrections.filter((c) => c.type !== 'Off-topic')
    .map((c) => ({ from: c.original_text, to: c.corrected_text, type: c.type, why: c.explanation }));
  if (!(await fsUpdate(env, 'attempts', id, { ai, fixes }))) {
    await env.MD_KV.delete('ai:' + id);
    return fail('busy', 502);
  }
  await env.MD_KV.put('ai:' + id, 'done', { expirationTtl: 172800 });
  await bump(env, qKey, 172800);
  let added = 0;
  try { added = await saveErrors(env, att, id, ai, { dayStart, exTitle: aiStr(body.exTitle, 120) }); } catch (e) { added = 0; }
  return json({ ai, added });
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
    }
    return fail('Not found.', 404);
  } catch (e) {
    return fail('Server error. Try again.', 500);
  }
}
