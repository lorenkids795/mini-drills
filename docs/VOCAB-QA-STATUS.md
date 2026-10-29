# Vocab QA status

**BLOCKED** · QA PASS · round 3/3 · full

- Timestamp (Asia/Saigon): 2026-10-29 23:54:47 GMT+7
- UTC: 2026-10-29T16:54:47.264Z
- Branch/SHA: `feature/vocab-lab` / `05a79710470a966fa31a211ce7375198bc489d51`
- Working source fingerprint: `241e6f08cc39e25ae855d826c08e1f8550a6b062193f9aeec4fd0078cebfeeb2` (dirty working tree)
- Command: `node tools/vocab-qa-runner.cjs --session autonomous-qa-20261029 --round 3 --changes-file qa-artifacts/autonomous-qa-20261029/changes-round-3.json`
- Session: `autonomous-qa-20261029`
- Environment: Node v24.22.1, win32/x64, Playwright 1.62.1, browser msedge
- Tests: 72 Node tests + 244 core assertions; 0 failed commands
- Artifact directory: `qa-artifacts/autonomous-qa-20261029/round-3-full` (304 screenshots)
- Static manifest: `dfd8aaf1b4c141054369b88f4fd39d5c6bc0de67d16568dde9599ddbf7cadb0c`

## Coverage

| Feature | Status | Mandatory | Evidence / limitation |
| --- | --- | --- | --- |
| dependencies | PASS | yes | Pinned Playwright and installed browser; missing browser fails preflight. |
| artifact-safety | PASS | yes | Exact 17-file allowlist, byte manifest, CSP, no Firebase/backend/external URLs. |
| writing-scope | PASS | yes | Normalized protected hashes + nested tree; app/Writing/auth/data untouched. |
| source-provenance | PASS | yes | Exact repository, branch/SHA and working-source fingerprint unchanged throughout the run. |
| visual-baseline | PASS | yes | Committed style/markup hashes, explicit geometry/type metrics, screenshots; no automatic baseline updates. |
| network-isolation | PASS | yes | Browser transport guard + fixture-only HTTPS origin simulation; no external transport or API writes. |
| core-vocab | PASS | yes | 102 approved boundaries, 12/20/mixed, partial, review, sampling, evidence, idempotency. |
| core-regression-244 | PASS | yes | All ten original regression scripts; assert count must remain at least 244. |
| writing-content | PASS | yes | Existing Unit 0/2 content validator; no editorial rewriting. |
| check-flow | PASS | yes | New 20/12, legacy12, undo/save/reload, A/B, pause, one wrong/duplicate input. |
| mission-prototype | PASS | yes | Actual classified eligible/empty flow, Case/Investigate/Decode/Morph/Final/Debrief/Sorting; Coast internal fixture only. |
| library-permissions | PASS | yes | Library LM, no standalone nav, ordinary students blocked, mocked admin/tester/UID account paths; UI privilege is not a rules bypass. |
| full-102-personalized-missions | NOT_IMPLEMENTED | yes | Only a five-sense authored linked prototype exists. No approved mission generation for all 102 terms; this prevents release readiness. |
| curriculum-editorial | TEACHER_REVIEW | no | IELTS sense/context quality and pending teaching content need teacher approval; automation is not the authority. |
| human-visual-ux | TEACHER_REVIEW | no | Teacher reviews screenshots/aesthetics; screenshot automation is not aesthetic approval. |
| staging-auth-security | TEACHER_REVIEW | no | Mocks/static contracts only. Firebase emulator/staging auth/rules required before production; no live credentials/student data used. |
| latest-main-reconciliation | NOT_TESTED | no | Offline run does not fetch/merge main. Writing baseline compatibility is checked; latest main divergence must be reconciled before a future approved merge. |

## Commands

| Suite | Result | Log |
| --- | --- | --- |
| scope | PASS | PASS |
| visual-baseline-source | PASS | PASS |
| build-verify | PASS | PASS |
| browser-preflight | PASS |  |
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
| reality | PASS | logs/reality.txt |
| batch | PASS | logs/batch.txt |
| isolation | PASS | logs/isolation.txt |
| visual | PASS | logs/visual.txt |
| check | PASS | logs/check.txt |
| accessibility | PASS | logs/accessibility.txt |
| mission | PASS | logs/mission.txt |
| shell | PASS | logs/shell.txt |
| network-verify | PASS | PASS |
| source-provenance | PASS | PASS |
| final-artifact-verify | PASS | PASS |

## Failures and open issues

- No reproducible test failures in this run.
- full-102-personalized-missions: NOT_IMPLEMENTED — Only a five-sense authored linked prototype exists. No approved mission generation for all 102 terms; this prevents release readiness.
- curriculum-editorial: TEACHER_REVIEW — IELTS sense/context quality and pending teaching content need teacher approval; automation is not the authority.
- human-visual-ux: TEACHER_REVIEW — Teacher reviews screenshots/aesthetics; screenshot automation is not aesthetic approval.
- staging-auth-security: TEACHER_REVIEW — Mocks/static contracts only. Firebase emulator/staging auth/rules required before production; no live credentials/student data used.
- latest-main-reconciliation: NOT_TESTED — Offline run does not fetch/merge main. Writing baseline compatibility is checked; latest main divergence must be reconciled before a future approved merge.

## Changes in this round

- A page.route handler could bypass the context.route transport guard via continue(). Adversarial fake-route probe reproduced unsafeContinuation=1 without any actual network.; files: tools/vocab-qa-preload.cjs, tests/vocab-qa-runner.test.js, docs/VOCAB-QA-PROTOCOL.md; reproduction: node ../qa-network-probe.cjs qa-artifacts/autonomous-qa-20261029/page-route-after.json; expected unsafeContinuation=0, aborts=1, violation reported. Existing before probe is page-route-before.json.
- Preserve the original failure cause for nonzero subprocess exits; count-accounting rejection is specifically for exit-zero false greens.; files: tools/vocab-qa-runner.cjs; reproduction: Unit test fake exit-zero command with no counts must FAIL accounting; genuine nonzero failure retains its command/log diagnosis.

## Next action

BLOCKED: do not label the entire Vocab Lab release-ready. Keep prototype QA results distinct from unimplemented full-102 missions. Stop after round 3; do not rewrite approved pedagogy or retry a failure until it happens to pass.

Machine-readable report: `docs/VOCAB-QA-STATUS.json`; immutable run `report.json`, logs, screenshots and network reports are in the artifact directory.
