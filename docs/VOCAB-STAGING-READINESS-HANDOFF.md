# Phase 3 — Safe Firebase staging readiness

This is a local/emulator implementation, not a deployed staging or production release. Work is on `integration/vocab-lab-candidate-2026-11-07`, starting at `df1b63ae253738640b3409b6f2dbc73010dba1e4`; latest inspected main is `5a0c18b3fa35c6ae0f284cc2e5e7c7e5355152ed`. The main/feature checkouts and refs are not changed. No project, service account, billing association, secret, deployment or real content approval is created.

## Architecture and delivered changes

The isolated `staging/server.cjs` serves only its UI assets and authenticated API on `127.0.0.1:18787`. It does not serve the repository root, private JSON, source modules or draft bundles. Root Library integration, Vocab 20/12, Reality Check, Missions, Teacher Review, Writing, Homework, Assistant, approved Vocabulary Bank and read-only Cleanup remain byte-identical to the tested integration candidate. The existing static experimental preview is not an authenticated distribution channel: a future staging build must keep private server/content files out of its public asset directory.

Phase 2.8 service/domain/UI were brought from the exact feature comparator (`4d568ad805f6bace83cf5ced0fca3b5e9c493585`) into this integration checkout. They are kept separate from main's Worker and root rules. Minimal Phase 3 changes add:

- Current Auth user and server-owned `vocab30_accounts` roster validation on every request: active UID/email, role, tester cohort, class and revocation timestamp. Main's `teacher + adm` maps to admin only when both authoritative Auth claims and roster agree; stale claims fail closed. Browser flags, requested UID and localStorage decisions never grant authority.
- Assigned teachers can inspect/review immutable versions and request fixes/reject. Admin publication is separate and requires the currently approved version/hash. Transactions preserve append-only audit and idempotent operations; a new revision invalidates approval/publication without rewriting existing pinned sessions.
- All 87 routes save server-graded sessions/events/progress under authenticated UID, class, lesson, sense, version and task. Optimistic revisions reject conflicting device writes; idempotent retries append one event. First-attempt Independent Recall Option A is distinct from hint/retry/reveal; later assistance does not erase prior independent evidence. No morphology evidence is invented.
- Class transfer blocks old-class resume/mutation and hides old-class session/progress listings. Test-only roster Tester membership is required for learner practice. A tester never inherits review/publication rights.
- Staging Firestore rules deny **all direct client reads and writes**. The API is the only data path and rechecks current Auth and roster. This closes the old direct-reader revocation gap. Existing tests that allowed direct staff/own-session reads were strengthened to expect denial; authenticated API positive tests remain. No main test/assertion was weakened.
- Exact demo-project/loopback target checks reject missing emulators, cloud credentials/config and conflicting project/database variables before SDK initialization. A TCP guard prevents fallback to cloud/metadata endpoints. Browser tests block external transports. No production SDK configuration is loaded by this isolated application.
- Offline RSA signed-token tests check signature, algorithm/key, issuer, audience, expiry, subject and auth time. This is an offline verifier contract, not a deployed gateway or evidence of live IAM.

`tools/vocab-staging-cloud-smoke.cjs` is disabled by default. Future execution requires an explicit `--run` command, reviewed config with `approved:true`, a staging-only project/database/origin and a separate environment acknowledgement. It follows no redirects and only reads `/staging-health`; it cannot sign in, approve/publish, write data or deploy. Only mocked transport tests were run. The actual health endpoint and cloud wiring remain a later authorized task.

## Actual main auth/rules audit

The current Worker returns a Firebase **custom token** after its own account/roster checks. The client exchanges it for an ID token; custom tokens must not be accepted as API bearer credentials. The Worker has an RS256 `idUser` verifier with issuer/audience/key checks and its existing clock tolerance. Staff/admin keys and Homework Assistant assignments use separate KV-backed flows. The root rules still contain main's email/role and application-specific permissions; these have not been broadened for Vocab. That existing rules file must not be used as the isolated staging policy.

The new service instead uses Admin SDK `verifyIdToken(token, true)`, current `getUser`, and the synthetic staging roster. Its proposed signed staging adapter must pin a separate project and re-resolve paused/moved/kicked roster state; it must not reuse production KV, service accounts, root config, teacher emails, Sheets, students or Auth exports. Direct Firebase clients have no staging data access. Admin SDK bypasses Rules, so service authorization and least-privilege runtime IAM both remain essential.

References: [Firebase ID-token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [session revocation](https://firebase.google.com/docs/auth/admin/manage-sessions), [Auth Emulator unsigned tokens](https://firebase.google.com/docs/emulator-suite/connect_auth), [Firestore rules testing and server bypass](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

## QA and preservation

Exact current results, hashes and evidence are in `VOCAB-STAGING-READINESS-QA.json` and `phase3-staging-evidence/`. Test accounts use `@local.invalid` and only `demo-mini-drills-vocab-test`. Fixture-only review/publication transitions are erased by teardown; the retained catalog is **102 PENDING (stored as DRAFT), 0 APPROVED, 0 PUBLISHED**. No real editorial decision is submitted.

The first security run was blocked by sandbox EACCES on loopback; logs are retained. The rerun with local socket permissions passed. Phase 3 security was then extended with class-transfer checks and the complete security/browser suite rerun. Main QA also reran with an explicitly installed TCP guard (the old require-only helper exported an installer without invoking it). Original assertions and runtime remained unchanged.

| Current run | Result |
| --- | --- |
| Full original feature QA comparator | PASS: 130 Node tests, 244 regression assertions, 10/10 browser suites, 443 screenshots |
| Exact integration runtime browser | PASS 10/10 suites; zero transport violations |
| Integration policy/main browser | PASS 18/18 scenarios |
| Phase 3 emulator/security/browser + offline identity | PASS 14 security + 2 browser + 3 contract tests; all 87 routes |
| Homework/auth/Cleanup additional | PASS 5/5 |
| Cloud-smoke guards with mocked transport | PASS 2/2; actual cloud smoke NOT_TESTED |
| Unmodified Main QA with network guard | FAIL overall: 25/28 commands; 426/436 assertions; three known policy/editorial groups below |

Known remaining Main failures are not repaired by adding forbidden functionality: `data-cleanup.test.js` has two delete/purge expectations (13/15), `server-purge.test.js` expects eight destructive functions/routes (0/8), and `lm-check.js --release` is editorial-blocked by 206 Unit 0 and 226 Unit 2 pending items. Emulator PASS does not imply live staging Auth/IAM PASS.

## Configuration decisions requiring owner approval

1. Approve the **separate proposed project** `mini-drills-vocab-staging` (not created; availability not checked), organization/owner, region, Firestore database location and a dedicated staging origin. The sample origin in `VOCAB-STAGING-CONFIG-PROPOSAL.json` is deliberately invalid. Keep Cloudflare production/main untouched; use an isolated manually deployed staging service, no Git auto-deployment.
2. Approve billing ownership, service choices and budget alerts before provisioning. Suggested initial cohort: at most five staff/testers and ten synthetic learners; bounded smoke runs, no AI calls or real data. Alerts are not hard spending caps. Actual costs depend on selected region/services/traffic and require a console estimate.
3. Approve separate runtime, fixture-provisioner and deployer identities. No Owner/Editor role, production service account, downloaded cloud key or committed secret. Review exact custom IAM permissions needed for Auth verification/current-user lookup and the isolated Firestore database. The runtime must not create projects, grant roles or deploy. IAM has not been validated live.
4. Approve synthetic account roster, teacher lesson/class assignments, tester allowlist, admin/publisher separation and revocation workflow. Use fresh synthetic users; do not import students or passwords. Administrative account revocation should update staging roster state first, then revoke Auth sessions; the API denies immediately when roster is inactive.
5. Approve a private server deployment shape, static UI allowlist, HTTPS/CORS/CSP, dedicated bindings, secret store, logs and denied-by-default Rules. Review the signed-token/live-auth adapter and staging health endpoint before enabling cloud smoke. No production fallback, credentials or cross-project connection is allowed.
6. Approve operational retention (proposed seven days of synthetic logs), synthetic backup/restore and explicit deletion policy. Cleanup remains read-only in the app. Rollback means disabling staging ingress/writes, restoring the reviewed staging artifact/rules/config, and verifying the synthetic snapshot; never resetting main or copying production data.
7. Separately authorize project creation and staging deployment **after** the above review. Then run live synthetic auth/IAM/revocation/CORS smoke and backup/restore tests. These checks are currently **NOT_TESTED**; no teacher manual testing is requested for cases already automated.
8. Teacher editorial decisions remain separate: review the exact current 102 item versions, including the agreed five vocabulary decisions and Independent Recall Option A, then explicitly decide any publication. Prior wording decisions are not reopened. No automatic Approve/Publish is authorized.

## Commit/push gate

The Phase 3 instruction requires independently reconfirming Cloudflare Preview None and other deployment hooks before commit/push. The prior owner-confirmed configuration is recorded, but this turn's independent UI attempt was blocked by automatic approval review because the browser window contained unrelated private documents. No workaround was attempted. GitHub hooks/workflows/deployment metadata were rechecked read-only. The owner subsequently explicitly authorized using the saved Cloudflare Preview=None confirmation in place of the independent UI check for this Phase 3 commit/push. Only this integration branch is authorized, with `[CF-Pages-Skip]`; production/main and feature refs remain untouched. The resulting commit SHA is recorded by Git and the final response. No PR/merge/deploy is performed.

## Reproduction

Install the pinned manifests with `npm ci --prefix tools/emulator-runtime --ignore-scripts` and `npm install --prefix tools/qa-runtime --ignore-scripts` (Java 21+, Node 22+, Edge). Start `staging/start-emulators.ps1 -TestProject`. Set `GCLOUD_PROJECT=demo-mini-drills-vocab-test`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:18080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:19099`, then run `node tools/vocab-staging-readiness-qa.cjs <new-run-name>`. Shared local runtimes can be selected with `VOCAB_EMULATOR_RUNTIME` and `VOCAB_QA_RUNTIME`; they only locate installed packages, never choose a Firebase project.

Run `node --test tools/phase3-smoke.test.cjs` for no-network cloud-smoke guard tests. Main and integration browser commands use `tools/safe-integration-qa.cjs` with `SAFE_FEATURE_CHECKOUT` and a fresh ignored `SAFE_QA_OUTPUT` containing the recorded source manifest. The feature comparator additionally uses a unique `SAFE_QA_SESSION`; policy browser output is selected by `SAFE_POLICY_OUTPUT`. Original test plans/assertions are preserved.
