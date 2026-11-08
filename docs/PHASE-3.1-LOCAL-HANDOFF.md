# Phase 3.1 — Zero-Cost Local/Emulator Implementation Handoff

Handover: 08/11/2026 (Asia/Saigon). Final QA timestamps are retained unchanged in the evidence (07/11/2026 UTC).

## Outcome

Implemented authorized phases 3.1-A through E on integration/vocab-lab-candidate-2026-11-07, based on 279372743dba002a2d764ee30df712979672ef06. Final Phase 3.1 QA: **15/15 PASS**. Existing identity/environment contracts: **3/3 PASS**. No unresolved test failures in this increment. The reviewed changes are packaged in a local commit on this integration branch only. Push is BLOCKED pending current auto-deploy verification; see PHASE-3.1-LOCAL-COMMIT-GATE.json.

## Delivered

Eight synthetic items in two independent lessons live under vocab31_fixture_runs/{runId}/lessons/{lessonId}. They exercise both micro-review and contextual challenge paths without copying the actual 102-item catalog. Assigned teacher/admin review, separate admin publication, student enrolment/tester cohort, authoritative Auth/roster checks, optimistic progress writes, retry deduplication and Independent Recall semantics reuse the existing service with an injected fixture domain.

Local-only API/UI has an asset allowlist, Host/Origin checks, no client-selected namespace, a Firestore-run health endpoint and a transaction-enforced write lock. Provisioning and lock/restore commands are explicit local operator operations, not application privileges. The fixture service never auto-seeds at startup. Existing application navigation and the Writing Module were not edited.

Logical snapshot traverses all subcollections. The final exercised snapshot restored **180 documents** atomically into a new locked run, verified by checksum and matching document hash. Nested sessions/events/operations/progress and pinned content versions were retained. CLI init/lock/snapshot/restore/unlock was also exercised. No data reset, actual content publication or destructive cleanup feature was added.

## Validation

- Draft -> Request Fix -> Reject -> Approve -> separate Publish -> persisted Progress, with exact version/hash and audit checks.
- Admin/Teacher/Tester/Student gates; teacher assignment, student cohort and cross-UID/lesson/class isolation; real Auth emulator disabled/revoked accounts and stale claims.
- Two concurrent writes conflict; identical retries append one event; hints/retries/reveals do not become first-attempt independent evidence.
- Revision invalidates current approval/publication while prior sessions retain their pinned version.
- All eight fixture routes, both lessons and fresh service instances recover saved sessions.
- Real browser UI review/publication, two isolated student browser contexts, reload/resume, sign-out clearing, no page errors; mobile screenshot checked at 390px without horizontal overflow.
- Direct Firestore reads/writes denied by the existing staging Rules for all tested application roles.
- Writes blocked by the run lock; backup requires a stable locked source; existing/same restore targets, corrupt checksums, foreign paths and missing versions are rejected.
- Node TCP guard rejects non-loopback Firebase/metadata targets; the browser application route log records zero external requests. SDK metadata-probe warnings are retained: connection attempts were blocked by the guard. This is application-level transport evidence, not an operating-system packet capture of every emulator process.

## Preservation

All 329 original tracked files were hashed before work. **328 are byte-identical**. The sole existing-file change is staging/service.cjs: its original domain becomes the default value of an optional function argument. There are no other service-body changes. Existing index/Library/Writing/Vocab/Worker/rules/content and tests are unchanged. All runtime and test sources still match final QA hashes.

The local emulator's retained catalog was **102 DRAFT/Pending, 0 Approved, 0 Published**, with no decisions or publications. Catalog items, versions, decisions, publications and public pointers were compared before/after. No production data or account was accessed. If a fresh test emulator has no retained catalog, QA initializes DRAFT copies from source only and never resets existing data.

Existing Main QA 25/28 policy/editorial failures remain historical and were not repaired or rerun. This increment does not claim the full product is release-ready.

## Failure history

Initial emulator startup inside the restricted sandbox timed out on localhost binding. Running the same cached emulator command with local socket permissions succeeded. No dependency download or cloud project was used.

Round 1: 12/13 PASS. The hostile Host-header test used fetch, which normalized the header. The test was corrected to send a raw local HTTP request; the server's 403 guard was not weakened. Round 2: 14/14 PASS, including added two-lesson coverage. Final: 15/15 PASS after adding explicit operator CLI coverage, plus 3/3 existing contracts. Logs for the failed and successful rounds are retained.

## Limits and next gates

- Spark project, live signed Firebase Auth/IAM, cloud hosting/deployment and Phase 3.1-F: **NOT_TESTED / NOT_IMPLEMENTED**.
- Two physical devices/LAN HTTPS: **NOT_TESTED**; two browser contexts passed.
- Logical backup supports this bounded JSON fixture schema, at most 440 documents in one atomic restore. Unsupported Firestore data types are rejected rather than converted.
- Auth users/passwords/refresh tokens are not backed up. Restored progress was tested using the same emulator Auth users. Full Auth recovery after emulator loss remains NOT_TESTED and must not be implied by logical snapshot success.
- Manual UI needs the operator to start the emulator/backend; no hosted preview exists. The local emulator/API ports 14400, 18080, 19099, 18788 and 18789 were verified closed after QA.
- No billing, Firebase project creation, real credentials, cloud deploy, main modification, PR or merge occurred. A local commit is authorized for this handoff; no push is performed because the current deployment gate is BLOCKED.

See PHASE-3.1-LOCAL-RUNBOOK.md for commands, PHASE-3.1-LOCAL-QA.json for status, and phase31-evidence/ for immutable logs, snapshots, screenshots and hashes. Await owner review before further implementation or a new phase.

## Commit review — 08/11/2026

The final source hashes and evidence hashes still match the successful QA; no runtime changes followed QA. Secret-pattern scanning found no embedded private keys, API keys or bearer/refresh tokens. The 180-document backup is synthetic-only, with 12 fixture email fields under local.invalid and no credential fields. Both screenshots were reviewed as synthetic UI evidence. The handoff, QA JSON and runbook are readable in docs/.

GitHub confirms remote integration still at the recorded base and main at 5a0c18b3fa35c6ae0f284cc2e5e7c7e5355152ed; Actions runs count is zero. Current Cloudflare dashboard access redirects to login. Workflow listing through the connector is unavailable, and hooks/other deployment services have not been freshly verified. Historical Preview=None and the commit skip prefix are not treated as proof of current auto-deploy safety. Therefore commit remains local; no push is attempted.
