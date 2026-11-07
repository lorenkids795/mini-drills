# Safe Integration Branch — verified branch-only push

2026-11-07 (Asia/Saigon). The owner confirmed saved Cloudflare Pages settings for `myhomeworkmyfuture`: production branch **main**, automatic production deployments enabled, preview branches **None**. The owner then explicitly authorized committing/pushing only `integration/vocab-lab-candidate-2026-11-07` with `[CF-Pages-Skip]`. This supersedes the earlier local-only hold; no merge, PR, deployment, production connection or content approval is authorized.

## Provenance and pre-push checks

- Integration branch: `integration/vocab-lab-candidate-2026-11-07`.
- Latest fetched main/base: `5a0c18b3fa35c6ae0f284cc2e5e7c7e5355152ed`. Before commit the branch HEAD equals this latest main exactly; the resulting commit has this parent.
- Feature local HEAD remains `4d568ad805f6bace83cf5ced0fca3b5e9c493585`; remote feature remains `318fdffc881e9727c5512b1cc387ac95431f88ae`. Neither is edited or pushed.
- Six tested patches were applied with checks: Admin, Reading, Homework, Assistant, Cleanup preview, Vocab Library hooks. No historical whole-file rollback or main/feature merge.
- Pre-push hashes verify **23 Vocab assets, 56 protected main files and 98 QA evidence files** unchanged. Patched index/API and all original tests remain identical to the tested candidate. Only handoff/authorization documentation changed after QA; no test rerun is needed for these documentation updates.
- Current GitHub API reads: **0 Actions workflows, 0 repository webhooks, 0 deployment records**. GitHub Pages endpoint returns 404. No workflow or other deployment configuration file is present in the branch. Cloudflare configuration is owner-confirmed, not independently read from its dashboard. No unexpected deployment service was found in the inspected configuration; `[CF-Pages-Skip]` is additional protection.
- The resulting integration commit SHA is recorded by Git and the final response; this document does not attempt to embed its own commit hash.

## QA results retained unchanged

| Check | Result |
| --- | --- |
| Fresh main baseline | 13/28 commands PASS; 402/436 assertions |
| Integration Main QA | **25/28 commands PASS; 426/436 assertions** |
| Original full feature comparator | **PASS: 130 Node tests, 244 regressions, 10/10 browser suites, 443 screenshots** |
| Integrated Vocab browser | **PASS 10/10 suites**, zero transport violations |
| Integration role/viewport/theme browser | **PASS 18/18 scenarios** |
| Additional API/submission/security | **PASS 5/5** |
| Firebase Emulator | **PASS 11 security + 2 browser tests**, all 87 new routes |

[Machine-readable QA/protection evidence](SAFE-INTEGRATION-QA.json), [deployment gate](SAFE-INTEGRATION-DEPLOYMENT-GATE.json) and `safe-integration-evidence/` preserve exact inputs, logs and hashes. Raw screenshots/artifacts remain under the feature checkout's ignored `qa-artifacts/safe-integration/` and `qa-artifacts/safe-integration-feature/` directories.

The original feature QA Runner remains a comparator with its branch/baseline guards intact; its generated status docs were redirected to ignored artifacts so feature stayed clean. The integration branch separately ran all 28 unchanged main commands and all ten original Vocab browser suites against its exact runtime through a read-only overlay. Vocab Node inputs are byte-identical to the verified branch assets. No assertion or baseline was weakened.

The 18 actual-worktree browser scenarios cover Library mount/back, student/tester/admin access, Writing forced-route/forged-flag/revocation/reload, Reading renderer, Homework card and Admin/Class smoke at 390/768/1280 in light/dark. Detailed Reading/Homework/Assistant behaviour is covered by original scripts and additional API/VM tests, not claimed as deployed service end-to-end validation.

## Behaviour and remaining gates

Writing stays latest-main: ordinary students Coming Soon and route-denied; Admin/roster Tester preview, focused lesson and Back retained. Vocab remains Library → Learning Materials with Standard 20/Quick 12, Reality Check, Personalized Missions and Teacher Review; no Save the Coast production listing. Homework requires a successful explicit Submit; Assistant remains class-scoped; Cleanup is preview-only.

- `data-cleanup.test.js`: **13/15**, two destructive expectations intentionally fail.
- `server-purge.test.js`: **0/8**, destructive functions/routes intentionally not restored.
- `lm-check.js --release`: **FAIL / teacher review**, 206 Unit 0 and 226 Unit 2 items pending.
- All **102 Vocab drafts remain pending**, zero actual approvals/publications. Approved Vocabulary Bank, five terminology decisions and Independent Recall Option A are unchanged.
- Emulator security uses synthetic demo identities and restores 102 DRAFT records in teardown. All 87 routes persist/recover versioned evidence. Emulator processes were stopped. The existing isolated feature staging service is a test comparator, not a deployed auth adapter for this branch; real signed-token/IAM/rules integration and migration remain **NOT_TESTED**.

## Staging and rollback

[SAFE-INTEGRATION-STAGING-PLAN.md](SAFE-INTEGRATION-STAGING-PLAN.md) remains **plan only**: dedicated synthetic projects/host/data, least-privilege IAM, signed-token/current-role verification, separate preview/review/publish capabilities, UID-scoped versioned progress, rules, revocation/concurrency tests, cost limits and rollback. No resource, binding, credential or environment was provisioned.

Still required: review this source branch; separately authorize synthetic staging configuration and security validation; teacher review of exact Vocab/Writing versions and separate publication approval. Any PR, main merge, deployment, production migration or destructive cleanup requires explicit new authorization.

Reproduction uses `tools/safe-integration-qa.cjs` with the unchanged feature checkout via `SAFE_FEATURE_CHECKOUT` and ignored output via `SAFE_QA_OUTPUT`. Existing run directories are immutable. The historical packaging tool records the initial local QA snapshot; the subsequent push authorization is preserved separately in the deployment-gate JSON.

For rollback, retain evidence and prepare a separate branch from the recorded main base, applying only reviewed increments. Never reset main/feature or restore historical whole files. No remote runtime/data rollback is needed because this branch-only push does not deploy the application. Do not delete the worktree or its evidence without owner instruction.
