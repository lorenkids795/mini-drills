// DEV-ONLY real-browser test of the Dictation modules the site loads (dictation/ui.js author + audio player, dictation/script.js)
// against the real server part (dictation-server.js) with an in-memory Firestore, "write the script" flow (11/2026). Not deployed.
// Usage: node tests/dictation-ui-browser.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe"
// Every response the server sends to the page is logged; before the accepted submission none may contain the script.
import { createServer } from "node:http"; import { readFile, mkdtemp, rm } from "node:fs/promises";
import { execFile, spawnSync } from "node:child_process"; import { tmpdir } from "node:os"; import { dirname, join, extname } from "node:path"; import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), ".."); const browser = process.argv[2]; if (!browser) { console.error("usage: node tests/dictation-ui-browser.mjs CHROME"); process.exit(2); }
const S = await import(pathToFileURL(join(ROOT, "dictation-server.js")).href);
const SCRIPT = "ANNA: Hello, I would like to join the photography club.\n\nTOM: Great. We meet on Thursday evenings at seven o'clock, and new members get a free map of the city.";
const SECRET_WORDS = ["photography", "Thursday", "free map"];
const db = {}; let tick = 0; const col = (c) => (db[c] = db[c] || {}); const cp = (o) => JSON.parse(JSON.stringify(o));
const D = { fsGet: async (e, c, id) => (col(c)[id] ? { data: cp(col(c)[id].data), updateTime: col(c)[id].ut } : null), fsPut: async (e, c, id, o) => { col(c)[id] = { data: cp(o), ut: "u" + ++tick }; },
  fsCreate: async (e, c, id, o) => { if (col(c)[id]) return false; col(c)[id] = { data: cp(o), ut: "u" + ++tick }; return true; }, fsUpdate: async (e, c, id, o, ut) => { const d = col(c)[id]; if (ut && (!d || d.ut !== ut)) return false; col(c)[id] = { data: Object.assign(d ? d.data : {}, cp(o)), ut: "u" + ++tick }; return true; },
  fsDelete: async (e, c, id) => { delete col(c)[id]; }, fsList: async (e, c) => Object.entries(col(c)).map(([id, d]) => Object.assign({ id }, d.data)), fsQueryDocs: async (e, c, f, v) => Object.entries(col(c)).filter(([, d]) => d.data[f] === v).map(([id, d]) => Object.assign({ id }, d.data)),
  idUser: async (e, r) => r.user || null, staffEmail: async (e, r) => (r.staff ? "admin@x.test" : ""), rosterRow: async (e, em) => (col("roster")[em] ? { id: em, data: col("roster")[em].data } : null),
  normEmail: (x) => String(x || "").trim().toLowerCase(), slug: (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), json: (data, status) => ({ status: status || 200, data }), fail: (msg, status) => ({ status: status || 400, data: { error: msg } }), adminEmail: () => "admin@x.test",
  aiReady: () => true, askGemini: async () => ({ out: { items: [{ id: 0, category: "Spelling", explanation: "Check the spelling.", explanation_vi: "Sai chính tả “photograpy”." }], vocabulary: [{ word: "free map", meaning_vi: "bản đồ miễn phí", example: "" }] }, model: "fake" }),
  saveErrors: async (e, att, id, x) => x.corrections.length, dayOf: () => ({ day: "d", dayStart: 0 }) };
const ENV = { MD_KV: { m: {}, async get(k) { return this.m[k] ?? null; }, async put(k, v) { this.m[k] = v; } } };
await D.fsPut(null, "roster", "stu@x.test", { email: "stu@x.test", name: "Stu", cls: "C1" });
const sv = await S.dlStaff(D, ENV, { staff: true }, { op: "save", title: "Club", script: SCRIPT, checked: true }); await S.dlAdmin(D, ENV, { op: "approve", lid: sv.data.lid, n: 1, mode: "homework" });
const exId = (await S.dlAdmin(D, ENV, { op: "publish", lid: sv.data.lid, bookId: "cam21", testId: "t4", part: 1 })).data.exId;
await D.fsPut(null, "assignments", "A1", { cls: "C1", start: Date.now() - 3600e3, due: Date.now() + 864e5, ex: ["c_" + exId] });
const log = []; const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
async function api(route, body) {
  const stu = { user: { em: "stu@x.test", role: "student" } };
  if (route === "dictation/staff") return S.dlStaff(D, ENV, { staff: true }, body);
  if (route === "admin/dictation") return S.dlAdmin(D, ENV, body);
  if (route === "dictation/practice") return S.dlPractice(D, ENV, stu, body);
  if (route === "dictation/check") return S.dlCheck(D, ENV, stu, body);
  const m = /^dictation\/(payload|submit)$/.exec(route); if (m) return S.dlHomework(D, ENV, stu, body, m[1]);
  return { status: 404, data: { error: "Not found." } };
}
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Dictation UI test</title></head><body><div id="a"></div><div id="p"></div><script type="module">
const out = {}; const ask = (o) => { setTimeout(() => o.onOk && o.onOk(), 0); };
const post = async (path, body) => { const r = await fetch("/api/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }); const d = await r.json(); d._ok = r.ok; d._status = r.status; return d; };
const okOr = async (path, body) => { const d = await post(path, body); if (!d._ok) throw new Error(d.error || "error"); return d; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const txt = (el) => el.textContent;
try {
  await import("/dictation/bridge.js?v=t"); const M = window.MD_DL;
  // 1. audio player (the one the student screen uses)
  const P = document.getElementById("p"); P.append(M.audioPlayer("/dictation/none.mp3")); out.player = [...P.querySelectorAll("button")].length >= 3 && !!document.getElementById("dl-css");
  // 2. student network flow: nothing of the script before the submission
  const pl = await post("dictation/payload", { exId: "${exId}", asgId: "A1" }); out.payloadOk = pl.status === "ok" && pl.words > 10;
  out.practiceClosedBeforeSubmit = (await post("dictation/practice", { exId: "${exId}" }))._status === 403;
  window.__phase = "after"; await fetch("/phase");
  const sub = await post("dictation/submit", { exId: "${exId}", asgId: "A1", text: "Hello I would like to join the photograpy club" });
  out.submitted = sub.status === "accepted" && sub.result.pct > 0 && sub.result.pct < 70 && sub.result.script.includes("photography");
  out.aiExplained = sub.result.ai.corrections.some((c) => c.explanation_vi.includes("photograpy")) && sub.result.ai.vocabulary_upgrades[0].upgraded === "free map";
  const again = await post("dictation/payload", { exId: "${exId}", asgId: "A1" }); out.afterSubmit = again.submitted === true && again.summary.pct === sub.result.pct;
  out.practiceAfterSubmit = (await post("dictation/practice", { exId: "${exId}" }))._status === 200;
  // 3. authoring: script -> preview (marked on the device) -> save -> list
  const A = document.getElementById("a"); M.mountAuthor(A, { staffApi: (p, b) => okOr(p, b), adminApi: (p, b) => okOr(p, b), uploadAudio: async () => ({ url: "" }), getSlot: () => ({ book: "cam21", test: "t4", part: 2, label: "Cam 21 · Test 4 · Part 2" }), ask, toast: () => {} });
  out.authorGuide = /How to make a dictation exercise/.test(txt(A));
  const src = A.querySelector("textarea"); src.value = "TOM: The museum opens at nine and closes at five on weekdays."; src.dispatchEvent(new Event("input")); A.querySelector("input[type=text]").value = "Museum";
  out.authorWords = /11 words to write/.test(txt(A));
  [...A.querySelectorAll("button")].find((b) => b.textContent === "Preview as a student").click(); await wait(30);
  const pv = [...A.querySelectorAll("textarea")][1]; pv.value = "The museum open at nine"; [...A.querySelectorAll("button")].find((b) => b.textContent === "Check (preview)").click(); await wait(30);
  out.authorPreview = /Student preview/.test(txt(A)) && /\\d+%/.test(txt(A));
  [...A.querySelectorAll("button")].find((b) => /Save lesson/.test(b.textContent)).click(); await wait(200); out.authorNeedsRights = /Tick “I may use/.test(txt(A));
  A.querySelector("#dlAttest").click(); [...A.querySelectorAll("button")].find((b) => /Save lesson/.test(b.textContent)).click(); await wait(400);
  out.authorSaved = /Saved version 1/.test(txt(A)) && /practice only/.test(txt(A)) && /Museum/.test(txt(A)) && !!A.querySelector(".dl-card");
  out.authorHomeworkBlockedForUnchecked = [...A.querySelectorAll("button")].filter((b) => b.textContent === "Approve for homework").some((b) => b.disabled);
  A.style.width = "340px"; await wait(50); out.authorFitsNarrowColumn = A.scrollWidth <= A.clientWidth + 1; A.style.width = "";
  [...A.querySelectorAll("button")].find((b) => b.textContent === "Fill in a sample script").click(); await wait(30); out.authorSample = A.querySelector("input[type=text]").value === "Sample: joining a club" && /words to write/.test(txt(A));
  out.nodeGlobals = typeof process === "undefined";
} catch (e) { out.error = String(e && e.stack || e); }
const pre = document.createElement("pre"); pre.id = "selftest"; pre.textContent = JSON.stringify(out); document.body.append(pre);
</script></body></html>`;
let phase = "before";
const srv = createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"); const send = (code, type, body) => { log.push({ path: u.pathname, phase, body: String(body) }); res.writeHead(code, { "content-type": type }).end(body); };
  if (u.pathname === "/test.html") return send(200, "text/html", PAGE);
  if (u.pathname === "/phase") { phase = "after"; return send(200, "text/plain", "ok"); }
  if (u.pathname.startsWith("/api/")) { let b = ""; for await (const c of req) b += c; const r = await api(u.pathname.slice(5), JSON.parse(b || "{}")); return send(r.status, "application/json", JSON.stringify(r.data)); }
  const parts = u.pathname.split("/").filter(Boolean); if (parts[0] !== "dictation" || parts.some((x) => x === "..")) return send(404, "text/plain", "");
  try { send(200, TYPES[extname(u.pathname)] || "text/plain", await readFile(join(ROOT, ...parts))); } catch { send(404, "text/plain", ""); }
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const prof = await mkdtemp(join(tmpdir(), "dl-ui-"));
const html = await new Promise((ok) => execFile(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--user-data-dir=" + prof, "--virtual-time-budget=20000", "--dump-dom", "http://127.0.0.1:" + srv.address().port + "/test.html"], { encoding: "utf8", timeout: 120000, maxBuffer: 1 << 26 }, (e, so) => ok(so || "")));
const m = /<pre id="selftest">([^<]*)<\/pre>/.exec(html); let r = null; try { r = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")); } catch {}
// network scan: before the submission, no student response may contain the script
const before = log.filter((x) => /\/api\/dictation\/(payload|practice|check)/.test(x.path) && x.phase === "before"); const leaks = [];
for (const x of before) for (const w of SECRET_WORDS) if (x.body.includes(w)) leaks.push(x.path + ": " + w);
const checks = r ? Object.entries(r).filter(([k]) => k !== "error") : []; const bad = checks.filter(([, v]) => v !== true).map(([k]) => k);
for (const [k, v] of checks) console.log((v === true ? "PASS " : "FAIL ") + k); if (r?.error) console.log("FAIL page error: " + r.error.slice(0, 400)); if (!r) console.log("FAIL no output from the page");
console.log((leaks.length || !before.length ? "FAIL" : "PASS") + " network scan: " + before.length + " student responses before the submission, " + leaks.length + " script leaks " + leaks.slice(0, 3).join("; "));
console.log("browser: " + spawnSync(browser, ["--version"], { encoding: "utf8" }).stdout.trim());
srv.close(); await rm(prof, { recursive: true, force: true }).catch(() => {}); process.exit(!r || r.error || bad.length || leaks.length || !before.length ? 1 : 0);
