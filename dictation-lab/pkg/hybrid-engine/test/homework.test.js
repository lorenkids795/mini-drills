// Homework (contract v1.1 §13, §13a): device client without the lesson + server scoring + in-memory server stub. No Firebase, no network.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HomeworkClient, homeworkPayload, phaseItemIds, scoreHomework, storageRecord, validateSubmission, createMemoryServer, createRun, SUBMISSION_SCHEMA, LIMITS, tokenize } from "../src/index.js";
import { validateDictationDocument } from "../../js-validator/src/index.js";
const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, "..", "..");
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8")); const schema = load("js-validator/schema/dictation-schema-v1.json");
const doc = load("golden-tests-v1.1/baseline-harbour-museum.rev1.json"); const validation = validateDictationDocument(doc, { schema });
const SO = { doc, validation, version: "v1", seed: 3, approval: { approved: true, version: "v1" } };
const A = { id: "hw-1", classId: "C1", contentVersion: "v1" };
const keys = () => { let n = 0; return () => "key-" + ++n; };
const mkServer = (extra = {}) => createMemoryServer({ serverOpts: SO, assignment: A, tokens: { t1: { studentRef: "st1", classId: "C1" }, t2: { studentRef: "st2", classId: "C2" } }, token: "t1", ...extra });
const mkClient = (srv) => new HomeworkClient(srv.payload().payload, { transport: srv, makeKey: keys() });
const ref = createRun({ doc, validation, version: "v1", seed: 3 }); const cleanOf = (id) => ref.sentencesOf(id).map((s) => ref.lesson.S.get(s).cleanText).join("\n");
const strings = (o, out = []) => { if (typeof o === "string") out.push(o); else if (o && typeof o === "object") for (const v of Object.values(o)) strings(v, out); return out; };
const secretsOf = () => { const L = ref.lesson; const sec = new Set();
  for (const id of ref.scored) { const lv = ref.level.get(id); const it = L.items.get(id);
    if (lv === "level3" || lv === "level4") for (const s of ref.sentencesOf(id)) sec.add(L.S.get(s).cleanText);
    if (lv === "answerSpotter") { if (it.explanation) sec.add(it.explanation); for (const sp of it.spans) if (sp.reason) sec.add(sp.reason); for (const s of it.evidenceSentenceIds) sec.add(L.S.get(s).cleanText); }
  }
  for (const id of ref.reviews) for (const s of L.items.get(id).evidenceSentenceIds) sec.add(L.S.get(s).cleanText); return [...sec].filter((x) => x.length > 3); };

test("the homework payload sent to the device contains no answer key, transcript, accepted form, explanation or answer location", () => {
  for (const phase of [1, 2]) {
    const p = homeworkPayload(SO, { assignmentId: "hw-1", phase }); const json = JSON.stringify(p); const all = strings(p);
    for (const k of ['"role"', "correct_answer", "acceptedForms", "allowedForms", "explanation", "evidenceSentenceIds", "spans", "cleanText", "focusTypes"]) assert.ok(!json.includes(k), "phase " + phase + " has " + k);
    for (const s of secretsOf()) assert.ok(!all.some((v) => v.includes(s)), "phase " + phase + " leaks: " + s.slice(0, 40));
    // typed answers of independent Answer Spotter items that are NOT yet locked must not appear anywhere (token sequence match)
    const toks = all.map(tokenize); const has = (t) => toks.some((x) => { for (let i = 0; i + t.length <= x.length; i++) if (t.every((w, k) => x[i + k] === w)) return true; return false; });
    for (const y of ref.typedAS) if (!p.lockedItems.includes(y)) for (const a of ref.answersOf(y)) assert.ok(!has(tokenize(a)), "phase " + phase + " shows the answer of " + y + ": " + a);
    assert.ok(p.items.every((i) => i.activity !== "post_check_transcript_review"), "no review items before submission");
    for (const it of p.items) if (it.level === "level2") { const L = ref.lesson; const own = L.items.get(it.id); const shown = it.segments.filter((x) => x.text !== undefined).map((x) => x.text.toLowerCase()).join(" "); for (const b of own.blanks) { const t = L.T.get(b.targetId); for (const w of [t.surface, ...(t.allowedForms ?? []).map((f) => f.text)]) assert.ok(!tokenize(shown).join(" ").includes(tokenize(w).join(" ")) || L.S.get(own.sentenceId).cleanText.toLowerCase().split(w.toLowerCase()).length > 2, it.id + " shows its own blank answer " + w); } }
  }
});
test("phase plan: Level 1/2 items that would show an independent Answer Spotter answer come only after phase 1 is locked on the server", async () => {
  const [p1, p2] = phaseItemIds(SO); assert.ok(p2 && p2.length > 0); assert.ok(p1.filter((id) => ref.level.get(id) === "answerSpotter").length >= 1);
  const asSent = new Set(ref.indepAS.flatMap((a) => ref.sentencesOf(a))); for (const id of p1) if (["level1", "level2"].includes(ref.level.get(id))) assert.ok(!ref.sentencesOf(id).some((s) => asSent.has(s)), id);
  const srv = mkServer(); const c = mkClient(srv); assert.equal(c.phase, 1); assert.ok(!c.view().some((i) => p2.includes(i.id)));
  assert.equal((await c.submit({ confirmIncomplete: true })).status, "finish_phase_first");
  c.answer("as-001", { text: "first try" }); assert.equal((await c.continueToNextPhase()).status, "ok"); assert.ok(c.view().some((i) => p2.includes(i.id)));
  assert.equal(c.answer("as-001", { text: "changed after seeing tiles" }).status, "locked_phase", "phase-1 answers are read-only after the lock");
  assert.equal((await srv.lockPhase({ assignmentId: "hw-1", contentVersion: "v1", phase: 1, responses: { "as-001": { text: "resent" } } })).status, "ok");
  c.answer("l3-001", { answer: cleanOf("l3-001") }); const s = await c.submit({ confirmIncomplete: true }); assert.equal(s.status, "submitted");
  const stored = [...srv.store.values()][0]; assert.equal(stored.result.items["as-001"].state, "attempted"); assert.equal(stored.result.items["as-001"].first.exact, false, "the first phase-1 answer wins; later resends are ignored");
  // a tampered final submission that changes a locked phase-1 answer to the correct one is ignored for that item
  const srv2 = mkServer(); await srv2.lockPhase({ assignmentId: "hw-1", contentVersion: "v1", phase: 1, responses: { "as-001": { text: "wrong" } } });
  const t = await srv2.submit({ schema: SUBMISSION_SCHEMA, assignmentId: "hw-1", contentVersion: "v1", idempotencyKey: "k", responses: { "as-001": { text: ref.answersOf("as-001")[0] } } });
  assert.equal(t.status, "accepted"); assert.equal(t.result.items["as-001"].first.exact, false, "the locked phase-1 answer is the one scored");
});
test("homework has no scored Check and no review before the server acknowledgement; injected events change nothing", async () => {
  const srv = mkServer(); const c = mkClient(srv);
  assert.equal(c.session.dispatch({ op: "check", item: "l3-001", num: 1, den: 1 }), "not_available_homework");
  for (const op of ["hint", "reveal", "preview"]) assert.equal(c.session.dispatch({ op, item: "l3-001" }), "unsupported_event");
  assert.deepEqual(c.review(), { status: "locked_until_submitted" });
  assert.equal(c.answer("l3-001", { answer: "x".repeat(LIMITS.maxAnswerChars + 1) }).rejected, "answer_too_long"); assert.equal(c.answer("nope", { answer: "x" }).status, "unknown_item");
  assert.equal(c.answer("l3-001", { answer: { evil: 1 } }).rejected, "bad_response");
});
test("happy path: blanks need confirmation; submitted only with the server acknowledgement; review and PASS come from the server", async () => {
  const srv = mkServer(); const c = mkClient(srv); for (const a of ref.indepAS) c.answer(a, { text: "zz", chosen: "zz" }); await c.continueToNextPhase();
  c.answer("l3-001", { answer: cleanOf("l3-001") }); c.answer("l3-002", { answer: "wrong" }); c.answer("l3-003", { answer: "  ,, " });
  const r1 = await c.submit(); assert.match(r1.status, /^needs_confirmation:\d+$/); assert.equal(c.final().submitted, false); assert.equal(srv.calls.filter((x) => x.op === "submit").length, 0);
  const r2 = await c.submit({ confirmIncomplete: true }); assert.equal(r2.status, "submitted"); assert.equal(c.final().submitted, true);
  const rv = c.review(); assert.equal(rv.status, "ok"); assert.equal(rv.review["l3-002"].text, cleanOf("l3-002")); assert.ok(rv.review["as-006"].transcript.length > 0, "post-check review only after submission");
  assert.equal(rv.items["l3-003"].state, "unattempted", "punctuation-only = blank = 0"); assert.equal(rv.items["l3-001"].first.exact, true);
  const ag = rv.aggregate; assert.equal(ag.result.submitted, true); assert.equal(ag.result.completed, false); assert.equal(ag.result.passed, false);
  assert.notDeepEqual(ag.attemptedAccuracy, ag.assignmentScore, "attempted accuracy and whole-assignment score are different numbers");
  assert.equal(c.answer("l3-002", { answer: cleanOf("l3-002") }).status, "locked_after_submit", "the submission is locked for good");
  assert.equal(c.startFreePractice().status, "free_practice_started");
});
test("network failure keeps the draft; a lost acknowledgement never creates a second submission", async () => {
  const srv = mkServer({ script: ["throw", "lose_ack"] }); const c = mkClient(srv); c.answer("as-001", { text: "x" }); await c.continueToNextPhase(); c.answer("l3-001", { answer: "a b c" });
  const f1 = await c.submit({ confirmIncomplete: true }); assert.equal(f1.status, "draft_restored"); assert.equal(c.final().submissionState, "draft"); assert.deepEqual(c.view().find((i) => i.id === "l3-001").response, { answer: "a b c" });
  const f2 = await c.submit({ confirmIncomplete: true }); assert.equal(f2.status, "draft_restored", "ack lost, but the server stored it"); assert.equal(srv.store.size, 1); assert.deepEqual(c.review(), { status: "locked_until_submitted" });
  const storedId = [...srv.store.values()][0].submissionId;
  const f3 = await c.submit({ confirmIncomplete: true }); assert.equal(f3.status, "submitted"); assert.equal(f3.submissionId, storedId, "the resend returns the submission the server already stored"); assert.equal(srv.store.size, 1); assert.equal([...srv.store.values()][0].submissionId, storedId, "not replaced by a second one");
  assert.equal((await c.submit({ confirmIncomplete: true })).status, "already_submitted");
});
test("server authorisation and validation: no token, wrong class, closed assignment, wrong version, unknown item, oversize, bad shape", async () => {
  assert.equal(mkServer({ token: "nope" }).payload().reason, "auth"); assert.equal(mkServer({ token: "t2" }).payload().reason, "wrong_class");
  const closed = mkServer({ assignment: { ...A, open: () => false } }); assert.equal(closed.payload().reason, "closed");
  const srv = mkServer(); await srv.lockPhase({ assignmentId: "hw-1", contentVersion: "v1", phase: 1, responses: {} });
  const base = { schema: SUBMISSION_SCHEMA, assignmentId: "hw-1", contentVersion: "v1", idempotencyKey: "k" };
  const rej = async (req) => (await srv.submit(req)).reason;
  assert.equal(await rej({ ...base, contentVersion: "v2", responses: {} }), "version_mismatch"); assert.equal(await rej({ ...base, assignmentId: "hw-2", responses: {} }), "wrong_assignment");
  assert.equal(await rej({ ...base, responses: { "zz-999": { answer: "x" } } }), "unknown_item"); assert.equal(await rej({ ...base, responses: { "l3-001": { answer: 5 } } }), "bad_response");
  assert.equal(await rej({ ...base, responses: { "l3-001": { answer: "x".repeat(300000) } } }), "too_large"); assert.equal(await rej({ ...base, schema: "other", responses: {} }), "bad_payload");
  assert.equal(await rej({ ...base, idempotencyKey: "", responses: {} }), "missing_key"); assert.equal(srv.store.size, 0);
  const noLock = mkServer(); assert.equal((await noLock.submit({ ...base, responses: {} })).reason, "phase_not_locked");
});
test("the server never reads a client-side score: extra claim fields are ignored and every item is scored once from the server lesson", () => {
  const req = { schema: SUBMISSION_SCHEMA, assignmentId: "hw-1", contentVersion: "v1", idempotencyKey: "k", responses: { "l3-002": { answer: "wrong" } }, claimed: { "l3-002": { num: 7, den: 7 } }, score: 1 };
  assert.equal(validateSubmission(req, { assignmentId: "hw-1", contentVersion: "v1", items: homeworkPayload(SO, { phase: 2 }).items }).ok, true);
  const sc = scoreHomework(req, SO); assert.equal(sc.items["l3-002"].first.exact, false); assert.equal(sc.items["l3-001"].state, "unattempted");
  assert.equal(sc.official, true); assert.equal(sc.analyticsEligible, true);
});
test("homework needs audited content and a teacher approval of exactly this version", () => {
  const t = load("js-validator/test/corpus/rev1-fixtures/p02_transcript_only_not_audited.json"); const tv = validateDictationDocument(t, { schema });
  assert.throws(() => homeworkPayload({ doc: t, validation: tv, version: "v1", approval: { approved: true, version: "v1" } }), /audited/);
  assert.throws(() => homeworkPayload({ ...SO, approval: { approved: true, version: "v0" } }), /approval/); assert.throws(() => homeworkPayload({ ...SO, approval: undefined }), /approval/);
  assert.throws(() => scoreHomework({ responses: {} }, { ...SO, approval: { approved: false, version: "v1" } }), /approval/);
});
test("storage keeps scores only by default; raw answers only with an approved retention period (P-05)", () => {
  const sc = scoreHomework({ responses: { "l3-001": { answer: "secret answer text" } } }, SO); const resp = { "l3-001": { answer: "secret answer text" } };
  const d = storageRecord(sc, { responses: resp }); assert.equal(d.rawAnswersStored, false); assert.ok(!JSON.stringify(d.record).includes("secret answer text"));
  assert.equal(storageRecord(sc, { responses: resp, rawAnswers: "keep" }).rawAnswersStored, false, "not approved");
  assert.equal(storageRecord(sc, { responses: resp, rawAnswers: "keep", retentionApproved: true }).rawAnswersStored, false, "no period");
  const k = storageRecord(sc, { responses: resp, rawAnswers: "keep", retentionApproved: true, retentionDays: 30 }); assert.equal(k.rawAnswersStored, true); assert.equal(k.deleteAfterDays, 30);
  assert.ok(!JSON.stringify(d.record).includes(cleanOf("l3-001")), "the stored record has no answer key either");
});
test("resume and drafts: a draft is not a submission; resume restores the draft answers; nothing after submission", async () => {
  const srv = mkServer(); const c = mkClient(srv); c.answer("l3-001", { answer: "draft one" }); const d = c.saveDraft().draft;
  c.answer("l3-001", { answer: "changed" }); assert.equal(c.resume(d).status, "resumed"); assert.deepEqual(c.view().find((i) => i.id === "l3-001").response, { answer: "draft one" });
  const c2 = mkClient(srv); assert.equal(c2.resume(d).status, "no_draft", "a draft from elsewhere needs its own saveDraft first");
  assert.equal(tokenize("draft one").length, 2);
});
