# Vocab QA status

**BLOCKED** · QA FAIL · round 3/3 · full

- Timestamp (Asia/Saigon): 2026-10-30 17:50:23 GMT+7
- UTC: 2026-10-30T10:50:23.255Z
- Branch/SHA: `feature/vocab-lab` / `a53fa21aa14d756675f7bdd9fab7925c8d597615`
- Working source fingerprint: `395573925a5d2a7696770ba2bbd09276d6befa90fddd2a633f70bff40fca17a9` (dirty working tree)
- Command: `node tools/vocab-qa-runner.cjs --session phase26-final --round 3 --changes-file qa-artifacts/phase26-final/round3-changes.json`
- Session: `phase26-final`
- Environment: Node v24.22.1, win32/x64, Playwright unavailable, browser msedge
- Tests: 105 Node tests + 244 core assertions; 2 failed commands
- Artifact directory: `qa-artifacts/phase26-final/round-3-full` (0 screenshots)
- Static manifest: `baaea8097dce421e107dd2e1a961908b1f08e1538b339cc820817a7858d15397`

## Coverage

| Feature | Status | Mandatory | Evidence / limitation |
| --- | --- | --- | --- |
| dependencies | FAIL | yes | Pinned Playwright and installed browser; missing browser fails preflight. |
| artifact-safety | PASS | yes | Exact 26-file allowlist, byte manifest, CSP, no Firebase/backend/external URLs. |
| writing-scope | PASS | yes | Normalized protected hashes + nested tree; app/Writing/auth/data untouched. |
| source-provenance | PASS | yes | Exact repository, branch/SHA and working-source fingerprint unchanged throughout the run. |
| visual-baseline | NOT_TESTED | yes | Committed style/markup hashes, explicit geometry/type metrics, screenshots; no automatic baseline updates. |
| network-isolation | FAIL | yes | Browser transport guard + fixture-only HTTPS origin simulation; no external transport or API writes. |
| core-vocab | PASS | yes | 102 approved boundaries, 12/20/mixed, partial, review, sampling, evidence, idempotency. |
| core-regression-244 | PASS | yes | All ten original regression scripts; assert count must remain at least 244. |
| writing-content | PASS | yes | Existing Unit 0/2 content validator; no editorial rewriting. |
| check-flow | NOT_TESTED | yes | New 20/12, legacy12, undo/save/reload, A/B, pause, one wrong/duplicate input. |
| mission-prototype | NOT_TESTED | yes | Actual classified eligible/empty flow, Case/Investigate/Decode/Morph/Final/Debrief/Sorting; Coast internal fixture only. |
| library-permissions | NOT_TESTED | yes | Library LM, no standalone nav, ordinary students blocked, mocked admin/tester/UID account paths; UI privilege is not a rules bypass. |
| full-102-personalized-missions | NOT_IMPLEMENTED | yes | 0/102 published targets; 15 candidate targets; 5 context-only senses. Missing approved full-bank routes prevent readiness. |
| curated-engine | NOT_TESTED | yes | Three candidates, actual classifications, identity/version persistence and independent forms; QA content is not publication. |
| editorial-workbench | NOT_TESTED | yes | Local exact-version review, edits, audit, migration, role gates and draft rehearsal; no live AI/publication. |
| draft-102-routes | NOT_TESTED | yes | 102 independently assessable DRAFT senses: 15 pilot + 87 new routes, 4 explicit editorial blockers; 0 human-approved shipped, 0 published. |
| curriculum-editorial | TEACHER_REVIEW | yes | IELTS sense/context quality and pending teaching content need teacher approval; automation is not the authority. |
| human-visual-ux | TEACHER_REVIEW | no | Teacher reviews screenshots/aesthetics; screenshot automation is not aesthetic approval. |
| staging-auth-security | TEACHER_REVIEW | yes | Mocks/static contracts only. Firebase emulator/staging auth/rules required before production; no live credentials/student data used. |
| latest-main-reconciliation | NOT_TESTED | no | Offline run does not fetch/merge main. Writing baseline compatibility is checked; latest main divergence must be reconciled before a future approved merge. |

## Commands

| Suite | Result | Log |
| --- | --- | --- |
| scope | PASS | PASS |
| visual-baseline-source | PASS | PASS |
| build-verify | PASS | PASS |
| browser-preflight | FAIL | Cannot find module 'playwright/package.json'
Require stack:
- C:\Users\hnnhiii\Documents\Codex\2026-10-28\github-plugin-github-openai-curated-remote\work\mini-drills\tools\vocab-qa-runner.cjs |
| unit | PASS | logs/unit.txt |
| regression-admin-kick | PASS | logs/regression-admin-kick.txt |
| regression-chart-facts | PASS | logs/regression-chart-facts.txt |
| regression-lm-meta | PASS | logs/regression-lm-meta.txt |
| regression-lm-unit0 | PASS | logs/regression-lm-unit0.txt |
| regression-lm-unit2-ui | PASS | logs/regression-lm-unit2-ui.txt |
| regression-misc | PASS | logs/regression-misc.txt |
| regression-reading | PASS | logs/regression-reading.txt |
| regression-server-purge | PASS | logs/regression-server-purge.txt |
| regression-sign-in | PASS | logs/regression-sign-in.txt |
| regression-ui-audit | PASS | logs/regression-ui-audit.txt |
| writing-content | PASS | logs/writing-content.txt |
| reality | NOT_TESTED | Browser preflight failed |
| batch | NOT_TESTED | Browser preflight failed |
| isolation | NOT_TESTED | Browser preflight failed |
| visual | NOT_TESTED | Browser preflight failed |
| check | NOT_TESTED | Browser preflight failed |
| accessibility | NOT_TESTED | Browser preflight failed |
| mission | NOT_TESTED | Browser preflight failed |
| shell | NOT_TESTED | Browser preflight failed |
| engine | NOT_TESTED | Browser preflight failed |
| editorial | NOT_TESTED | Browser preflight failed |
| network-verify | FAIL | Required browser transport evidence missing. |
| source-provenance | PASS | PASS |
| final-artifact-verify | PASS | PASS |

## Failures and open issues

- HIGH · missing-browser-or-dependency: Cannot find module 'playwright/package.json'
Require stack:
- C:\Users\hnnhiii\Documents\Codex\2026-10-28\github-plugin-github-openai-curated-remote\work\mini-drills\tools\vocab-qa-runner.cjs. Reproduce: `Install pinned Playwright + browser (see docs/VOCAB-QA-PROTOCOL.md)`
- HIGH · network-verify: Required browser transport evidence missing.. Reproduce: `network-verify`
- dependencies: FAIL — Pinned Playwright and installed browser; missing browser fails preflight.
- visual-baseline: NOT_TESTED — Committed style/markup hashes, explicit geometry/type metrics, screenshots; no automatic baseline updates.
- network-isolation: FAIL — Browser transport guard + fixture-only HTTPS origin simulation; no external transport or API writes.
- check-flow: NOT_TESTED — New 20/12, legacy12, undo/save/reload, A/B, pause, one wrong/duplicate input.
- mission-prototype: NOT_TESTED — Actual classified eligible/empty flow, Case/Investigate/Decode/Morph/Final/Debrief/Sorting; Coast internal fixture only.
- library-permissions: NOT_TESTED — Library LM, no standalone nav, ordinary students blocked, mocked admin/tester/UID account paths; UI privilege is not a rules bypass.
- full-102-personalized-missions: NOT_IMPLEMENTED — 0/102 published targets; 15 candidate targets; 5 context-only senses. Missing approved full-bank routes prevent readiness.
- curated-engine: NOT_TESTED — Three candidates, actual classifications, identity/version persistence and independent forms; QA content is not publication.
- editorial-workbench: NOT_TESTED — Local exact-version review, edits, audit, migration, role gates and draft rehearsal; no live AI/publication.
- draft-102-routes: NOT_TESTED — 102 independently assessable DRAFT senses: 15 pilot + 87 new routes, 4 explicit editorial blockers; 0 human-approved shipped, 0 published.
- curriculum-editorial: TEACHER_REVIEW — IELTS sense/context quality and pending teaching content need teacher approval; automation is not the authority.
- human-visual-ux: TEACHER_REVIEW — Teacher reviews screenshots/aesthetics; screenshot automation is not aesthetic approval.
- staging-auth-security: TEACHER_REVIEW — Mocks/static contracts only. Firebase emulator/staging auth/rules required before production; no live credentials/student data used.
- latest-main-reconciliation: NOT_TESTED — Offline run does not fetch/merge main. Writing baseline compatibility is checked; latest main divergence must be reconciled before a future approved merge.

## Changes in this round

- Round 2 sandbox prevented atomic temporary-file rename and localhost connection (EPERM/EACCES), and browser preflight. Run the unchanged test suite outside sandbox; preserve all gates and failed evidence.; files: ; reproduction: round-2-full/logs/unit.txt: 103/105 tests passed; EPERM rename and EACCES 127.0.0.1. Existing round-1 geometry synchronization fix remains under full regression.

## Next action

BLOCKED: do not label the entire Vocab Lab release-ready. Keep prototype QA results distinct from unimplemented full-102 missions. Stop after round 3; do not rewrite approved pedagogy or retry a failure until it happens to pass.

Machine-readable report: `docs/VOCAB-QA-STATUS.json`; immutable run `report.json`, logs, screenshots and network reports are in the artifact directory.
