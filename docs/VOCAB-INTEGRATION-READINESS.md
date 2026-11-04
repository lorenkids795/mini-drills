# Phase 2.9 — Integration Readiness

Overall: BLOCKED for rollout; preparation and local QA are assessed separately below. Work is limited to feature/vocab-lab. No Writing, Library runtime, authentication API, production rules, approved Vocabulary Bank or completed gameplay files were modified by this phase. No main merge, deployment or production connection occurred.

## Exact main comparison

Latest fetched main: `8d9cf7742a14f64db4d7e22f63a395ee68531113`. Feature base: `749d86f12ed91dbb4d9517011c4a5d3c380f1fe8`. Common ancestor: `56cb32b5fddc63c2898f6b294cae777259ca925d`.

The first audit against main 3ea7713 found index.html conflicts around Library/Writing visibility. Remote main advanced during QA. A fresh fetch and dry-run against 8d9cf77 now finds **zero textual conflicts and zero paths modified on both sides since the common ancestor**. The latest main restores the audited application files to their common-ancestor contents; the newer main test additions remain. Historical conflict results must not be used as the final main status.

| Area | Final divergence and disposition |
| --- | --- |
| Writing / Library in index.html | Feature still differs in Writing visibility and Vocab hooks. Keep latest-main Writing region byte-for-byte in the disposable candidate. Browser QA exposes a behavioral conflict: current main does not lock ordinary students behind Coming soon, while the feature regression requires it. Do not change Writing or weaken the test here. |
| lm-engine.js, lm-unit0.js, lm-unit2.js | Latest main and feature tips now match. Preserve main. |
| functions/api/[[path]].js | Latest main and feature tips now match. Real auth service adapter remains future additive work. |
| firestore.rules | Feature contains 47 earlier Vocab preview lines. Keep latest-main rules baseline; do not deploy feature rules. Emulator rules are separately scoped. |
| md-backend.js / md-config.js | Tips match. Keep main settings; local staging never connects to them. |
| Main tests | Preserve all main-only Reading/Homework/admin test additions. They are absent from the historical feature checkout, not files to delete during integration. They were not executed as part of the feature QA Runner. |

A `git merge-tree --write-tree --name-only` dry-run only writes temporary Git objects; no refs, index or working source files are merged.

Machine-readable audit: `VOCAB-INTEGRATION-AUDIT.json`. `tools/vocab-integration-candidate.cjs` builds a disposable candidate under ignored `qa-artifacts/phase29/candidate`. It retains Vocab hooks while replacing the whole Writing region with main's region; hashes verify that region is identical. Other protected main assets are read through a QA overlay (EOF whitespace normalized), never copied over the checkout. The candidate is not a release build and has no deployed service adapter.

## Integration behavior retained

Vocab Lab stays inside Library → Learning Materials. Standard 20 / Quick 12, Reality Check, Personalized Mission and Teacher Review remain in the feature branch and regression suites. No standalone Vocab navigation item or Save the Coast entry is added. Save the Coast remains only an internal demo fixture. Admin/Tester preview access remains explicit; ordinary students are denied even on direct route/shell mount. The candidate browser suite exercises sorting/mission/back, reload, two-tab concurrency, account changes, role gates, mobile/desktop light/dark and latest-main Writing gates.

## Real authentication adapter design — not connected

1. Browser obtains a Firebase ID token from the existing sign-in flow and sends it in Authorization; no UID, role, tester flag or correctness supplied in JSON can grant access. Do not transport an admin password/session key to the Vocab service.
2. A dedicated **isolated staging** service must verify signature, algorithm, issuer, audience, expiry, auth_time, disabled/revoked state against that staging project. The existing main `idUser` verifies signatures/audience/issuer but returns only em/role/uid; it does not expose the exp/auth_time/adm fields needed by the proposed adapter. Extend a trusted verified-claims adapter later; never reconstruct those fields from unverified browser JSON.
3. Fetch current authoritative account/admin/staff/tester/enrolment state server-side. Mini Drills admin is teacher + adm, while Phase-2.8 fixtures use role admin. Custom-token additional claims must not be assumed to exist as persistent Firebase UserRecord.customClaims. Current worker/roster/staff records need an explicit authoritative lookup adapter; it is not implemented or connected here.
4. `integration/auth-contract.cjs` is a pure tested reference contract for the output of those trusted verification/lookups. It rejects UID/email mismatch, expired/revoked identities, disabled accounts and stale roles. Admin maps to review/publish; tester never gains review/publish. Initial learner-practice rollout requires active lesson enrolment **and tester status**. Assigned teachers can review via the controlled editorial endpoint without gaining general Lab preview access. This module does not verify JWTs or enable a network endpoint.
5. Retain Phase-2.8 version/SHA-256, append-only decisions, separate explicit admin publication, private answer keys, server grading, idempotent transactions and pinned-session semantics. Do not import demo/localStorage decisions or old untrusted evidence. Use UID keys, not email keys; handle account changes and token expiry by cancelling old controllers and requiring sign-in.
6. For the isolated staging design, prefer server-only private reads/writes and authenticated catalog metadata. If direct SDK private reads are retained, add authoritative revocation/disabled-state rules and test propagation; current emulator rules use ordinary token expiry for direct reads. Review service IAM separately because Admin SDK bypasses rules. Never relax production rules to make a prototype work.

Emulator guardrails remain unchanged: exact demo project IDs, loopback Auth/Firestore hosts, no cloud credentials, outbound non-loopback TCP denied. Static UI preview remains network-isolated with its 26-file allowlist. No real accounts, student data or Firebase production are used.

## Lowest-risk integration sequence

1. Preserve this feature branch and audit hashes. With future explicit integration authorization, start from the then-current main; re-run conflict discovery. Do not merge the entire historical feature diff wholesale.
2. Port the Vocab-only assets and Library hooks demonstrated by the candidate. Preserve main's Writing/auth/backend/rules verbatim until a separately scoped adapter is reviewed. Retain and run the main-only Reading/Homework/admin tests as well as the full feature regression suite and candidate browser checks on that actual integration checkout. Resolve the current Writing access-policy mismatch under a separately authorized Writing change, or an explicitly agreed integration policy; this phase does not decide it.
3. Provision an isolated staging project only after separate authorization. Implement verified-token/current-account mapping, assignments and narrow schema/IAM. Seed copies of draft content only; reset approval state. Use synthetic users and data.
4. Run signed-token, revocation, role-change, direct API/SDK, concurrency, migration, backup/restore and network tests automatically. Keep a default-off server feature flag and allowlisted tester cohort; publication alone must not bypass rollout policy.
5. Obtain exact-version human editorial decisions and separate publication actions. Then, under separate release approval, enable a small pilot. Roll back by disabling the rollout flag and stopping new starts; preserve immutable versions, decisions and existing session/evidence records. Do not delete learner history.

## QA

- Feature QA Runner round 1: PASS, 126 Node tests, 244 regression assertions, all 10 browser suites. Full readiness stays BLOCKED for outstanding content/service coverage. Final full round 2 also PASS: 126 Node tests, 244 regression assertions, 10/10 browser suites, 443 screenshots and zero failed commands. The readiness test uses final main. Evidence: VOCAB-INTEGRATION-QA.json and VOCAB-QA-STATUS.json. Final edits after this run are reports only; runtime/test sources are unchanged.
- Firebase Emulator: PASS, 11 security/integration tests + 2 browser tests, source unchanged. Includes 87 new routes and persistence/authorization checks; only synthetic users/data.
- Candidate against historical main 3ea7713: PASS, including 60 shell screenshots. First invocation lacked Chromium; explicit Edge rerun passed. This historical PASS does not certify latest main.
- Candidate against latest main 8d9cf77: FAIL at tests/vocab-shell.browser.js:95. Ordinary-student Writing header is enabled, but the unchanged feature regression expects disabled/Coming soon. Prior Vocab checks execute before this assertion; subsequent Writing/remote-origin checks in this candidate run are NOT_TESTED. The corresponding complete feature suite passes.
- No tests/baselines were weakened. Only the newly added readiness test was corrected to accept zero conflicts on an advanced main and rely on exact Writing-region equality instead of an obsolete helper name. Original browser failure is retained at qa-artifacts/phase29/latest-candidate-browser-edge.txt.

Reproduce candidate: run `node tools/vocab-integration-candidate.cjs`, set NODE_PATH to tools/qa-runtime/node_modules and VOCAB_QA_BROWSER=msedge, then run `node --require ./tools/vocab-integration-preload.cjs --require ./tools/vocab-qa-preload.cjs tests/vocab-shell.browser.js`. This is a local, guarded overlay, not a deployable build.

## What still needs teacher decisions

- Review the 102 exact draft versions: approve, request a fix or reject, then explicitly authorize publication. Five lexical directions and Independent Recall Option A are already settled; no need to decide them again.
- Confirm carriage's passage-specific scope before publication, as previously required. The exercise remains horse-drawn; the approved bank's broader meaning is unchanged.
- Identify authorized editorial reviewers and the synthetic tester/pilot cohort, and choose publication/pilot timing once technical gates pass. Admin-only explicit publication is the proposed existing default.

Not teacher manual-QA tasks: resolving main conflicts, auth adapter implementation, security tests, browser coverage, rules/IAM review and deployment preparation remain engineering work. No manual request to repeat automated tests is needed.

## Remaining technical blockers

Actual main integration is not performed. Latest-main candidate Writing access regression remains FAIL; resolving it requires a separately scoped decision/change because Writing is protected. A signed-token/current-account service adapter, isolated deployed staging/IAM, immediate revocation for direct readers, migration and operational recovery are NOT_IMPLEMENTED or NOT_TESTED. Firebase Emulator tokens are unsigned and cannot prove production signature verification. Full-102 published personalized missions are not implemented; 15 pilot targets and 87 staged routes must not be represented as a published full-bank mission engine. All 102 remain pending; 0 real APPROVED/PUBLISHED. Emulator fixture decisions are deleted by test teardown.
