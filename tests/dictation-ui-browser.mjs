// DEV-ONLY real-browser test of the PRODUCT Dictation UI (dictation/ui.js, the file the site loads) against the real server part
// (dictation-server.js) with an in-memory Firestore. Not part of the deployed site. Chrome/Edge headless, no npm packages.
// Usage: node tests/dictation-ui-browser.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe"
// Every response the server sends to the page is logged; before the accepted submission none may contain an answer (AS-027).
import { createServer } from "node:http"; import { readFile, mkdtemp, rm } from "node:fs/promises"; import { readFileSync } from "node:fs";
import { execFile, spawnSync } from "node:child_process"; import { tmpdir } from "node:os"; import { dirname, join, extname } from "node:path"; import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), ".."); const browser = process.argv[2]; if (!browser) { console.error("usage: node tests/dictation-ui-browser.mjs CHROME"); process.exit(2); }
const S = await import(pathToFileURL(join(ROOT, "dictation-server.js")).href); const E = await import(pathToFileURL(join(ROOT, "dictation", "engine", "index.js")).href);
const BASE = readFileSync(join(ROOT, "dictation-lab", "pkg", "golden-tests-v1.1", "baseline-harbour-museum.rev1.json"), "utf8");
// in-memory Firestore with the [[path]].js helper signatures
const db = {}; let tick = 0; const col = (c) => (db[c] = db[c] || {}); const cp = (o) => JSON.parse(JSON.stringify(o));
const D = { fsGet: async (e, c, id) => (col(c)[id] ? { data: cp(col(c)[id].data), updateTime: col(c)[id].ut } : null), fsPut: async (e, c, id, o) => { col(c)[id] = { data: cp(o), ut: "u" + ++tick }; },
  fsCreate: async (e, c, id, o) => { if (col(c)[id]) return false; col(c)[id] = { data: cp(o), ut: "u" + ++tick }; return true; }, fsUpdate: async (e, c, id, o, ut) => { const d = col(c)[id]; if (ut && (!d || d.ut !== ut)) return false; col(c)[id] = { data: Object.assign(d ? d.data : {}, cp(o)), ut: "u" + ++tick }; return true; },
  fsDelete: async (e, c, id) => { delete col(c)[id]; }, fsList: async (e, c) => Object.entries(col(c)).map(([id, d]) => Object.assign({ id }, d.data)), fsQueryDocs: async (e, c, f, v) => Object.entries(col(c)).filter(([, d]) => d.data[f] === v).map(([id, d]) => Object.assign({ id }, d.data)),
  idUser: async (e, r) => r.user || null, staffEmail: async (e, r) => (r.staff ? "admin@x.test" : ""), rosterRow: async (e, em) => (col("roster")[em] ? { id: em, data: col("roster")[em].data } : null),
  normEmail: (x) => String(x || "").trim().toLowerCase(), slug: (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), json: (data, status) => ({ status: status || 200, data }), fail: (msg, status) => ({ status: status || 400, data: { error: msg } }), adminEmail: () => "admin@x.test" };
await D.fsPut(null, "roster", "stu@x.test", { email: "stu@x.test", name: "Stu", cls: "C1" });
const sv = await S.dlStaff(D, null, { staff: true }, { op: "save", json: BASE }); await S.dlAdmin(D, null, { op: "approve", lid: sv.data.lid, n: 1, mode: "homework" });
const pub = await S.dlAdmin(D, null, { op: "publish", lid: sv.data.lid, bookId: "cam21", testId: "t4", part: 1 }); const exId = pub.data.exId;
await D.fsPut(null, "assignments", "A1", { cls: "C1", start: Date.now() - 3600e3, due: Date.now() + 864e5, ex: ["c_" + exId] });
const HOSTILE = '<img src=x onerror="window.__pwned=1">';
const log = []; const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
async function api(route, body) {
  const stu = { user: { em: "stu@x.test", role: "student" } };
  if (route === "dictation/staff") return S.dlStaff(D, null, { staff: true }, body);
  if (route === "admin/dictation") return S.dlAdmin(D, null, body);
  if (route === "dictation/practice") return S.dlPractice(D, null, body.as === "teacher" ? { user: { em: "t@x.test", role: "teacher" } } : stu, body);
  const m = /^dictation\/(payload|lock|submit)$/.exec(route); if (m) { const r = await S.dlHomework(D, null, stu, body, m[1]); const it = r.data?.payload?.items?.find((i) => i.prompt); if (it) it.prompt = HOSTILE + " " + it.prompt; return r; }
  return { status: 404, data: { error: "Not found." } };
}
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Dictation UI test</title></head><body><div id="p"></div><div id="h"></div><div id="a"></div><script type="module">
const out = {}; const ask = (o) => { (window.__asks = window.__asks || []).push(o.title); setTimeout(() => o.onOk && o.onOk(), 0); };
const post = async (path, body) => { const r = await fetch("/api/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }); const d = await r.json(); d._ok = r.ok; d._status = r.status; return d; };
const okOr = async (path, body) => { const d = await post(path, body); if (!d._ok) throw new Error(d.error || "error"); return d; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const txt = (el) => el.textContent;
try {
  await import("/dictation/bridge.js?v=t"); const M = window.MD_DL;
  // 1. practice (teacher preview path gives the lesson; the student path for this homework lesson is refused before submission)
  const deny = await post("dictation/practice", { exId: "${exId}" }); out.practiceDeniedBeforeSubmit = deny._status === 403;
  const d = await okOr("dictation/practice", { exId: "${exId}", as: "teacher" }); const doc = JSON.parse(d.json); const P = document.getElementById("p");
  M.mountPractice(P, { doc, validation: M.validateDoc(doc), version: d.version, seed: d.seed, audio: "" });
  out.noHintReveal = !/\\b(hint|reveal|show answer)\\b/i.test(txt(P)) && ![...P.querySelectorAll("button")].some((b) => /hint|reveal|show answer/i.test(b.textContent));
  const card = () => P.querySelector('[data-dl-item="l3-002"]'); const check = () => [...card().querySelectorAll("button")].find((b) => b.textContent === "Check");
  out.reviewBeforeCheck = ![...card().querySelectorAll("button")].some((b) => b.textContent === "Review");
  card().querySelector("textarea").value = " ,, "; card().querySelector("textarea").dispatchEvent(new Event("input")); check().click(); await wait(50);
  out.emptyCheckMessage = /does not count/.test(txt(card())) && ![...card().querySelectorAll("button")].some((b) => b.textContent === "Review");
  card().querySelector("textarea").value = "we are always looking"; card().querySelector("textarea").dispatchEvent(new Event("input")); check().click(); await wait(50);
  out.feedback = /Not fully correct yet\\. 4 of 7 words/.test(txt(card()));
  [...card().querySelectorAll("button")].find((b) => b.textContent === "Review").click(); await wait(50); out.reviewAfterCheck = /We.re always looking for new helpers/.test(txt(card()));
  out.lockedL1 = /answer these first/.test(txt(P.querySelector('[data-dl-item="l1-003"]')));
  // 2. homework: payload only, hostile prompt rendered as text, blank warning, phase 2, submit, official result
  const H = document.getElementById("h"); window.__api = post;
  await M.mountHomework(H, { api: (p, b) => post(p, b), exId: "${exId}", asgId: "A1", audio: "", email: "stu@x.test", ask });
  out.hostileAsText = txt(H).includes("<img src=x") && !H.querySelector("img") && !window.__pwned;
  out.noCheckInHomework = ![...H.querySelectorAll("button")].some((b) => b.textContent === "Check");
  const ta = [...H.querySelectorAll("textarea")][0]; ta.value = "something i heard"; ta.dispatchEvent(new Event("input"));
  const go = () => [...H.querySelectorAll("button")].find((b) => /Save part 1|Submit homework/.test(b.textContent));
  go().click(); await wait(400); out.phase2 = /Part 2 of 2/.test(txt(H));
  go().click(); await wait(600); out.blankWarningAsked = (window.__asks || []).some((t) => /blank answer/.test(t));
  out.resultShown = /Not passed/.test(txt(H)) && /Incomplete/.test(txt(H)) && /official result/.test(txt(H));
  // 3. authoring: transcript -> check -> preview -> save -> list
  const A = document.getElementById("a"); M.mountAuthor(A, { staffApi: (p, b) => okOr(p, b), adminApi: (p, b) => okOr(p, b), uploadAudio: async () => ({ url: "" }), getSlot: () => ({ book: "cam21", test: "t4", part: 2, label: "Cam 21 · Test 4 · Part 2" }), ask, toast: () => {} });
  A.querySelector("textarea").value = "ANNA: Hello, is this the sports centre? I want to book a court (Q1).\\n\\nTOM: Sure. Courts cost twelve pounds an hour."; A.querySelector("input[type=text]").value = "Sports centre";
  [...A.querySelectorAll("button")].find((b) => b.textContent === "Check").click(); await wait(50); out.authorValidUnaudited = /not teacher-audited: Free Practice only/.test(txt(A));
  [...A.querySelectorAll("button")].find((b) => b.textContent === "Preview as a student").click(); await wait(50); out.authorPreview = /Teacher preview/.test(txt(A));
  [...A.querySelectorAll("button")].find((b) => /Save lesson/.test(b.textContent)).click(); await wait(400); out.authorSaved = /Saved version 1/.test(txt(A)) && /Sports centre/.test(txt(A));
  const hwBtn = [...A.querySelectorAll("button")].filter((b) => b.textContent === "Approve for homework"); out.authorHomeworkBlockedForUnaudited = hwBtn.some((b) => b.disabled);
  out.nodeGlobals = typeof process === "undefined";
} catch (e) { out.error = String(e && e.stack || e); }
const pre = document.createElement("pre"); pre.id = "selftest"; pre.textContent = JSON.stringify(out); document.body.append(pre);
</script></body></html>`;
let phase = "before";
const srv = createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"); const send = (code, type, body) => { log.push({ path: u.pathname, phase, body: String(body) }); res.writeHead(code, { "content-type": type }).end(body); };
  if (u.pathname === "/test.html") return send(200, "text/html", PAGE);
  if (u.pathname.startsWith("/api/")) { let b = ""; for await (const c of req) b += c; const r = await api(u.pathname.slice(5), JSON.parse(b || "{}")); const body = JSON.stringify(r.data); const ph = phase; if (r.data?.status === "accepted") phase = "after"; log.push({ path: u.pathname, phase: ph, body }); res.writeHead(r.status, { "content-type": "application/json" }).end(body); return; }
  const parts = decodeURIComponent(u.pathname).split("/").filter(Boolean); if (parts[0] !== "dictation" || parts.some((s) => s === ".." || s.includes("\\"))) return send(404, "text/plain", "");
  try { send(200, TYPES[extname(u.pathname)] || "text/plain", await readFile(join(ROOT, ...parts))); } catch { send(404, "text/plain", ""); }
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const prof = await mkdtemp(join(tmpdir(), "dl-ui-"));
const html = await new Promise((ok) => execFile(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--user-data-dir=" + prof, "--virtual-time-budget=20000", "--dump-dom", "http://127.0.0.1:" + srv.address().port + "/test.html"], { encoding: "utf8", timeout: 120000, maxBuffer: 1 << 26 }, (e, so) => ok(so || "")));
const m = /<pre id="selftest">([^<]*)<\/pre>/.exec(html); let r = null; try { r = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")); } catch {}
// network scan: before the accepted submission, no homework response may carry a sentence, an answer or an accepted form
const doc = JSON.parse(BASE); const ref = E.createRun({ doc, unsafeSkipValidation: true, version: "x", seed: 1 }); const full = new Set(doc.transcript.sentences.filter((s) => s.cleanText.length > 15).map((s) => s.cleanText));
for (const it of doc.exercises.answerSpotter.items) if (it.explanation) full.add(it.explanation);
const strs = (o, out = []) => { if (typeof o === "string") out.push(o); else if (o && typeof o === "object") for (const v of Object.values(o)) strs(v, out); return out; };
const has = (list, a) => { const t = E.tokenize(a); return t.length > 0 && list.some((x) => { const b = E.tokenize(x); for (let i = 0; i + t.length <= b.length; i++) if (t.every((w, k) => b[i + k] === w)) return true; return false; }); };
// "locked" is decided HERE (never trusted from the response): the phase-1 lock ids, and only from the first /lock response on
const lockIds = new Set(E.phaseLockIds({ doc, unsafeSkipValidation: true, version: "x", seed: 1 })); let lockSeen = false;
const hw = log.filter((x) => /\/api\/dictation\/(payload|lock|submit)/.test(x.path) && x.phase === "before"); const leaks = [];
for (const x of hw) { let j = {}; try { j = JSON.parse(x.body); } catch {} if (j.status === "accepted" || j.status === "duplicate") continue; // the accepted submission carries the review by design
  if (x.path.endsWith("/lock")) lockSeen = true; const all = strs(j); const locked = lockSeen ? lockIds : new Set();
  for (const sec of full) if (x.body.includes(sec)) leaks.push(x.path + " sentence: " + sec.slice(0, 30));
  for (const y of ref.typedAS) if (!locked.has(y)) for (const a of ref.answersOf(y)) if (has(all, a)) leaks.push(x.path + " answer of " + y + ": " + a); }
const checks = r ? Object.entries(r).filter(([k]) => k !== "error") : []; const bad = checks.filter(([, v]) => v !== true).map(([k]) => k);
for (const [k, v] of checks) console.log((v === true ? "PASS " : "FAIL ") + k); if (r?.error) console.log("FAIL page error: " + r.error.slice(0, 400)); if (!r) console.log("FAIL no output from the page");
console.log((leaks.length ? "FAIL" : "PASS") + " homework network scan: " + hw.length + " responses before the accepted submission, " + leaks.length + " answer leaks " + leaks.slice(0, 3).join("; "));
console.log("browser: " + spawnSync(browser, ["--version"], { encoding: "utf8" }).stdout.trim());
srv.close(); await rm(prof, { recursive: true, force: true }).catch(() => {}); process.exit(!r || r.error || bad.length || leaks.length || !hw.length ? 1 : 0);
