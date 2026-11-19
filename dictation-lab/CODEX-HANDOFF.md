# Codex handoff: integrating the Dictation Lab engine (contract v1.1) into Mini Drills

Audience: the coding agent (Codex) that will integrate this package into the existing Mini Drills repository.
State on 2026-11-18 (package R3): **nothing is integrated**. No repository, Firebase project, Cloudflare project, KV, R2 bucket or GitHub
branch was touched while producing this package. The owner-approved teaching policy (no hint, no reveal, review only after a valid
Check / after the server acknowledgement, homework scored on the server, PASS on the whole assignment) is implemented in the engine.

Read in this order: this file → `pkg/dictation-scoring-contract-v1.1.md` (normative, Vietnamese) → `pkg/decision-log-v1.1.md` →
`pkg/hybrid-engine/README.md` (API) → `pkg/js-validator/README.md` → `qa-results.md`. Contract v1 is history only.

---

## 1. What you are integrating

| Module | Path | Runtime | Role |
|---|---|---|---|
| Validator | `pkg/js-validator/src/` | browser + Node + Workers, ES modules, 0 deps | Gate for every imported lesson JSON (schemaVersion 1.1). Unchanged in R3 |
| Engine, practice | `pkg/hybrid-engine/src/` → `createRun` | browser | Free practice: L1–L4 + Answer Spotter, review gate, exposure label |
| Engine, homework device | `HomeworkClient` | browser | Holds only the student payload; drafts; submits final answers |
| Engine, homework server | `homeworkPayload`, `releasePhase`, `phaseLockIds`, `validateSubmission`, `scoreHomework`, `storageRecord` | Pages Function / Worker | Authoritative scoring from the server's lesson |
| Golden tests | `pkg/golden-tests-v1.1/` (v1.1) and `pkg/golden-tests/` (v2, unchanged) | Python 3 stdlib | 259 / 242 vectors, oracle, adapter protocol, difference report |

There is **no** hint, reveal, preview or "show answer" function, route or event. Do not add one in the UI either (owner rule 1).

## 2. Repository constraints you must respect (from the repo's CLAUDE.md)

* The app is one `index.html` in **ES5**, no framework, **no bundler**; shared `md-*.js` are ES5.
* `build.js` publishes only allow-listed root files and the folders `assets audio img images media`; the build fails if `index.html` loads
  an unpublished file. **Anything you publish is public**: never publish a lesson JSON, an answer key or a transcript as a static file.
* CSP (`_headers`): `script-src 'self' 'unsafe-inline' https://www.gstatic.com`. Same-origin module scripts are allowed; do not weaken the CSP.
* New Firestore collection ⇒ rule in `firestore.rules` (owner pastes it into the Console), `onSnapshot` in Boot where clients read it, local fallback.
* `esc()` / `textContent` for every value; `data-act` delegation; `uiGate` / `uiAsk` for confirmations; IBM Plex Sans is the requested
  typography for the Dictation screens (the app font today is Be Vietnam Pro: ask the owner before changing the app-wide font).
* Staging and production are separated by `build.js` / `build-info.js` and the server `envGate` (fail closed). Use staging only.
* Small fixes go to `main`; this work stays on **one** branch (e.g. `feature/dictation-lab`) from current `main`. Do not touch
  `feature/phase-c-personal-goal`, `feature/vocab-lab`, `integration/vocab-lab-candidate-*`, `phase-b`. **Do not merge or deploy production.**

**O-1 (approved):** publish the two `src/` folders unchanged (e.g. `dictation/engine/`, `dictation/validator/`, add `dictation` to `DIRS`
in `build.js`) and load them only on the Dictation screen through a tiny module bridge (`<script type="module" src="/dictation/bridge.js">`
sets `window.MD_DL = { createRun, HomeworkClient, validateDictationJson, … }`). The ES5 app calls `window.MD_DL` and never imports.
The server imports the same files (Pages Functions bundle them like `md-hw.js`). Never hand-port the engine to ES5 (a second
scoring implementation is forbidden by the contract and the tests).

## 3. Data formats

* **Lesson**: schemaVersion 1.1 JSON (validator). Example: `pkg/golden-tests-v1.1/baseline-harbour-museum.rev1.json` (synthetic, CC0, 47 KB).
  Store as a string field (Firestore forbids arrays of arrays) with `contentVersion` = `sha256Utf8(json)` (validator export) or a teacher version label.
* **Homework payload** (`dictation-homework-payload/1`, server → device): `{schema, assignmentId, contentVersion, seed, contentLabel, phases, phase, items[studentItem], lockOnContinue[], lockedItems[]}`.
* **Submission** (`dictation-submission/2`, device → server): `{schema, assignmentId, contentVersion, idempotencyKey, responses:{itemId: response}}`.
  Response shapes: L1 `{placedIds[]}`, L2 `{answers[]}`, L3/L4 `{answer}`, Answer Spotter `{text}` or `{chosen}`. Final answers only.
* **Acknowledgement** (server → device): `{status:'accepted'|'duplicate'|'rejected', submissionId, reason?, result?:{items, aggregate, unanswered, review}}`.
* **Stored record** (`storageRecord`): `{schema:'dictation-homework-record/1', items{level,state,first,reason?}, aggregate{overall,result,attemptedAccuracy,completionRate}, official}`; raw `responses` only with an approved retention period.

## 4. Integration plan (not started)

### 4.1 Teacher workflow (Create)
Import AI-generated JSON (from any external AI chat; no in-product AI API) or transcript only → `validateDictationJson` → show
errors/warnings (`esc`) → select/deselect sentences (`deselected`) → teacher preview with `createRun` (practice mode) → edit → save as a
new version → explicit **Approve** (records approver + version) → separate **Publish**. `GATE_NOT_AUDITED` content can be published only
as Free Practice with the label "Unverified transcript"; it can never be assigned as homework (`assertRunnable` throws). Never create
target words or Answer Spotter items automatically and never mark AI items as approved.

### 4.2 Student Library (Free Practice)
`createRun({doc, validation, version, seed})` with seed = stable per student and lesson (e.g. `hashSeed(uid + lessonId)`); render only
`present().payload`; order = `run.items()` (typed Answer Spotter first, listening-first). After each `check`: show `score` (numbers only)
and offer **Review** only when `reviewAvailable`; `review()` shows the item's answer. Keep `exportLog()` in the draft (localStorage) so a
reload replays the same state. First attempt and practice progress are separate (`firstAttempt` vs `currentPractice`, `practiceAttempts`).
Free practice is never an official grade or Personal Goal evidence (`summary().official === false`). **Trade-off (disclose to the owner):**
the practice lesson, with its answer key, is downloaded to the device; a student with devtools can read it. That is acceptable only
because practice has no grade.

### 4.3 Homework (server-authoritative)
* Assignment = an approved, versioned lesson (pin `contentVersion`); class + window + late pass **per assignment occurrence** exactly like
  the repo's `md-hw.js` / rules `asgOpen` / `inAsgClass`.
* Homework lessons must **not** be readable by students: store them where only staff and the service account can read
  (proposal: `dictationLessons/{id}` read = teacher; practice lessons separately in `dictationPractice/{id}` read = signed-in). Rules are a
  proposal only; the owner pastes rules.
* New routes (to write, in `functions/api/[[path]].js`, staging first): `POST /api/dictation/payload {assignmentId}` → `homeworkPayload`;
  `POST /api/dictation/lock {assignmentId, contentVersion, phase, responses}` → store the phase-1 answers of `phaseLockIds` (create-if-absent:
  the first lock wins) → `releasePhase`; `POST /api/dictation/submit` → `validateSubmission` → `scoreHomework(req, serverOpts, {locked})` →
  write the result with the service account → ack. Each route: `idUser` (ID token), `roster/<email>` class, assignment window, size caps,
  idempotency per (student, assignment, contentVersion) with a precondition write. `createMemoryServer` is the reference behaviour.
* Mapping to the repo's homework rules: write an `attempts` doc with `kind:'dictation'`, `asg`, `sts` (server time), `answered` =
  attempted items, `required` = valid items, and `score/total` = the **whole-assignment, item-weighted** score as integers, so the existing
  70% PASS rule (`passPct`) agrees with `aggregate.result.passed` (O-3). Server-written: no client `create` rule for this kind.
  `analyticsEligible` (audited + server-scored + submitted) is the only Personal Goal input.
* Blank warning: `submit()` returns `needs_confirmation:N`; show the app's `uiGate` ("N blank answers score 0. Submit anyway?").
* After the ack: show score (whole assignment), Passed / Not passed, Completed / Incomplete, attempted accuracy and completion as
  separate numbers; review from `ack.result.review`. Later practice = a separate free-practice run, never written to the submission.

### 4.4 Roles
Admin, Teacher, Student, Tester (student with `roster.tester`), Homework Assistant (server-controlled classes only; no Firestore access).
Assistant and teacher views must use the same status function as the repo (`md-hw.js asgEval`) so the numbers agree. Writing stays
"Coming soon" for ordinary students (unchanged).

### 4.5 Audio, R2, cost
The engine plays no audio. Use the full uncut source with ±3 s, speed .75/1/1.25, A–B loop and keyboard shortcuts (navigation tools,
not hints). Existing `POST /api/audio?kind=lesson` + `GET /api/audio/<id>` (Range). Private R2 only if already configured; never expose
private URLs. Estimated cost per homework sitting (not measured): 1 payload call, at most 1 lock call, 1–2 submit calls, a few Firestore document reads and 2 writes; no collection scans.

## 5. Security boundaries

| Concern | Where | Status |
|---|---|---|
| Answer key in homework | device gets `homeworkPayload` only; server scores | **fixed in the engine (was the O-2 release blocker)**; network scan of the reference page: 0 leaks, and a deliberately leaky build is caught |
| Cross-item disclosure | `presentBlockers`, `discloses`, phase plan | implemented; two real leaks in the baseline found and blocked (E-2) |
| Score tampering | server scores from its own lesson; client claims ignored | tested |
| Hint / reveal injection | `unsupported_event` | tested (engine + golden HWS-002/003) |
| Practice answer key on the device | by design | disclosed trade-off |
| Raw answers (personal data) | `storageRecord` default: scores only | retention **PENDING HUMAN INPUT**; no production rollout of raw storage |
| Offline exposure | cannot be proven server-side | informational label only (P-06) |
| Rendering safety | product UI | **untested** (reference page only) |
| Cambridge content | never in public files | validator `E-RIGHTS-REDISTRIBUTION` |

## 6. Recommended order and acceptance tests

| Step | Work | Acceptance |
|---|---|---|
| 0 | Branch from current `main`; copy the package; run `node tools/run-all.mjs --mutation --browser …` | numbers of `qa-results.md` reproduced |
| 1 | Publish `dictation/engine` + `dictation/validator`, add `bridge.js` | `node build.js` passes; modules load under CSP on a staging preview |
| 2 | Server routes on staging (payload, lock, submit) reusing `homeworkPayload` / `scoreHomework` | the `homework.test.js` scenarios as HTTP tests: wrong class, closed window, wrong version, oversize, replay, lost ack |
| 3 | Teacher import → validate → preview → version → Approve → Publish | n01 rejected; baseline `GATE_PASS`; transcript-only cannot be assigned |
| 4 | Library practice L3, L4, L2, L1, Answer Spotter | empty Check opens nothing; review only after Check; no Hint/Reveal anywhere; reload replays |
| 5 | Homework UI | browser network log before Submit has no answer, transcript or accepted form (port `tools/browser-selftest.mjs` scan); blanks warning; PASS on whole assignment; teacher = assistant |
| 6 | UI vectors AS-027, SAF-001…003 on the real UI | payload/network and `<img onerror>` rendered as text on every surface; record as PASS only when actually run |
| 7 | Rules on staging | Emulator tests: student cannot read homework lessons, cannot write dictation attempts, cross-class reads rejected |

## 7. Known risks and limits

* Nothing is integrated; every number in `qa-results.md` is from this standalone package.
* The four UI vectors (AS-027, SAF-001, SAF-002, SAF-003) are not run on a product UI.
* Practice answer keys are on the device by design.
* Python ↔ JS validator differences: `pkg/js-validator/README.md`.
* `toLowerCase` guaranteed for Latin script only; the 256-combination limit for alternative forms becomes greedy (C3).
* Cloudflare Workers runtime not tested (no Node APIs are used).
* Engineering defaults E-1…E-6 (`decision-log-v1.1.md`) await the owner's confirmation.
