// DEV-ONLY: plants one defect at a time in a COPY of the engine source and runs the full engine test suite (golden vectors
// included) against it. A mutant is "detected" when at least one test fails. Proves the tests guard the JS engine itself,
// not only the Python specification oracle. Contract v1.1 (golden-tests-v1.1).   Run:  node tools/mutation-check.mjs   (from hybrid-engine/; ~1-3 minutes)
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)); const eng = join(here, ".."); const copy = join(eng, "..", "hybrid-engine-mutant");
const M = [
  ["normalize.js", "|| c === \"%\" ", "", "trailing % stripped (D-17)"],
  ["normalize.js", "if ((c === \"-\" || c === \".\") && nxt && ND.test(nxt)) break;", "", "leading minus / decimal point stripped"],
  ["normalize.js", ".replace(/\\u2212/g, \"-\").toLowerCase()", ".replace(/\\u2212/g, \"-\")", "case-sensitive scoring (D-23)"],
  ["normalize.js", ".replace(/[\\u2019\\u2018\\u02bc]/g, \"'\")", "", "curly apostrophe not mapped"],
  ["normalize.js", "for (const L of [...cands]) if", "if (false) for (const L of [...cands]) if", "speaker-label guard removed (SPK-008)"],
  ["normalize.js", "export const MAX_ANSWER_CHARS = 4000;", "export const MAX_ANSWER_CHARS = 40000;", "length limit raised (D-15)"],
  ["normalize.js", "|| BIDI.has(c)", "", "bidi controls kept"],
  ["align.js", "const den = Math.max(etok.length, a.length);", "const den = Math.min(etok.length, a.length) || 1;", "denominator min(n,m): extra words not penalised"],
  ["align.js", "exact: etok.length === a.length && etok.every", "exact: etok.every", "exact ignores extra tokens"],
  ["align.js", "\"number\", \"date_time\", \"price\"", "\"number\", \"date_time\"", "price errors not critical"],
  ["scoring.js", "forms.filter((f) => f.approvalState === \"teacher_approved\")", "forms.slice()", "unapproved forms accepted (C3)"],
  ["scoring.js", "&& c.rightsAttested === true", "", "official label without rights attestation"],
  ["scoring.js", "num: m, den: Math.max(cands.length, parts.length) };", "num: m, den: cands.length };", "list answers: extra guesses not penalised"],
  ["scoring.js", "if (fmt.maxWords && toks.length > fmt.maxWords) return { correct: false, rejected: \"exceeds_word_limit\", num: 0, den: 1 };", "", "word limit ignored"],
  ["session.js", "if (ev.answer !== undefined && ev.answer === last) continue;", "", "identical re-check counted (D-18)"],
  ["session.js", "+ sum(g.filter((i) => !isAtt(i)), (i) => i.expectedDen)", "", "assignment score over attempted items only (D-19)"],
  ["session.js", "out.assignmentScore = hw && submitted ? proj : null;", "out.assignmentScore = proj;", "assignment score before server ack / in free practice"],
  ["session.js", "const valid = items.filter((i) => i.expectedDen > 0);", "const valid = items;", "zero-token items counted (D-29)"],
  ["session.js", "if (!ev.submissionId) return \"invalid_ack_ignored\";", "", "ack without submissionId accepted (D-20)"],
  ["session.js", "if (ev.key !== S.key) return \"mismatched_ack_ignored\";", "", "ack for another key accepted"],
  ["session.js", "S.key = ev.key; S.unanswered = inc; S.sub = \"submit_pending\"; return \"submit_pending\";", "S.key = ev.key; S.unanswered = inc; S.sub = \"submitted\"; S.subId = \"x\"; return \"submitted\";", "submitted without the server"],
  ["content.js", "&& !blocked.has(s.id)", "", "blocked sentences used (C14)"],
  ["content.js", "res.answerSpotter = explicit(\"answerSpotter\")", "res.answerSpotter = [...explicit(\"answerSpotter\"), ...elig.slice(0, 1).map((s) => ({ id: \"as-auto\", activity: \"independent_listening\", responseMode: \"type_answer\", evidenceSentenceIds: [s.id], spans: [] }))]; void explicit(\"answerSpotter\")", "Answer Spotter auto-generated"],
  ["wordbuilder.js", "const toks = displayTokens(cleanText);", "const toks = cleanText.trim().split(/\\s+/).map((t) => t.replace(/^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$/gu, \"\")).filter((t) => /[\\p{L}\\p{N}]/u.test(t));", "R1 regression: tiles lose £ and %"],
  ["payload.js", "if (it.responseMode === \"choose_option\") base.options", "base.spans = it.spans; if (it.responseMode === \"choose_option\") base.options", "answer data leaks into the student payload (AS-027)"],
  ["prng.js", "const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);", "const same = () => false;", "shuffle may return the correct order (both guards off)"],
  ["scoring.js", "return validChecks >= 1 && blockedBy.length === 0;", "return validChecks >= 1;", "review discloses an unchecked independent Answer Spotter answer (v1.1)"],
  ["scoring.js", "if (mode === \"homework\") return submission === \"submitted\";", "if (mode === \"homework\") return submission !== \"draft\";", "homework review while the submission is only pending (v1.1)"],
  ["session.js", "default: return \"unsupported_event\";", "default: return \"ok\";", "hint/reveal events accepted (v1.1)"],
  ["session.js", "return lock ?? \"not_available_homework\";", "if (!lock && S.items[ev.item] && ev.op === \"check\") { S.items[ev.item].log.push({ op: \"check\", num: ev.num, den: ev.den }); return \"recorded\"; } return lock ?? \"not_available_homework\";", "homework accepts a scored Check before submission (v1.1)"],
  ["session.js", "if (lock) return lock; const it = S.items[ev.item]; if (!it) return \"unknown_item\";", "const it = S.items[ev.item]; if (!it) return \"unknown_item\";", "homework answers editable after submission (D-22)"],
  ["session.js", "const first = att[0] ?? null;", "const first = att[att.length - 1] ?? null;", "latest attempt used instead of the first (frozen first attempt)"],
  ["session.js", "const official = hw && submitted ? res.overall.itemWeightedAssignmentScore : null;", "const official = hw && submitted ? res.overall.itemWeightedAttemptedAccuracy : null;", "PASS on attempted-only accuracy (O-3)"],
  ["session.js", "if (S.draft === null) return \"no_draft\"; if (lock) return lock;", "if (S.draft === null) return \"no_draft\";", "resume overwrites a pending or submitted homework"],
  ["run.js", "if (r.sanitized) base.sanitized = true;\n  return open ? { ...base, detail: r } : base;", "if (r.sanitized) base.sanitized = true;\n  return { ...base, detail: r };", "answer-bearing feedback detail before the review gate opens"],
  ["run.js", "validChecks: this.validChecks(id), blockedBy }), blockedBy, needs:", "validChecks: 1, blockedBy }), blockedBy, needs:", "free-practice review before any valid Check"],
  ["run.js", "{ const b = this.presentBlockers(id); if (b.length) return { status: \"locked\", reason: \"answer_spotter_first\", waitFor: b, exposure: null }; }", "", "Level 1/2 or options shown before the independent item is answered"],
  ["run.js", "return this.typedAS.filter((y) => y !== id && this.answersOf(y).some((a) => has(tokenize(a))));", "return [];", "cross-item disclosure detection off"],
  ["run.js", "if (!approval || approval.approved !== true || approval.version !== version) throw new Error(\"createRun: homework needs a teacher approval of content version \" + version);", "", "homework without a teacher approval of the version"],
  ["run.js", "if (!audited) throw new Error(\"createRun: homework needs teacher-audited content (gate \" + gate + \" is practice only)\");", "", "unaudited transcript allowed as homework (P-04)"],
  ["homework.js", "items: phases.slice(0, ph).flat().map(item)", "items: phases.flat().map(item)", "phase-2 items sent before phase 1 is locked"],
  ["homework.js", "const R = { ...(req.responses ?? {}), ...locked };", "const R = { ...locked, ...(req.responses ?? {}) };", "locked phase-1 answers overwritten at submission"],
  ["homework.js", "const keepRaw = policy.retentionApproved === true && Number.isInteger(policy.retentionDays) && policy.retentionDays > 0 && policy.rawAnswers === \"keep\";", "const keepRaw = !!policy.responses;", "raw answers stored without an approved retention period (P-05)"],
  ["homework.js", "if (store.has(dup)) {", "if (false) {", "a lost acknowledgement creates a second submission"],
  ["homework.js", "if (req.contentVersion !== expected.contentVersion) return { ok: false, reason: \"version_mismatch\" };", "", "submission for another content version accepted (D-21)"],
];
const rows = [];
for (const [file, from, to, what] of M) {
  if (existsSync(copy)) rmSync(copy, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  cpSync(eng, copy, { recursive: true, filter: (p) => !p.includes("node_modules") && !p.endsWith("golden-engine-report.json") });
  const f = join(copy, "src", file); const src = readFileSync(f, "utf8");
  if (!src.includes(from)) { rows.push({ file, what, status: "PATTERN_NOT_FOUND" }); continue; }
  writeFileSync(f, src.replace(from, to));
  const r = spawnSync(process.execPath, ["--test", "test/*.test.js"], { cwd: copy, encoding: "utf8", timeout: 300000 });
  const failed = (r.stdout.match(/^ℹ fail (\d+)/m) ?? [])[1];
  rows.push({ file, what, status: r.status !== 0 ? "DETECTED" : "SURVIVED", failingTests: failed === undefined ? null : Number(failed) });
  process.stdout.write(`${rows.at(-1).status.padEnd(18)} ${file.padEnd(15)} ${what}\n`);
}
rmSync(copy, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
const det = rows.filter((r) => r.status === "DETECTED").length;
writeFileSync(join(eng, "mutation-report.json"), JSON.stringify({ mutants: rows.length, detected: det, rows }, null, 1));
console.log(`ENGINE MUTATION CHECK: ${det} of ${rows.length} planted defects detected`); process.exit(det === rows.length ? 0 : 1);
