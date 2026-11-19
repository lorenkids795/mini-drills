# Dictation Lab hybrid engine (draft 0.3, contract v1.1)

Deterministic, dependency-free JavaScript engine for the Mini Drills Dictation Lab: Level 1 (word builder), Level 2 (blanks),
Level 3 (one sentence), Level 4 (several sentences) and Answer Spotter, plus attempts, review gate, informational exposure,
aggregation and PASS, and the homework protocol. It implements `../dictation-scoring-contract-v1.1.md` (owner policy 2026-11).

* **No hint, no reveal, no answer preview** anywhere: there is no such function, and events with those names are `unsupported_event`.
* No DOM, no network, no clock, no `Math.random`, no AI, no paid service. Runs in browsers and Node 18+ (Cloudflare Workers: untested).
* Pure: a practice sitting is a function of `(options, event log)`; replaying the log rebuilds the identical state (D-32).
* **Status: draft, not integrated, not in production.** Owner-approved policy is implemented; human-only items stay open (`../decision-log-v1.1.md`).

## Two places, two jobs

| Where | What runs there | What it holds |
|---|---|---|
| Student device, **free practice** | `createRun` / `DictationRun` | the practice lesson **including its answer key** (disclosed trade-off, O-2); review opens per item after a valid Check |
| Student device, **homework** | `HomeworkClient` | **only** `homeworkPayload` from the server: no lesson, no answer key, no transcript. It records draft answers and submits the final answers |
| Server (a Worker), **homework** | `homeworkPayload`, `releasePhase`, `validateSubmission`, `scoreHomework`, `storageRecord` | the authoritative versioned lesson; scores each item once (the official first attempt); returns review only with an accepted submission |

`createMemoryServer` is an in-memory stand-in for the server (tests and the reference page). Nothing here talks to Firebase.

## Layers

```
DictationRun (run.js)                       free practice sitting + the scoring core the server reuses; no rule of its own
 ├─ buildExerciseSet (content.js)           explicit items + mechanical defaults (Transcript Only); never Answer Spotter
 ├─ Lesson, scoreAnswerSpotter, reviewUnlock (scoring.js)   L1-L4 and Answer Spotter scoring, provenance, v1.1 review gate
 │    └─ tokenize / prepareAnswer (normalize.js), scoreVariants / align (align.js)
 ├─ Session, reduceAttempts, deriveExposure, aggregateScores (session.js)   attempts, exposure (informational), PASS, submission state
 ├─ studentItem (payload.js)                what a student may see before a Check
 └─ WordBuilder, shuffle, Frac
HomeworkClient, homeworkPayload, scoreHomework, storageRecord, createMemoryServer (homework.js)
```

## Free practice

```js
import { validateDictationDocument } from "../js-validator/src/index.js";
import { createRun } from "./src/index.js";
const run = createRun({ doc, validation: validateDictationDocument(doc, { schema }), version: "lesson-42@3", seed: 1234 });
run.items();                                  // [{id, level, kind:'scored'|'review', pairedWith?}] typed Answer Spotter first, then the levels
run.present("l3-001");                        // {status:'ok', payload, contentLabel} or {status:'locked', reason:'answer_spotter_first', waitFor}
run.check("l3-001", { answer: typed });       // {status:'recorded'|'empty_answer'|'duplicate_ignored'|'rejected'|'locked', score, reviewAvailable, reviewWaitsFor?}
run.review("l3-001");                         // {status:'ok', review:{text}} only after a valid Check; otherwise {status:'locked', reason, waitFor}
run.summary();                                // {items, aggregate, session, reviews, content:{audited,label}, official:false, analyticsEligible:false}
```

* `content.label`: `teacher_audited` or `unverified_transcript` (`GATE_NOT_AUDITED`: practice only, show "transcript quality is not verified").
* `score` before review opens is **numbers only** (exact, num/den, missing, extra, target errors). After it opens, `score.detail` adds the full result.
* An empty or punctuation-only Check is not an attempt and opens nothing. The first valid attempt is frozen; later checks are practice (`practiceAttempts`, `currentPractice`).
* Independent Answer Spotter items protect their answers: Level 1/2 items and multiple-choice options that would show such an answer are `locked` until that item is checked, and reviews that would show it wait (`reviewWaitsFor`).
* `exposureAtFirstCheck` (none / tokens_shown / context_shown / answer_shown / unknown) is information for teachers, never a grade.

## Homework

```js
// SERVER (Worker): approval = the teacher's approval of exactly this content version; audited content only.
const serverOpts = { doc, validation, version: "lesson-42@3", seed, approval: { approved: true, version: "lesson-42@3" } };
const payload = homeworkPayload(serverOpts, { assignmentId });         // send this to the device, nothing else
// … phase 2 (only when needed): releasePhase(serverOpts, { assignmentId }) after storing the phase-1 answers of phaseLockIds(serverOpts)
const v = validateSubmission(req, { assignmentId, contentVersion, items: homeworkPayload(serverOpts, { phase: 9 }).items });
const scored = scoreHomework(req, serverOpts, { locked: storedPhase1Answers });   // {items, aggregate (result.passed/completed), review, official, analyticsEligible}
const { record } = storageRecord(scored, { responses: req.responses });          // scores only unless a retention period is approved

// DEVICE
const c = new HomeworkClient(payload, { transport: { lockPhase, submit }, makeKey: () => crypto.randomUUID() });
c.answer("l3-001", { answer: typed });      // draft only; {status:'draft_updated'|'rejected'|'locked_phase'|'locked_after_submit'}
await c.continueToNextPhase();               // only when c.morePhases
await c.submit();                            // 'needs_confirmation:N' when there are blanks; then submit({confirmIncomplete:true})
c.review();                                  // {status:'locked_until_submitted'} until the server accepted; then {items, aggregate, review}
```

* Request: `{schema:'dictation-submission/2', assignmentId, contentVersion, idempotencyKey, responses:{itemId: response}}` — final answers only, no event log, no identity (the server knows who is signed in).
* The server must check: ID token, class membership, assignment window (late pass per assignment occurrence), version, size (256 KB, 4000 characters, 200 items), item ids, and idempotency per (student, assignment, version).
* PASS: `aggregate.result.passed` = whole-assignment, item-weighted score ≥ 70% (blanks 0). Also `completed`, `attemptedAccuracy`, `completionRate`.

## Student payloads (`studentItem`)

| Level | Fields | Never contains |
|---|---|---|
| level1 | `{id, level, audio{sentenceIds}, tiles[{id, text}]}` (seeded shuffle, never the correct order) | — (tiles are the scaffold) |
| level2 | `{id, level, audio, blanks, segments[{text}|{blank}]}` | the hidden words |
| level3 / level4 | `{id, level, audio{sentenceIds}, sentenceCount?, multiSpeaker?}` | any sentence text |
| answerSpotter (independent) | `{id, level, activity, responseMode, prompt, sourceLabel, answerFormat, options?}` | span roles, answers, explanation, reasons, accepted forms, evidence text or sentence ids (no audio pointer, P-03) |
| post-check review | `{…, transcript}` only when the gate is open, otherwise `{locked: true}`; homework: never in the payload | — |

## Tests (`npm test`, no install)

| File | Tests |
|---|---|
| `test/golden.test.js` | the 259 v1.1 golden vectors in process: 255 pass, 4 `engine_ui` NOT RUN |
| `test/run.test.js` | validator/content gates, no hint/reveal (API + injected events), every level, review gate, independent-item protection, feedback without answer text, exposure, frozen first attempt, payload safety, replay, Transcript Only, hostile shapes |
| `test/homework.test.js` | payload has no answer data (both phases), phase plan + lock, no Check/review before ack, happy path + PASS, network failure, lost ack, authorisation and validation, server ignores client scores, approval/audit gate, storage/retention, drafts |
| `test/policy.test.js` | owner rules 4 and 5: reversed/inserted/deleted words, case, apostrophes, contractions, s/ed, numbers/currency/units, long L4, misleading labels, 4000 characters (Vietnamese, CJK, emoji), hostile HTML |
| `test/engine.test.js`, `test/regression.test.js` | building blocks, invariants on random logs, R1–R6, G1–G3 |
| `tools/mutation-check.mjs` | 45 planted defects in the engine source, each must make at least one test fail |
