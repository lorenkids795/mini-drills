// DEV-ONLY: serves pkg/ on 127.0.0.1 plus a reference homework API (the engine's SERVER functions + the in-memory server stub), then
// opens the example pages with ?selftest=1 in a real headless Chromium browser (Chrome or Edge) and checks the JSON each page writes
// into <pre id="selftest">. Every response the server sends is logged: for the homework page this proves at the NETWORK level that
// the device never receives the lesson, the answer key, a transcript or an unlocked typed answer before the server accepted the
// submission (all traffic goes through this server; the page only uses relative URLs).
// Usage:  node tools/browser-selftest.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe"   (from pkg/)
// It tests the REFERENCE pages, not the Mini Drills product UI: AS-027 and SAF-001..003 stay untested for the product.
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { spawnSync, execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), ".."); const browser = process.argv[2];
if (!browser) { console.error("usage: node tools/browser-selftest.mjs PATH_TO_CHROME_OR_EDGE"); process.exit(2); }
const run = (cmd, args) => new Promise((ok) => execFile(cmd, args, { encoding: "utf8", timeout: 120000, maxBuffer: 1 << 26 }, (e, stdout) => ok(stdout ?? "")));
const E = await import(pathToFileURL(join(root, "hybrid-engine", "src", "index.js")).href); const V = await import(pathToFileURL(join(root, "js-validator", "src", "index.js")).href);
const LESSON = "golden-tests-v1.1/baseline-harbour-museum.rev1.json"; const doc = JSON.parse(readFileSync(join(root, LESSON), "utf8"));
const schema = JSON.parse(readFileSync(join(root, "js-validator", "schema", "dictation-schema-v1.json"), "utf8"));
const SO = { doc, validation: V.validateDictationDocument(doc, { schema }), version: "demo-v1", seed: 42, approval: { approved: true, version: "demo-v1" } };
let api = null; const newApi = () => (api = E.createMemoryServer({ serverOpts: SO, assignment: { id: "demo-hw", classId: "C1", contentVersion: "demo-v1" }, tokens: { qa: { studentRef: "qa-student", classId: "C1" } }, token: "qa" }));
const HOSTILE = '<img src=x onerror="window.__pwned=1"> ';
const hostile = (p) => { const it = p?.payload?.items?.find((i) => i.prompt); if (it) it.prompt = HOSTILE + it.prompt; return p; };
const log = []; // {page, path, status, body}
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" }; let page = "";
const srv = createServer(async (req, res) => {
  const send = (code, type, body) => { log.push({ page, path: req.url, code, body: String(body) }); res.writeHead(code, { "content-type": type }).end(body); };
  let parts; try { parts = decodeURIComponent(new URL(req.url, "http://x").pathname).split("/").filter(Boolean); } catch { send(400, "text/plain", ""); return; }
  if (parts[0] === "api" && parts[1] === "dictation") {
    let body = ""; for await (const ch of req) body += ch; let q = {}; try { q = JSON.parse(body || "{}"); } catch {}
    let out; if (parts[2] === "payload") out = hostile(api.payload()); else if (parts[2] === "lock") out = hostile(await api.lockPhase(q)); else if (parts[2] === "submit") out = await api.submit(q); else out = { status: "rejected", reason: "unknown" };
    send(200, "application/json", JSON.stringify(out)); return;
  }
  if (parts.some((s) => s === ".." || s.includes("\\") || s.includes(":"))) { send(403, "text/plain", ""); return; } const f = join(root, ...parts);
  try { const b = await readFile(f); send(200, TYPES[extname(f)] ?? "application/octet-stream", b); } catch { send(404, "text/plain", ""); }
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const port = srv.address().port; const profile = await mkdtemp(join(tmpdir(), "dl-browser-"));
const ver = spawnSync(browser, ["--version"], { encoding: "utf8" }).stdout.trim(); let bad = 0;
const lv = ["level1", "level2", "level3", "level4", "answerSpotter"];
const want = {
  "js-validator/browser-example.html": (r) => r.demo?.valid === true && r.blocked?.valid === false && r.noMarkupCreated === true && r.nodeGlobals === true,
  "hybrid-engine/browser-example.html": (r) => lv.every((k) => r[k] === true) && r.hintReveal === true && r.reviewBeforeCheck === "locked" && r.reviewAfterEmpty === "locked" && r.reviewAfterCheck === "ok" && r.official === false && r.nodeGlobals === true,
  "hybrid-engine/browser-example.html?mode=homework": (r) => r.reviewBeforeSubmit === "locked_until_submitted" && r.checkInHomework === "not_available_homework" && (r.phase === undefined || r.phase === "ok") && r.needsConfirmation === true && r.submission === "submitted" && r.review === "ok" && r.passed === false && r.completed === false && r.hostileShownAsText === true && r.nodeGlobals === true,
};
// Secrets the homework device must never receive before an accepted submission (typed answers of LOCKED items may appear later).
const ref = E.createRun({ doc, validation: SO.validation, version: "demo-v1", seed: 42 }); const L = ref.lesson; const always = new Set(); const typed = new Map();
for (const id of ref.scored) { const k = ref.level.get(id); const it = L.items.get(id);
  if (k === "level3" || k === "level4") for (const s of ref.sentencesOf(id)) always.add(L.S.get(s).cleanText);
  if (k === "answerSpotter") { if (it.explanation) always.add(it.explanation); for (const sp of it.spans) if (sp.reason) always.add(sp.reason); for (const s of it.evidenceSentenceIds) always.add(L.S.get(s).cleanText); }
  if (ref.typedAS.includes(id)) typed.set(id, ref.answersOf(id)); }
const lockIds = E.phaseLockIds(SO);
function networkCheck() {
  const rows = log.filter((x) => x.page === "hybrid-engine/browser-example.html?mode=homework"); const problems = [];
  for (const x of rows) { if (/golden-tests|js-validator|\.rev1\.json|schema/.test(x.path)) problems.push("fetched " + x.path); }
  const strs = (o, out = []) => { if (typeof o === "string") out.push(o); else if (o && typeof o === "object") for (const v of Object.values(o)) strs(v, out); return out; };
  const has = (body, a) => { let parsed; try { parsed = JSON.parse(body); } catch { parsed = body; } const t = E.tokenize(a); // each JSON string separately: JSON has no spaces between values
    return strs(parsed).some((x) => { const b = E.tokenize(x); for (let i = 0; i + t.length <= b.length; i++) if (t.every((w, k) => b[i + k] === w)) return true; return false; }); };
  for (const x of rows) {
    if (x.path.startsWith("/api/dictation/submit") && /"status":"(accepted|duplicate)"/.test(x.body)) continue; // review is allowed with the acknowledgement
    const after = x.path.startsWith("/api/dictation/lock");
    for (const s of always) if (x.body.includes(s)) problems.push(x.path + " leaks text: " + s.slice(0, 30));
    for (const [id, ans] of typed) if (!(after && lockIds.includes(id))) for (const a of ans) if (x.path.startsWith("/api/") && has(x.body, a)) problems.push(x.path + " leaks the typed answer of " + id);
  }
  return { requests: rows.length, problems };
}
for (const [pg, ok] of Object.entries(want)) {
  page = pg; newApi(); const url = `http://127.0.0.1:${port}/${pg}${pg.includes("?") ? "&" : "?"}selftest=1`;
  const out = await run(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--user-data-dir=" + profile, "--virtual-time-budget=20000", "--dump-dom", url]);
  const m = /<pre id="selftest">([^<]*)<\/pre>/.exec(out); let r = null; try { r = m && JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")); } catch {}
  const pass = !!r && ok(r); if (!pass) bad++; console.log(`${pass ? "PASS" : "FAIL"}  ${pg}  ${m ? m[1] : "(no self-test output)"}`);
}
const nc = networkCheck(); const ncPass = nc.requests > 0 && nc.problems.length === 0; if (!ncPass) bad++;
console.log(`${ncPass ? "PASS" : "FAIL"}  homework network scan: ${nc.requests} responses served to the homework page, ${nc.problems.length} answer leaks before the accepted submission ${nc.problems.slice(0, 5).join("; ")}`);
console.log("browser: " + (ver || browser)); srv.close(); await rm(profile, { recursive: true, force: true }).catch(() => {}); process.exit(bad ? 1 : 0);
