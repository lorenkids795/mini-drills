# Local approval and learner-progress staging

This is an isolated, loopback-only Firebase Emulator application. It does not modify the Library, Writing, approved Vocabulary Bank, root Firebase rules/config, or UI-only static preview. It never imports localStorage/demo approvals. A fresh database contains 102 DRAFT items, 0 APPROVED and 0 PUBLISHED.

## Prerequisites and commands

Node 22+, Java 21+ and the pinned runtime packages are required:

```powershell
npm ci --prefix tools/emulator-runtime --ignore-scripts
powershell -ExecutionPolicy Bypass -File staging/start-emulators.ps1
```

The optional portable Java under `tools/emulator-runtime/java/` is used if present; its download/checksum is recorded in `java-provenance.json`. The runtime folders and emulator data are ignored by Git. The CLI uses the dedicated `demo-mini-drills-vocab` project and binds Auth to 127.0.0.1:19099 and Firestore to 127.0.0.1:18080. No login, credentials or project provisioning is needed. Manual emulator data exports on graceful exit to `qa-artifacts/phase28/manual-state` and imports on the next start.

In a second terminal, at repository root:

```powershell
$env:GCLOUD_PROJECT='demo-mini-drills-vocab'
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:18080'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:19099'
node staging/create-fixtures.cjs
node staging/server.cjs
```

Open http://127.0.0.1:18787. Optional fixture accounts are `local-teacher@local.invalid`, `local-admin@local.invalid`, `local-student@local.invalid`, password `LocalFixtureOnly28!`. These are public test credentials for a local demo only. Creating fixtures submits no approval/publication. Teacher can inspect, request fixes, reject, revise and approve the exact version. Admin must separately publish the approved version. Student sees only explicitly published routes. Sign out clears the in-memory token; reload asks for sign-in and resumes the URL's session through the authenticated server.

## Repeat security/browser QA

Stop the manual emulator before starting the isolated test project:

```powershell
powershell -ExecutionPolicy Bypass -File staging/start-emulators.ps1 -TestProject
$env:GCLOUD_PROJECT='demo-mini-drills-vocab-test'
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:18080'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:19099'
node tools/vocab-staging-qa.cjs unique-run-name
```

The test runner resets ONLY the exact demo test project, uses disposable Auth emulator identities, and restores 102 drafts / 0 approved / 0 published in teardown. It does not reset the manual demo project. Logs/screenshots are retained under `qa-artifacts/phase28/<run>`. Also run the existing `node tools/vocab-qa-runner.cjs` for all legacy regression/browser contracts. Playwright 1.62.1 and Edge are supplied by `tools/qa-runtime`.

## Schema and trust boundaries

- `vocab28_items/{sourceId}`: immutable source/sense/lesson mapping; current version/hash/status and exact approval pointer. States DRAFT, REQUEST_FIX, REJECTED, APPROVED, PUBLISHED.
- `vocab28_versions/{sourceId}__{version}`: immutable complete authored content and SHA-256, server creator/time. Revised content always gets a new version. Old versions are retained.
- `vocab28_decisions/{hash(uid,operationId)}`: append-only action, reviewer UID, server timestamp, note, prior/current version/hash and result. Duplicate operation with identical payload is idempotent; changed payload conflicts.
- `vocab28_publications/{sourceId}__{version}`: immutable publication receipt referencing the exact human approval. `vocab28_public/{sourceId}` is a current metadata-only catalog. It has no answer key; a revision removes the current public pointer.
- `vocab28_staff/{uid}`, `vocab28_enrollments/{uid}`: trusted fixture provisioning only. Assigned teachers can review this lesson; students must have active lesson enrolment. Testers receive neither privilege. Only admin may publish.
- `vocab28_students/{uid}/sessions/{sessionId}`: pinned item/version/hash, phase, optimistic revision and per-task attempt/hint/reveal state. Each context or recall task is identified by item/version/phase. The 87 existing routes have no authored morphology, so `form` is explicitly null; no fabricated form mastery.
- Under the same student document, `events/{hash(session,operation)}` is append-only evidence with lesson/sense/form/task/version/hash, independent/assisted/revealed flags and server timestamp. `operations` provides idempotent replay. `progress/{lesson}__{sense}__{version}` is an aggregate with event count, retained independent evidence and latest performance. No XP/mastery writes.

Every HTTP request verifies the Auth emulator ID token, expiry/revocation/disabled account and authoritative current user role; a client role/UID/correctness field is not trusted. Staff assignment and enrolment are read server-side. The server grades against private pinned content. Transactions reject stale revisions; a second device must reload. Existing sessions can finish their previously published version after a new draft is authored. Active recall responses omit answers, context panels and explanations; hints/retries/reveals cannot become independent first-attempt evidence.

Client Firestore writes are denied everywhere. Drafts/decisions are readable only by assigned staff/admin under rules; students may read only published metadata and their own progress/session/events. Direct rule reads use normal ID-token expiry semantics; immediate revocation/disabled checks are enforced by the server API. A deployed design must separately review token revocation propagation for any direct SDK reader. The application itself uses the server API, not direct SDK reads.

The server refuses non-demo project IDs, non-loopback emulator hosts and cloud credential/config environment variables before SDK initialization. Its TCP guard rejects non-loopback connections, including SDK metadata fallback. No production mode exists. Authentication Emulator tokens are unsigned: these tests establish rule and server authorization behavior, not production token signature verification, IAM or deployment security. Never expose emulator ports to other machines.

## Migration and release gates

No existing production collections, localStorage decisions, student records or saved mission contracts are migrated. Initial seeding creates missing records only; it never overwrites an existing reviewed version. Later authored imports must go through explicit draft revision, not a silent reseed. Existing three mission packs and Word Morph gameplay are unchanged; this staging learner path supports only the 24 micro-review + 63 contextual-challenge routes.

All 102 still require human editorial signoff, including passage-scope verification for carriage. Emulator PASS does not enable production Library access or publish any content. Deployed staging IAM, real signed-token verification, revocation propagation, operational backup/restore and main reconciliation remain separate unperformed gates. No staging or production deployment is authorized.

References: [Firestore emulator](https://firebase.google.com/docs/emulator-suite/connect_firestore), [Auth emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [real rules testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator).
