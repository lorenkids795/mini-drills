# Vocab QA status

**BLOCKED** · QA PASS · round 1/3 · focused

- Timestamp (Asia/Saigon): 2026-11-06 00:04:23 GMT+7
- UTC: 2026-11-05T17:04:23.651Z
- Branch/SHA: `feature/vocab-lab` / `9a6c095f271e5435f281d1d683d6f6a928434214`
- Working source fingerprint: `d0d30a3dd9c39fec052141f210b707132cf63ee2eba6b22d6adc72a74b28980a` (dirty working tree)
- Command: `node tools/vocab-qa-runner.cjs --session main-recovery-implementation --round 1 --focused --suite batch`
- Session: `main-recovery-implementation`
- Environment: Node v24.22.1, win32/x64, Playwright 1.62.1, browser msedge
- Tests: 0 Node tests + 0 core assertions; 0 failed commands
- Artifact directory: `qa-artifacts/main-recovery-implementation/round-1-focused-batch` (24 screenshots)
- Static manifest: `aa1d4474e101245cf429864219d2762fb187d90e221f56016e894ecf546278ea`

## Coverage

| Feature | Status | Mandatory | Evidence / limitation |
| --- | --- | --- | --- |
| dependencies | PASS | yes | Pinned Playwright and installed browser; missing browser fails preflight. |
| artifact-safety | PASS | yes | Exact 26-file allowlist, byte manifest, CSP, no Firebase/backend/external URLs. |
| writing-scope | PASS | yes | Normalized protected hashes + nested tree; app/Writing/auth/data untouched. |
| source-provenance | PASS | yes | Exact repository, branch/SHA and working-source fingerprint unchanged throughout the run. |
| visual-baseline | NOT_TESTED | yes | Committed style/markup hashes, explicit geometry/type metrics, screenshots; no automatic baseline updates. |
| network-isolation | PASS | yes | Browser transport guard + fixture-only HTTPS origin simulation; no external transport or API writes. |
| core-vocab | NOT_TESTED | yes | 102 approved boundaries, 12/20/mixed, partial, review, sampling, evidence, idempotency. |
| core-regression-244 | NOT_TESTED | yes | All ten original regression scripts; assert count must remain at least 244. |
| writing-content | NOT_TESTED | yes | Existing Unit 0/2 content validator; no editorial rewriting. |
| check-flow | NOT_TESTED | yes | New 20/12, legacy12, undo/save/reload, A/B, pause, one wrong/duplicate input. |
| mission-prototype | NOT_TESTED | yes | Actual classified eligible/empty flow, Case/Investigate/Decode/Morph/Final/Debrief/Sorting; Coast internal fixture only. |
| library-permissions | NOT_TESTED | yes | Library LM, no standalone nav, ordinary students blocked, mocked admin/tester/UID account paths; UI privilege is not a rules bypass. |
| full-102-personalized-missions | NOT_IMPLEMENTED | yes | 0/102 published targets; 15 candidate targets; 5 context-only senses. Missing approved full-bank routes prevent readiness. |
| curated-engine | NOT_TESTED | yes | Three candidates, actual classifications, identity/version persistence and independent forms; QA content is not publication. |
| editorial-workbench | NOT_TESTED | yes | Local exact-version review, edits, audit, migration, role gates and draft rehearsal; no live AI/publication. |
| draft-102-routes | NOT_TESTED | yes | 102 independently assessable DRAFT senses: 15 pilot + 87 new routes, 4 explicit editorial blockers; 0 human-approved shipped, 0 published. |
| curriculum-editorial | TEACHER_REVIEW | yes | IELTS sense/context quality and pending teaching content need teacher approval; automation is not the authority. |
| human-visual-ux | TEACHER_REVIEW | no | Teacher reviews screenshots/aesthetics; screenshot automation is not aesthetic approval. |
| staging-auth-security | TEACHER_REVIEW | yes | This runner covers mocks/static contracts. Separate Phase 2.8 emulator evidence is in VOCAB-PHASE-2.8-HANDOFF.md; deployed staging, signed-token/IAM and human security review remain required. No live student data. |
| latest-main-reconciliation | NOT_TESTED | no | Offline run does not fetch/merge main. Writing baseline compatibility is checked; latest main divergence must be reconciled before a future approved merge. |

## Commands

| Suite | Result | Log |
| --- | --- | --- |
| scope | PASS | PASS |
| visual-baseline-source | PASS | PASS |
| build-verify | PASS | PASS |
| browser-preflight | PASS |  |
| batch | PASS | logs/batch.txt |
| network-verify | PASS | PASS |
| source-provenance | PASS | PASS |
| final-artifact-verify | PASS | PASS |

## Failures and open issues

- No reproducible test failures in this run.
- visual-baseline: NOT_TESTED — Committed style/markup hashes, explicit geometry/type metrics, screenshots; no automatic baseline updates.
- core-vocab: NOT_TESTED — 102 approved boundaries, 12/20/mixed, partial, review, sampling, evidence, idempotency.
- core-regression-244: NOT_TESTED — All ten original regression scripts; assert count must remain at least 244.
- writing-content: NOT_TESTED — Existing Unit 0/2 content validator; no editorial rewriting.
- check-flow: NOT_TESTED — New 20/12, legacy12, undo/save/reload, A/B, pause, one wrong/duplicate input.
- mission-prototype: NOT_TESTED — Actual classified eligible/empty flow, Case/Investigate/Decode/Morph/Final/Debrief/Sorting; Coast internal fixture only.
- library-permissions: NOT_TESTED — Library LM, no standalone nav, ordinary students blocked, mocked admin/tester/UID account paths; UI privilege is not a rules bypass.
- full-102-personalized-missions: NOT_IMPLEMENTED — 0/102 published targets; 15 candidate targets; 5 context-only senses. Missing approved full-bank routes prevent readiness.
- curated-engine: NOT_TESTED — Three candidates, actual classifications, identity/version persistence and independent forms; QA content is not publication.
- editorial-workbench: NOT_TESTED — Local exact-version review, edits, audit, migration, role gates and draft rehearsal; no live AI/publication.
- draft-102-routes: NOT_TESTED — 102 independently assessable DRAFT senses: 15 pilot + 87 new routes, 4 explicit editorial blockers; 0 human-approved shipped, 0 published.
- curriculum-editorial: TEACHER_REVIEW — IELTS sense/context quality and pending teaching content need teacher approval; automation is not the authority.
- human-visual-ux: TEACHER_REVIEW — Teacher reviews screenshots/aesthetics; screenshot automation is not aesthetic approval.
- staging-auth-security: TEACHER_REVIEW — This runner covers mocks/static contracts. Separate Phase 2.8 emulator evidence is in VOCAB-PHASE-2.8-HANDOFF.md; deployed staging, signed-token/IAM and human security review remain required. No live student data.
- latest-main-reconciliation: NOT_TESTED — Offline run does not fetch/merge main. Writing baseline compatibility is checked; latest main divergence must be reconciled before a future approved merge.

## Changes in this round

- Initial QA run; no automatic code/content edits.

## Next action

BLOCKED: do not label the entire Vocab Lab release-ready. Keep prototype QA results distinct from unimplemented full-102 missions. Stop after round 3; do not rewrite approved pedagogy or retry a failure until it happens to pass.

Machine-readable report: `docs/VOCAB-QA-STATUS.json`; immutable run `report.json`, logs, screenshots and network reports are in the artifact directory.
