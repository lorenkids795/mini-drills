# Phase 2.8 — Approval and safe staging handoff

Implemented only on feature/vocab-lab from 9d6a8ca673811cf326fce93dd1fd231579edcb2d. No production connection, deployment or merge. All source content remains 102 pending drafts, 0 approved, 0 published. Fixture decisions are confined to the emulator test project and erased in teardown.

## Delivered

Loopback-only Auth + Firestore Emulator application under staging/. Authenticated teacher/admin approval uses immutable version/SHA-256, append-only server audit, exact-version invalidation and a separate admin publication action. Assigned staff, active student enrolments and current authoritative roles are checked on every API operation. Direct client writes cannot spoof review, publication or evidence. No demo/localStorage approvals are imported.

All 87 routes (24 micro-review + 63 contextual challenges) have authenticated server-graded, database-backed sessions and evidence. Records identify UID/lesson/sense/form/task/version/hash; retry, hint and reveal are assisted. Transactions provide revision conflicts and idempotent operations. Independent evidence is retained across later assisted sessions. Reload and a fresh service instance restore pinned sessions; new drafts block new starts but do not rewrite old sessions. Existing Writing, bank, Library, Check 20/12, Reality Check, Mission and Word Morph sources are unchanged.

This is a separate testable staging application, not a production Library rollout. The UI-only static preview still contains no Firebase connection or staging files. See staging/README.md for commands, fixture sign-in, schema, migrations and limitations.

## Latest-main audit and conflict plan

Compared before implementation and rechecked on 2026-11-04: origin/main 3ea771389edf53750ddd1d79445e78afd199a4d1; feature remote 9d6a8ca673811cf326fce93dd1fd231579edcb2d. No main merge or overwrite occurred.

| File | Feature versus main (+/- lines) | Required future reconciliation |
| --- | --- | --- |
| index.html | +154 / -349 | Preserve current main auth/admin/Writing changes; reapply only reviewed Vocab entry integration after explicit merge authorization. |
| functions/api/[[path]].js | +1 / -35 | Main has newer API version and orphan-account cleanup endpoint. Keep those changes; design a separately reviewed Vocab service integration, never replace the API wholesale. |
| firestore.rules | +47 / -0 | Feature has earlier Vocab preview rules. Phase 2.8 rules live separately in staging/firestore.rules; do not copy emulator-only rules over production rules. Review production schema/IAM explicitly. |
| lm-engine.js | +0 / -7 | Main includes gap-comparison classification logic; preserve it. |
| lm-unit0.js | +15 / -83 | Main has Writing learning/assessment revisions; preserve them and rerun Writing regression checks after any future integration. |
| lm-unit2.js | +4 / -46 | Main has Writing content/UI revisions; preserve them and reconcile separately. |

md-backend.js and md-config.js show no difference in the inspected comparison. These are known pre-existing branch divergences, not Phase 2.8 edits. Working changes to protected Writing/auth/bank files are zero.

## QA and fixes

Final results (2026-11-04):

- Full QA Runner PASS: 122 Node tests, 244 core assertions, 10/10 legacy browser suites, 0 failed commands, 443 screenshots. Session phase28-approval-staging / round 1. Source fingerprint 28f00865a1516cb63eec4f5e470f51880b1b7086bd06e5976a6ccaa3e9e1203c.
- Actual Auth + Firestore Emulator PASS: 11 integration/security tests (including all 87 routes) and 2 browser end-to-end tests. Final run phase28/final-20261104; source fingerprint fa04a9107184dedb1ad044bcd7b8a83bd28ba2b53295f95f6230310e1b93f54b; source unchanged during the run. Firebase CLI 15.34.2, Firebase Admin 14.5.0, Firebase SDK 13.1.0, rules-unit-testing 6.0.0, Firestore emulator 1.22.0, Java 21.0.13.
- Final teardown verified: 102/102 DRAFT, 0 APPROVED, 0 PUBLISHED, 0 decision events, 0 remaining fixture Auth users.
- Static preview allowlist, manifest, protected file hashes, network isolation and Writing boundaries PASS.

After full legacy QA, an isolated staging UI correction refreshes the item selector/status counts after review actions. Its browser assertions and staging QA provenance reporting were updated and the complete emulator/security/browser suite was rerun successfully. No legacy gameplay, library, static preview, service grading or rules changed after the full legacy run. Final handoff/status additions are documentation only.

Emulator source-provenance report: VOCAB-PHASE-2.8-EMULATOR-QA.json. Legacy full result: VOCAB-QA-STATUS.md/json. Immutable logs/screenshots: qa-artifacts/phase28 and qa-artifacts/phase28-approval-staging. The staging status-display correction and earlier failures remain documented; no failure history was overwritten.

Preserved initial setup/repair evidence in qa-artifacts/phase28: Admin SDK rejected a custom dummy credential (corrected to documented emulator initialization with an outbound loopback guard); route selection initially omitted 24 micro-review items (corrected to both catalog kinds); rules test tokens needed explicit future expiry; browser reload test initially used fragment-only navigation (corrected to actual reload). No authorization assertions, rule checks or legacy baselines were weakened.

## Remaining gates

- Human review of all 102 exact versions, and explicit publication by an authorized human. No real approvals/publications were created.
- Auth emulator tokens are unsigned; production cryptographic verification and IAM are NOT_TESTED. Server expiry/revocation/disabled-user enforcement is tested locally; direct Firestore readers use token expiry semantics and need a separate revocation propagation review before deployment.
- Deployed isolated staging, production integration, real student migration, operational backup/recovery and main reconciliation are NOT_TESTED / not performed. Local manual emulator export/import instructions are provided; QA establishes browser/service restore against the running database, not a production disaster-recovery claim.
- Full-102 published personalized missions remain outside this increment. Existing three pilot missions and morphology are preserved. The new staging student path covers exactly the 87 new routes.

No release-ready claim is made from emulator success. No Cloudflare/Firebase deploy, main merge, production records or real credentials were used.
