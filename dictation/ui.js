// Dictation Lab UI (contract v1.1). ES module, loaded only on the Dictation screen through bridge.js (O-1).
// Every string from a lesson, a student or the server is written with textContent: nothing is parsed as HTML (SAF-001..003).
// There is no Hint, no Reveal and no answer preview. Practice: Check, then Review of that item. Homework: no Check; Submit; the
// result and review come only from the server's acknowledgement.
import { compareScript } from "./script.js";
import { createRun, DictationRun, HomeworkClient } from "./engine/index.js";
import { validateDictationJson, validateDictationDocument } from "./validator/index.js";
import SCHEMA from "./validator/schema.js";
import { buildTranscriptDoc } from "./transcript.js";

const LV = { answerSpotter: "Answer Spotter · listen and answer", level1: "Level 1 · Build the sentence", level2: "Level 2 · Fill the gaps", level3: "Level 3 · Write the sentence", level4: "Level 4 · Write the passage", review: "Transcript review" };
const ORDER = ["answerSpotter", "level1", "level2", "level3", "level4", "review"];
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) { if (v === false || v == null) continue; if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : String(v)); }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}
const btn = (label, on, cls = "btn", extra = {}) => h("button", { type: "button", class: cls, onclick: on, ...extra }, label);
const pct = (f) => (f && f.den ? Math.round((100 * f.num) / f.den) + "%" : "–");
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };

function css() {
  if (document.getElementById("dl-css")) return;
  document.head.append(h("style", { id: "dl-css", text: `
.dl{display:grid;gap:14px}.dl-sec h3{font-size:var(--fs-md,1rem);margin:8px 0 6px}.dl-item{border-top:1px solid var(--line);padding:12px 0;display:grid;gap:8px}
.dl-item h4{margin:0;font-size:var(--fs-body,.9rem);color:var(--muted)}.dl-prompt{margin:0}.dl textarea,.dl input[type=text]{width:100%;box-sizing:border-box;min-height:44px;font:inherit;padding:8px 10px;border:1px solid var(--line-2,var(--line));border-radius:var(--r-sm,8px);background:var(--surface);color:var(--ink)}
.dl textarea{min-height:72px;resize:vertical;line-height:1.6}.dl-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.dl-fb{margin:0;font-size:var(--fs-sm,.84rem)}.dl-ok{color:var(--good);font-weight:700}.dl-bad{color:var(--bad);font-weight:700}
.dl-muted{color:var(--muted);font-size:var(--fs-sm,.84rem)}.dl-review{border-left:3px solid var(--accent);padding:6px 10px;background:var(--surface-2,transparent);border-radius:0 var(--r-sm,8px) var(--r-sm,8px) 0;line-height:1.7}
.dl-tiles{display:flex;flex-wrap:wrap;gap:6px;min-height:44px;padding:6px;border:1px dashed var(--line-2,var(--line));border-radius:var(--r-sm,8px)}.dl-tile{min-height:40px;padding:0 12px;border:1px solid var(--line-2,var(--line));border-radius:var(--r-sm,8px);background:var(--surface);color:var(--ink);font:inherit;cursor:pointer}
.dl-tile:focus-visible,.dl button:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.dl .dl-gap{display:inline-block;width:9em;max-width:calc(100% - 8px);min-height:36px!important;margin:2px 4px;vertical-align:middle}.dl-sent{line-height:2.2}
.dl-warn{padding:10px 12px;border-radius:var(--r-sm,8px);background:var(--hl-soft,#fff7d6);color:var(--ink)}.dl-err{color:var(--bad)}.dl-opt{display:flex;gap:8px;align-items:center;min-height:44px}
.dl-player{display:grid;gap:10px;padding:12px 14px;border:1px solid var(--line);border-radius:var(--r-lg,16px);background:var(--surface)}.dl-prow{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.dl-pp{width:52px;height:52px;border-radius:50%;border:0;background:var(--accent);color:var(--accent-ink,#fff);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.dl-ib{position:relative;width:44px;height:44px;border-radius:50%;border:1px solid var(--line-2,var(--line));background:var(--surface);color:var(--ink);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.dl-ibt{position:absolute;font-size:9px;font-weight:800;line-height:1;top:50%;left:50%;transform:translate(-50%,-38%)}.dl-time{font-family:var(--mono,monospace);font-size:var(--fs-sm,.84rem);color:var(--muted);margin-left:4px}.dl-seg{display:inline-flex;margin-left:auto;border:1px solid var(--line-2,var(--line));border-radius:999px;overflow:hidden}.dl-sp{min-height:36px;min-width:52px;padding:0 10px;border:0;background:transparent;color:var(--ink);font:inherit;font-size:var(--fs-sm,.84rem);cursor:pointer}.dl-sp+.dl-sp{border-left:1px solid var(--line-2,var(--line))}.dl-sp[aria-pressed=true]{background:var(--accent);color:var(--accent-ink,#fff);font-weight:700}.dl-track{position:relative;display:flex;align-items:center;height:28px}.dl-track input[type=range]{position:relative;width:100%;margin:0;accent-color:var(--accent);background:transparent;z-index:1}.dl-band{position:absolute;top:50%;height:12px;transform:translateY(-50%);border-radius:6px;background:color-mix(in srgb,var(--accent) 28%,transparent);border:1px solid var(--accent)}.dl-loop{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:44px}.dl-lb{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--line-2,var(--line));background:var(--surface);color:var(--ink);font:inherit;font-weight:600;cursor:pointer}.dl-lb.on{border-color:var(--accent);background:var(--accent);color:var(--accent-ink,#fff)}.dl-lb svg{flex:none}.dl-lk{min-height:40px;padding:0 6px;border:0;background:transparent;color:var(--accent);font:inherit;font-weight:600;text-decoration:underline;cursor:pointer}.dl-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:var(--surface-2,var(--bg));border:1px solid var(--line);font-family:var(--mono,monospace);font-size:var(--fs-sm,.84rem)}.dl-chip.on{border-color:var(--accent);color:var(--accent)}.dl-keys{margin:0;color:var(--muted);font-size:var(--fs-xs,.78rem)}.dl-pp:focus-visible,.dl-ib:focus-visible,.dl-sp:focus-visible,.dl-lb:focus-visible,.dl-lk:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.dl-ib:hover,.dl-lb:hover{border-color:var(--accent)}@media (max-width:640px){.dl-seg{margin-left:0}.dl-keys{display:none}}
.dl-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.dl-sum div{border:1px solid var(--line);border-radius:var(--r-sm,8px);padding:8px 10px}.dl-sum b{display:block;font-size:var(--fs-lg,1.15rem)}
.dl *{min-width:0}.dl select{min-height:44px;max-width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line-2,var(--line));border-radius:var(--r-sm,8px);background:var(--surface);color:var(--ink)}.dl input[type=file]{max-width:100%;font:inherit}
.dl-guide{border:1px solid var(--line);border-radius:var(--r-md,12px);padding:10px 14px;background:var(--surface-2,var(--surface))}.dl-guide summary{cursor:pointer;font-weight:700;min-height:32px;display:flex;align-items:center}.dl-guide ol{margin:8px 0 4px;padding-left:1.3em;display:grid;gap:6px;line-height:1.6}.dl-guide p{margin:6px 0}
.dl-cards{display:grid;gap:10px}.dl-card{border:1px solid var(--line);border-radius:var(--r-md,12px);padding:12px;display:grid;gap:8px;background:var(--surface)}.dl-card b{overflow-wrap:anywhere}.dl-pills{display:flex;flex-wrap:wrap;gap:6px}.dl-pill{font-size:var(--fs-xs,.78rem);padding:2px 8px;border-radius:999px;border:1px solid var(--line-2,var(--line));color:var(--muted)}.dl-pill.on{border-color:var(--good);color:var(--good)}
.dl-list label{overflow-wrap:anywhere}
.dl-list{list-style:none;margin:0;padding:0;display:grid;gap:6px}.dl-list li{display:flex;gap:8px;align-items:flex-start}.dl-table{width:100%;border-collapse:collapse}.dl-table td,.dl-table th{border-top:1px solid var(--line);padding:6px;text-align:left;vertical-align:top;font-size:var(--fs-sm,.84rem)}` }));
}

/* ---------- audio player: full uncut source, ±3 s, speed, A-B loop, keyboard (not answer hints) ---------- */
const ICO = {
  play: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/></svg>',
  fwd: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>',
  loop: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
};
const icoBtn = (svg, label, cls, on, text) => { const b = h("button", { type: "button", class: cls, "aria-label": label, title: label, onclick: on }); b.innerHTML = svg + (text ? '<span class="dl-ibt">' + text + "</span>" : ""); return b; };
/** The audio player of the Dictation screens: play / pause, back / forward 3 s, speed, a seek bar, and "Repeat a part"
 *  (mark the start, mark the end, it loops until "Stop repeating"). Keyboard: Ctrl+Space, Ctrl+, / Ctrl+. (3 s), Ctrl+; (repeat). */
export function audioPlayer(url) {
  css(); // also used alone on the student screen (index.html)
  if (!url) return h("p", { class: "dl-muted", text: "No audio file is attached to this lesson." });
  const a = h("audio", { preload: "metadata", src: url }); let A = null, B = null;
  const fmt = (s) => (isFinite(s) && s >= 0 ? Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") : "0:00");
  const time = h("span", { class: "dl-time", "aria-live": "off" }, "0:00 / 0:00");
  const seek = h("input", { type: "range", min: "0", max: "1000", value: "0", "aria-label": "Position in the audio" });
  const band = h("span", { class: "dl-band", "aria-hidden": "true" });
  const play = icoBtn(ICO.play, "Play (Ctrl+Space)", "dl-pp", () => (a.paused ? a.play().catch(() => {}) : a.pause()));
  const back = icoBtn(ICO.back, "Back 3 seconds (Ctrl+,)", "dl-ib", () => { a.currentTime = Math.max(0, a.currentTime - 3); }, "3");
  const fwd = icoBtn(ICO.fwd, "Forward 3 seconds (Ctrl+.)", "dl-ib", () => { a.currentTime = Math.min(a.duration || a.currentTime + 3, a.currentTime + 3); }, "3");
  const speeds = [0.75, 1, 1.25].map((v) => { const b = h("button", { type: "button", class: "dl-sp", "aria-pressed": String(v === 1), onclick: () => { a.playbackRate = v; speeds.forEach((x) => x.setAttribute("aria-pressed", String(x === b))); } }, v + "×"); return b; });
  const speed = h("div", { class: "dl-seg", role: "group", "aria-label": "Speed" }, ...speeds);
  const loop = h("div", { class: "dl-loop", "aria-live": "polite" });
  // "Repeat a part" in 3 clear steps instead of the old Set A / Set B / Clear loop
  function drawLoop() {
    const dur = a.duration || 0;
    if (A !== null && B !== null && dur) { band.style.left = (A / dur) * 100 + "%"; band.style.width = ((B - A) / dur) * 100 + "%"; band.hidden = false; } else band.hidden = true;
    if (A === null) loop.replaceChildren(icoBtn(ICO.loop, "Repeat a part (Ctrl+;)", "dl-lb", markStart, "Repeat a part"), h("span", { class: "dl-muted" }, "Play to where the part starts, then press it."));
    else if (B === null) loop.replaceChildren(h("span", { class: "dl-chip" }, "Start " + fmt(A)), h("button", { type: "button", class: "dl-lb on", onclick: markEnd }, "Mark the end here"), h("button", { type: "button", class: "dl-lk", onclick: stop }, "Cancel"), h("span", { class: "dl-muted" }, "Let it play to the end of the part."));
    else { const chip = h("span", { class: "dl-chip on" }); chip.innerHTML = ICO.loop; chip.append("Repeating " + fmt(A) + " – " + fmt(B)); loop.replaceChildren(chip, h("button", { type: "button", class: "dl-lk", onclick: stop }, "Stop repeating")); }
  }
  function markStart() { A = a.currentTime; B = null; drawLoop(); }
  function markEnd() { B = Math.max(A + 0.5, a.currentTime); if (a.currentTime >= B || a.currentTime < A) a.currentTime = A; drawLoop(); if (a.paused) a.play().catch(() => {}); }
  function stop() { A = B = null; drawLoop(); }
  const loopKey = () => (A === null ? markStart() : B === null ? markEnd() : stop());
  a.addEventListener("play", () => { play.innerHTML = ICO.pause; play.setAttribute("aria-label", "Pause (Ctrl+Space)"); play.title = "Pause (Ctrl+Space)"; });
  a.addEventListener("pause", () => { play.innerHTML = ICO.play; play.setAttribute("aria-label", "Play (Ctrl+Space)"); play.title = "Play (Ctrl+Space)"; });
  a.addEventListener("loadedmetadata", () => { time.textContent = fmt(0) + " / " + fmt(a.duration); drawLoop(); });
  a.addEventListener("timeupdate", () => { if (B !== null && a.currentTime >= B) a.currentTime = A; time.textContent = fmt(a.currentTime) + " / " + fmt(a.duration); if (a.duration) seek.value = String(Math.round((a.currentTime / a.duration) * 1000)); });
  seek.addEventListener("input", () => { if (a.duration) a.currentTime = (Number(seek.value) / 1000) * a.duration; });
  const box = h("div", { class: "dl-player", role: "group", "aria-label": "Audio" }, a,
    h("div", { class: "dl-prow" }, back, play, fwd, time, speed),
    h("div", { class: "dl-track" }, band, seek), loop,
    h("p", { class: "dl-keys" }, "Keys: Ctrl+Space play / pause · Ctrl+, and Ctrl+. 3 seconds · Ctrl+; repeat a part"));
  box.keys = (e) => { if (!e.ctrlKey) return; if (e.code === "Space") { e.preventDefault(); play.click(); } else if (e.key === ",") { e.preventDefault(); back.click(); } else if (e.key === ".") { e.preventDefault(); fwd.click(); } else if (e.key === ";") { e.preventDefault(); loopKey(); } };
  // shortcuts work anywhere on the page while this player is shown (e.g. while typing in the text box); gone with the player
  const onKey = (e) => { if (!box.isConnected) { document.removeEventListener("keydown", onKey); return; } box.keys(e); };
  document.addEventListener("keydown", onKey);
  drawLoop();
  return box;
}

/* ---------- input controls per level (shared by practice and homework) ---------- */
function control(p, value, onChange, disabled) {
  if (p.level === "level1") {
    const placed = Array.isArray(value?.placedIds) ? [...value.placedIds] : []; const byId = new Map(p.tiles.map((t) => [t.id, t.text]));
    const row = h("div", { class: "dl-tiles", "aria-label": "Your sentence (click a word to send it back)" }), bank = h("div", { class: "dl-tiles", "aria-label": "Words to use" });
    const draw = () => { row.replaceChildren(...placed.map((id, i) => h("button", { type: "button", class: "dl-tile", disabled, onclick: () => { placed.splice(i, 1); draw(); onChange({ placedIds: [...placed] }); } }, byId.get(id))));
      bank.replaceChildren(...p.tiles.filter((t) => !placed.includes(t.id)).map((t) => h("button", { type: "button", class: "dl-tile", disabled, onclick: () => { placed.push(t.id); draw(); onChange({ placedIds: [...placed] }); } }, t.text))); };
    draw(); return h("div", {}, row, bank);
  }
  if (p.level === "level2") {
    const ans = Array.isArray(value?.answers) ? [...value.answers] : Array(p.blanks).fill("");
    return h("p", { class: "dl-sent" }, ...p.segments.map((s) => s.text !== undefined ? s.text : h("input", { type: "text", class: "dl-gap", value: ans[s.blank] ?? "", disabled, "aria-label": "Blank " + (s.blank + 1), autocomplete: "off", spellcheck: "false", oninput: (e) => { ans[s.blank] = e.target.value; onChange({ answers: [...ans] }); } })));
  }
  if (p.level === "level3" || p.level === "level4") return h("textarea", { rows: p.level === "level4" ? 6 : 2, disabled, spellcheck: "false", autocomplete: "off", "aria-label": p.level === "level4" ? "Write the passage you hear" : "Write the sentence you hear", oninput: (e) => onChange({ answer: e.target.value }) }, value?.answer ?? "");
  if (p.responseMode === "choose_option") return h("div", { role: "radiogroup", "aria-label": "Choose one answer" }, ...p.options.map((o) => h("label", { class: "dl-opt" }, h("input", { type: "radio", name: "o-" + p.id, value: o, checked: value?.chosen === o, disabled, onchange: () => onChange({ chosen: o }) }), o)));
  return h("input", { type: "text", value: value?.text ?? "", disabled, autocomplete: "off", spellcheck: "false", "aria-label": "Your answer" + (p.answerFormat?.label ? " (" + p.answerFormat.label + ")" : ""), oninput: (e) => onChange({ text: e.target.value }) });
}
function fbText(s) {
  if (s.correct !== undefined) return s.correct ? "Correct." : s.rejected === "exceeds_word_limit" ? "Not correct: too many words." : s.rejected === "number_not_allowed" ? "Not correct: a number is not allowed here." : "Not correct.";
  return (s.exact ? "Fully correct." : "Not fully correct yet.") + " " + s.num + " of " + s.den + " words in the right order" + (s.missing !== undefined ? " · missing " + s.missing + " · extra " + s.extra : "") + (s.criticalTargetErrors ? " · " + s.criticalTargetErrors + " important word(s) wrong (number, price, date or answer)" : "");
}
function reviewEl(r) {
  if (!r) return null; const kids = [];
  if (r.text) kids.push(h("div", {}, h("b", {}, "Transcript: "), r.text));
  if (r.blanks) kids.push(h("div", {}, h("b", {}, "Missing words: "), r.blanks.join(" · ")));
  if (r.answers) kids.push(h("div", {}, h("b", {}, "Accepted answer: "), r.answers.join(" / ")), r.sourceLabel ? h("div", { class: "dl-muted" }, r.sourceLabel) : null);
  if (r.explanation) kids.push(h("div", { class: "dl-muted" }, r.explanation));
  if (r.transcript) kids.push(h("div", {}, h("b", {}, "Transcript: "), r.transcript.map((t) => t.text).join(" ")));
  return h("div", { class: "dl-review" }, ...kids);
}
const label = (it) => (it.kind === "review" ? "review" : it.level);
function groups(items) { const g = new Map(); for (const it of items) { const k = label(it); if (!g.has(k)) g.set(k, []); g.get(k).push(it); } return ORDER.filter((k) => g.has(k)).map((k) => [k, g.get(k)]); }

/* ---------- Free Practice ---------- */
export function mountPractice(el, o) {
  css(); const key = o.storeKey || null; const opts = { doc: o.doc, validation: o.validation, version: o.version, seed: o.seed ?? 0, deselected: o.deselected ?? [] };
  let run; try { const log = key ? store.get(key) : null; run = log ? DictationRun.replay(opts, log) : createRun(opts); } catch { run = createRun(opts); }
  const draft = {}; const fb = {}; const shown = {};
  const save = () => { if (key) store.set(key, run.exportLog()); };
  const root = h("div", { class: "dl" }); el.replaceChildren(root); const player = audioPlayer(o.audio);
  const draw = () => {
    const items = run.items(); const sum = run.summary(); const scored = items.filter((i) => i.kind === "scored"); const done = scored.filter((i) => sum.items[i.id]?.attempted).length; const exact = scored.filter((i) => sum.items[i.id]?.firstAttempt?.exact).length;
    const head = [h("div", { class: "dl-row" }, h("span", { class: "pill" }, "Free practice"), o.preview ? h("span", { class: "pill" }, "Teacher preview · nothing is saved") : null, h("span", { class: "dl-muted" }, "Checked " + done + " of " + scored.length + " · first try fully correct: " + exact))];
    if (run.content.label === "unverified_transcript") head.push(h("p", { class: "dl-warn", role: "note" }, "Unverified transcript: a teacher has not checked this transcript against the audio yet. Use it for practice only."));
    head.push(h("p", { class: "dl-muted" }, "Listen first. Press Check to see your result; then you can open Review for that item. Practise again as often as you like: your first try is kept."));
    root.replaceChildren(...head, player, ...groups(items).map(([k, list]) => h("section", { class: "dl-sec" }, h("h3", {}, LV[k]), ...list.map((it) => card(it)))));
  };
  const card = (it) => {
    const id = it.id; const pr = run.present(id); const box = h("div", { class: "dl-item", "data-dl-item": id }, h("h4", {}, id));
    if (pr.status === "locked") { box.append(h("p", { class: "dl-muted" }, pr.reason === "check_paired_item_first" ? "Answer its question first: " + pr.waitFor.join(", ") + "." : "To keep the listening questions fair, answer these first: " + pr.waitFor.join(", ") + ".")); return box; }
    const p = pr.payload; if (p.prompt) box.append(h("p", { class: "dl-prompt" }, p.prompt));
    if (it.kind === "review") { box.append(reviewEl({ transcript: p.transcript }), h("p", { class: "dl-muted" }, "Type the answers you can find in the transcript, separated by commas.")); }
    const ctl = it.kind === "review" ? h("input", { type: "text", "aria-label": "Answers you found", value: draft[id]?.text ?? "", oninput: (e) => { draft[id] = { text: e.target.value }; } }) : control(p, draft[id], (v) => { draft[id] = v; }, false);
    const f = h("p", { class: "dl-fb", "aria-live": "polite" }); const st = fb[id]; if (st) { f.textContent = st.text; f.className = "dl-fb " + (st.cls || ""); }
    const actions = h("div", { class: "dl-row" }, btn("Check", () => {
      const resp = it.kind === "review" ? { selected: String(draft[id]?.text ?? "").split(/[,;\n]/).map((x) => x.trim()).filter(Boolean) } : draft[id] ?? {};
      const r = run.check(id, resp); save();
      if (r.status === "empty_answer") fb[id] = { text: "Write an answer first. An empty Check does not count and does not open Review.", cls: "dl-muted" };
      else if (r.status === "rejected") fb[id] = { text: r.rejected === "answer_too_long" ? "Too long: 4000 characters at most." : "This answer cannot be checked.", cls: "dl-bad" };
      else if (r.status === "locked") fb[id] = { text: "Answer these first: " + (r.waitFor || []).join(", ") + ".", cls: "dl-muted" };
      else if (r.status === "reviewed") fb[id] = { text: "Found " + r.score.reviewMatches + " of " + r.score.reviewDen + ". (Review only: no score.)" };
      else if (r.score) fb[id] = { text: fbText(r.score) + (r.status === "duplicate_ignored" ? " Same answer as before: not counted again." : "") + (r.reviewAvailable ? "" : " Review opens after: " + (r.reviewWaitsFor || []).join(", ") + "."), cls: r.score.exact || r.score.correct ? "dl-ok" : "dl-bad" };
      draw(); root.querySelector('[data-dl-item="' + CSS.escape(id) + '"] button')?.focus();
    }, "btn pri"));
    if (it.kind !== "review" && run.reviewGate(id).open) actions.append(btn(shown[id] ? "Hide review" : "Review", () => { shown[id] = !shown[id]; if (shown[id]) run.review(id); save(); draw(); }));
    box.append(ctl, actions, f); if (shown[id] && it.kind !== "review") { const rv = run.review(id); if (rv.status === "ok") box.append(reviewEl(rv.review)); }
    return box;
  };
  draw(); return { run, reset: () => { if (key) store.del(key); run = createRun(opts); draw(); } };
}

/* ---------- Homework (server-scored) ---------- */
export async function mountHomework(el, o) {
  css(); const root = h("div", { class: "dl" }); el.replaceChildren(root, h("p", { class: "dl-muted", text: "Loading…" }));
  const dkey = "md-dlhw:" + (o.email || "") + ":" + o.asgId + ":" + o.exId; const call = (path, extra) => o.api("dictation/" + path, Object.assign({ exId: o.exId, asgId: o.asgId }, extra || {}));
  let res; try { res = await call("payload"); } catch (e) { el.replaceChildren(h("p", { class: "dl-err", text: "Could not load this homework: " + (e.message || e) })); return; }
  el.replaceChildren(root); const player = audioPlayer(o.audio);
  // the student's own copy of their final answers on THIS device follows the same 90-day limit as the server (P-05); older copies are dropped
  const mineOf = () => { const d = store.get(dkey + ":done"); if (d && d.t && Date.now() - d.t < 90 * 864e5) return d.r; if (d) store.del(dkey + ":done"); return null; };
  if (res.submitted) return result(res.result, mineOf());
  if (res.status !== "ok" || !res.payload) { root.replaceChildren(h("p", { class: "dl-err", text: res.error || "This homework is not available." })); return; }
  let k = 0; const c = new HomeworkClient(res.payload, { makeKey: () => "k" + Date.now().toString(36) + (++k), transport: { lockPhase: (req) => call("lock", { req }), submit: (req) => call("submit", { req }) } });
  for (const [id, v] of Object.entries(res.locked || {})) { c.responses[id] = v; if (c.session.S.items[id]) c.session.S.items[id].answered = true; } // saved on the server, read-only
  for (const [id, v] of Object.entries(store.get(dkey) || {})) c.answer(id, v);
  const saveDraft = () => store.set(dkey, c.responses);
  function draw(msg) {
    const v = c.view(); const pending = c.session.S.sub === "submit_pending"; const blanks = v.filter((i) => !c.session.S.items[i.id]?.answered && !c.locked.has(i.id)).length;
    const head = [h("div", { class: "dl-row" }, h("span", { class: "pill" }, "Homework"), c.p.phases > 1 ? h("span", { class: "pill" }, "Part " + c.phase + " of " + c.p.phases) : null, h("span", { class: "dl-muted" }, v.length - blanks + " of " + v.length + " answered"))];
    head.push(h("p", { class: "dl-muted" }, "Answers are checked only after you submit. You can change them until then." + (c.p.phases > 1 && c.morePhases ? " Part 1 answers are saved and locked when you continue to part 2." : "")));
    if (!res.open) head.push(h("p", { class: "dl-err" }, "The deadline has passed. This homework can no longer be submitted."));
    if (msg) head.push(h("p", { class: msg.cls || "dl-muted", role: "status" }, msg.text));
    const byLevel = groups(v.map((i) => ({ ...i, kind: "scored" })));
    const go = c.morePhases ? btn("Save part 1 and continue", () => o.ask({ title: "Continue to part 2?", text: "Your part 1 answers will be saved and cannot be changed afterwards.", ok: "Continue", onOk: async () => { const r = await c.continueToNextPhase(); saveDraft(); draw(r.status === "ok" ? null : { text: "Could not save: " + (r.error || r.status) + ". Try again.", cls: "dl-err" }); } }), "btn pri", { disabled: !res.open })
      : btn(pending ? "Submitting…" : "Submit homework · " + v.length + " items", () => submit(false), "btn pri", { disabled: !res.open || pending, "aria-busy": pending ? "true" : "false" });
    root.replaceChildren(...head, player, ...byLevel.map(([lv, list]) => h("section", { class: "dl-sec" }, h("h3", {}, LV[lv]), ...list.map((it) => h("div", { class: "dl-item" }, h("h4", {}, it.id), it.prompt ? h("p", { class: "dl-prompt" }, it.prompt) : null,
      control(it, it.response, (val) => { const r = c.answer(it.id, val); if (r.status === "draft_updated") saveDraft(); else if (r.status === "rejected") draw({ text: it.id + ": " + (r.rejected === "answer_too_long" ? "too long (4000 characters at most)." : "this answer cannot be used."), cls: "dl-err" }); }, it.readOnly), it.readOnly ? h("p", { class: "dl-muted" }, "Saved and locked.") : null)))), h("div", { class: "dl-row" }, go));
  }
  async function submit(confirmed) {
    // E-5: the session is 'submit_pending' as soon as submit() starts: every answer is read-only and Submit is off until the server answers
    const p = c.submit({ confirmIncomplete: confirmed });
    if (c.session.S.sub === "submit_pending") draw({ text: "Submitting… your answers are frozen until the server confirms. Keep this page open.", cls: "dl-muted" });
    const r = await p;
    if (r.status.startsWith("needs_confirmation:")) { const n = r.status.split(":")[1]; return o.ask({ title: "Submit with " + n + " blank answer(s)?", text: "Blank answers score 0 and the homework will be marked Incomplete. You cannot change your answers after submitting.", ok: "Submit anyway", cancel: "Keep working", danger: true, onOk: () => submit(true) }); }
    if (r.status === "submit_pending" || r.status === "already_pending") return;
    if (r.status === "submitted" || r.status === "already_submitted") { store.set(dkey + ":done", { t: Date.now(), r: c.responses }); store.del(dkey); return result(c.review(), c.responses); }
    draw({ text: "Not submitted yet (" + (r.reason || r.error || r.status) + "). Your answers are kept: try again.", cls: "dl-err" });
  }
  function result(R, mine) {
    if (!R || !R.aggregate) { root.replaceChildren(h("p", { class: "dl-ok", text: "Submitted." })); return; }
    const a = R.aggregate; const ids = Object.keys(R.items || {});
    root.replaceChildren(h("div", { class: "dl-row" }, h("span", { class: "pill" }, "Homework · submitted")),
      h("div", { class: "dl-sum" }, h("div", {}, h("b", {}, pct(a.overall?.itemWeightedAssignmentScore)), "Score (whole homework, blanks count 0)"), h("div", {}, h("b", {}, a.result?.passed ? "Passed" : "Not passed"), "70% needed"),
        h("div", {}, h("b", {}, a.result?.completed ? "Completed" : "Incomplete"), (a.attemptedItems ?? 0) + " of " + (a.totalItems ?? ids.length) + " answered"), h("div", {}, h("b", {}, pct(a.attemptedAccuracy)), "Accuracy on answered items")),
      h("p", { class: "dl-muted" }, "This is your official result; it cannot change. Practising again later does not change it."), player,
      ...ids.map((id) => { const it = R.items[id]; const f = it.first; return h("div", { class: "dl-item" }, h("h4", {}, id + " · " + (LV[it.level] || it.level)),
        h("p", { class: "dl-fb " + (f?.exact ? "dl-ok" : "dl-bad") }, it.state !== "attempted" ? "Blank: 0" : f.exact ? "Fully correct." : f.num + " of " + f.den + (it.level === "answerSpotter" ? "" : " words in the right order") + " · not fully correct"),
        mine && mine[id] ? h("div", { class: "dl-muted" }, "Your answer: " + answerText(mine[id])) : null, reviewEl(R.review?.[id])); }));
  }
  draw();
}
const answerText = (r) => (r.answer ?? r.text ?? r.chosen ?? (Array.isArray(r.answers) ? r.answers.join(" · ") : Array.isArray(r.placedIds) ? "(word order)" : ""));

/* ---------- Teacher / admin authoring ---------- */
// original, made-up dialogue for the "Fill in a sample transcript" button (no audio: preview only)
const SAMPLE = "ANNA: Hello, I would like to join the photography club.\n\nTOM: Great. We meet on Thursday evenings at seven o'clock.\n\nANNA: Is there a membership fee?\n\nTOM: Yes, it costs twenty pounds a year, and new members get a free map of the city.";
export function mountAuthor(el, o) {
  // (11/2026, owner) "write the script" lessons: the teacher pastes the script of the recording; students write it all; the server marks it.
  css(); const S = { lid: "", audio: "", lessons: [], msg: null, words: 0 };
  const root = h("div", { class: "dl" }); el.replaceChildren(root);
  const title = h("input", { type: "text", "aria-label": "Lesson title", placeholder: "Lesson title" });
  const src = h("textarea", { rows: 10, spellcheck: "false", "aria-label": "Script of the recording", placeholder: "Paste the script of the recording here. One speaker turn per paragraph; “TOM:” labels are optional and are not marked." });
  const attest = h("input", { type: "checkbox", id: "dlAttest" }), checked = h("input", { type: "checkbox", id: "dlChecked" });
  const file = h("input", { type: "file", accept: "audio/*", "aria-label": "Lesson audio file" });
  const out = h("div", {}); const preview = h("div", {}); const list = h("div", {});
  const say = (text, cls) => { S.msg = { text, cls }; drawOut(); };
  file.addEventListener("change", async () => { const f = file.files[0]; if (!f) return; say("Uploading audio…"); try { const r = await o.uploadAudio(f); S.audio = r.url; say("Audio uploaded."); } catch (e) { say("Audio upload failed: " + (e.message || e), "dl-err"); } });
  src.addEventListener("input", () => { S.words = compareScript(src.value, "").words.script; drawOut(); });
  function drawOut() {
    const kids = [];
    if (S.msg) kids.push(h("p", { class: S.msg.cls || "dl-muted", role: "status" }, S.msg.text));
    kids.push(h("p", { class: "dl-muted" }, S.words + " words to write" + (S.audio ? " · audio added" : " · no audio yet (students need it)")));
    kids.push(h("div", { class: "dl-row" }, btn("Preview as a student", previewIt, "btn", { disabled: S.words < 5 }), btn(S.lid ? "Save as a new version" : "Save lesson", save, "btn pri", { disabled: S.words < 5 })));
    out.replaceChildren(...kids);
  }
  // the student screen, marked here on the device (no AI, nothing saved); o.renderResult draws it exactly like the student result
  function previewIt() {
    const box = h("textarea", { rows: 6, spellcheck: "false", autocomplete: "off", "aria-label": "Write what you hear (preview)" }); const res = h("div", {});
    preview.replaceChildren(h("div", { class: "dl-card" }, h("b", {}, "Student preview · nothing is saved"), S.audio ? audioPlayer(S.audio) : h("p", { class: "dl-muted" }, "No audio yet."), box,
      h("div", { class: "dl-row" }, btn("Check (preview)", () => { const r = compareScript(src.value, box.value); r.script = src.value; r.ai = { corrections: r.corrections, vocabulary_upgrades: [] }; if (o.renderResult) o.renderResult(res, r); else res.textContent = r.pct + "%"; }, "btn pri")), res));
  }
  async function save() {
    if (!attest.checked) return say("Tick “I may use this recording and script with my class” first.", "dl-err");
    try { const r = await o.staffApi("dictation/staff", { op: "save", lid: S.lid || undefined, title: title.value, script: src.value, checked: checked.checked, audio: S.audio }); S.lid = r.lid;
      say("Saved version " + r.n + (r.audited ? " (checked against the audio: can be homework)." : " (not checked against the audio: practice only).") + " Approve it below before students can use it.", "dl-ok"); loadList(); }
    catch (e) { say("Not saved: " + (e.message || e), "dl-err"); }
  }
  async function loadList() {
    try { const r = await o.staffApi("dictation/staff", { op: "list" }); S.lessons = (r.lessons || []).sort((x, y) => (y.ts || 0) - (x.ts || 0)); } catch (e) { list.replaceChildren(h("p", { class: "dl-err", text: "Could not load the lessons: " + (e.message || e) })); return; }
    const adm = (body, q) => o.ask({ title: q, ok: "Yes", onOk: async () => { try { await o.adminApi("admin/dictation", body); o.toast && o.toast("Done."); loadList(); } catch (e) { say(String(e.message || e), "dl-err"); } } });
    if (!S.lessons.length) { list.replaceChildren(h("p", { class: "dl-muted" }, "No dictation lessons yet. Follow the steps above to make the first one.")); return; }
    const pill = (t, on) => h("span", { class: "dl-pill" + (on ? " on" : "") }, t);
    list.replaceChildren(h("div", { class: "dl-cards" }, ...S.lessons.map((L) => { const aud = ["GATE_PASS", "GATE_PASS_WITH_EXCLUSIONS", "SCRIPT_CHECKED"].includes(L.gate); const fresh = L.approved === L.cur;
        return h("div", { class: "dl-card" }, h("b", {}, L.title), h("div", { class: "dl-pills" }, pill("Version " + L.cur), pill(aud ? "Checked against audio" : "Not checked · practice only", aud), pill(L.approved ? "Approved v" + L.approved + " · " + L.approvedMode : "Not approved", !!L.approved), pill(L.published ? "In the Library (v" + L.published + ")" : "Not in the Library", !!L.published)),
          h("div", { class: "dl-row" }, btn("Edit", () => edit(L.lid), "btn sm"),
            btn("Approve for practice", () => adm({ op: "approve", lid: L.lid, n: L.cur, mode: "practice" }, "Approve version " + L.cur + " of “" + L.title + "” for practice?"), "btn sm", { disabled: fresh && L.approvedMode === "practice" }),
            btn("Approve for homework", () => adm({ op: "approve", lid: L.lid, n: L.cur, mode: "homework" }, "Approve version " + L.cur + " of “" + L.title + "” for homework? Students will be marked on it."), "btn sm", { disabled: !aud || (fresh && L.approvedMode === "homework"), title: aud ? "" : "Not checked against the audio: practice only" }),
            btn("Publish to the selected slot", () => { const sl = o.getSlot ? o.getSlot() : null; if (!sl) return say("Pick a free Listening slot (book, test, part) or an Extra practice category at the top of Create first.", "dl-err"); adm({ op: "publish", lid: L.lid, bookId: sl.book, testId: sl.test, part: sl.part, cat: sl.cat || "" }, "Publish approved version " + L.approved + " of “" + L.title + "” to " + sl.label + "?"); }, "btn sm", { disabled: !L.approved }),
            L.published ? btn("Unpublish", () => adm({ op: "unpublish", lid: L.lid }, "Remove “" + L.title + "” from the Library? Submitted results are kept."), "btn sm bad") : null)); })));
  }
  async function edit(lid) {
    try { const r = await o.staffApi("dictation/staff", { op: "get", lid }); const v = r.version; S.lid = lid; title.value = v.title || ""; S.audio = v.audio || ""; attest.checked = true; checked.checked = !!v.audited;
      src.value = typeof v.script === "string" ? v.script : oldScript(v); S.words = compareScript(src.value, "").words.script; preview.replaceChildren();
      say("Editing “" + v.title + "” (version " + v.n + "). Saving creates a new version that needs approval again."); } catch (e) { say(String(e.message || e), "dl-err"); }
  }
  const oldScript = (v) => { try { const d = JSON.parse(v.json); const off = new Set(v.deselected || []); return d.transcript.sentences.filter((x) => x.enabled !== false && !off.has(x.id)).map((x) => x.cleanText).join(" "); } catch { return ""; } };
  const guide = h("details", { class: "dl-guide", open: !store.get("md-dlguide2") || null, ontoggle: (e) => store.set("md-dlguide2", e.target.open ? 0 : 1) }, h("summary", {}, "How to make a dictation exercise (5 steps)"),
    h("ol", {},
      h("li", {}, h("b", {}, "Pick a slot "), "(book, test, Listening Part) or an Extra practice category at the top of Create. That is where students will find it."),
      h("li", {}, h("b", {}, "Type a title and paste the script "), "of the recording. Students will write the whole script; capital letters, punctuation and “TOM:” labels are not marked, spelling and word endings are."),
      h("li", {}, h("b", {}, "Upload the audio "), "(mp3 / m4a). Tick “I may use this recording…”. Tick “I checked the script against the audio” only if every word matches the recording: that is needed for homework."),
      h("li", {}, h("b", {}, "Try it "), "with ", h("b", {}, "Preview as a student"), ", then ", h("b", {}, "Save lesson"), "."),
      h("li", {}, "In ", h("b", {}, "Lessons"), " below: ", h("b", {}, "Approve for practice"), " (or for homework), then ", h("b", {}, "Publish to the selected slot"), ". To give it as homework, add it to an assignment in Classes.")),
    h("p", { class: "dl-muted" }, "After a student submits, the app marks every word, the AI explains each mistake (also in Vietnamese) and suggests new words from the script; the mistakes go to the student's Error Notebook."),
    h("div", { class: "dl-row" }, btn("Fill in a sample script", () => { title.value = "Sample: joining a club"; src.value = SAMPLE; attest.checked = true; S.words = compareScript(SAMPLE, "").words.script; say("Sample filled in (no audio: preview only)."); }, "btn sm")));
  root.append(h("section", { class: "dl-sec" }, h("h3", {}, "Dictation lesson"), guide,
      title, src, h("label", { class: "dl-opt" }, attest, "I may use this recording and script with my class"), h("label", { class: "dl-opt" }, checked, "I checked the script against the audio (needed for homework)"),
      h("div", { class: "dl-row" }, h("span", { class: "dl-muted" }, "Audio:"), file), h("div", { class: "dl-row" }, btn("New lesson", () => { S.lid = ""; S.audio = ""; S.words = 0; title.value = ""; src.value = ""; checked.checked = false; preview.replaceChildren(); say("New lesson."); }, "btn sm")), out, preview),
    h("section", { class: "dl-sec" }, h("h3", {}, "Lessons"), list));
  drawOut(); loadList();
}
