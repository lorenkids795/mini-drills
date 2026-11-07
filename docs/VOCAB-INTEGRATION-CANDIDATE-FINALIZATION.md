# Integration Candidate Finalization

2026-11-07 (Asia/Saigon). Candidate-only integration; **not authorization or readiness for release**. No application source changes on feature/main, merge, PR, deployment, production connection or actual content approvals.

## Sources and builder fix

- Latest fetched main: `5a0c18b3fa35c6ae0f284cc2e5e7c7e5355152ed`.
- Feature source/handoff: `f6555c2c2e6fe7a4c849d95a8133b21eeaca73d2`.
- Fresh detached baseline and candidate: `qa-artifacts/integration-finalization/{baseline,candidate}`. Old recovery worktrees are retained unchanged.

The previous builder replaced the entire Learning Materials region after resolving a dry merge tree, deleting `vocabMaterialsHTML` and related helpers. The repaired builder starts with latest-main index and uses unique, asserted insertion anchors for Vocab styles/scripts, mount section, Library category/helpers, navigation, back, login/deep-link and account refresh hooks. It does not replace Writing, existing Library functions, Reading, Homework or main role/tab definitions. All Writing bytes between the existing Library Learning Materials boundary and `renderLib` are preserved. Missing or duplicate anchors and already-integrated main fail closed.

The original `vocab-integration.test.js` now passes **4/4**, with no test changes. Seven additional missing/duplicate/idempotency checks pass. Navigation is also exercised in browsers: Library → Learning Materials → Check/Missions → Back, ordinary-user denial, no extra sidebar tab and no Save the Coast entry. The initial builder check caught main's versioned config script; the insertion now preserves that exact tag. A negative-anchor probe initially duplicated only part of an anchor; corrected probe uses the complete anchor. No production code changed for these checks.

## Composition and proposals

The five previously tested patches apply with `git apply --check` to fresh main, in the approved order: Admin → Reading → Homework → Assistant → Cleanup preview. No adaptation or old whole-file restoration was necessary. The Vocab-only Library patch follows them. Writing already satisfies the required policy; no Writing patch is reapplied.

Proposals and source/asset hashes are in [the manifest](integration-finalization/manifest.json):

1. [Admin](integration-finalization/01-admin.patch)
2. [Reading](integration-finalization/02-reading.patch)
3. [Homework](integration-finalization/03-homework.patch)
4. [Assistant](integration-finalization/04-assistant.patch)
5. [Cleanup preview](integration-finalization/05-cleanup.patch)
6. [Vocab Library hooks](integration-finalization/06-vocab-library.patch)

These are independently reviewable **ordered increments**, not interchangeable patches against main. Vocab JS/CSS/JSON assets must also be copied from the exact feature source in the manifest with matching hashes; they are not silently taken from an older main or preview. No nested `mini-drills/` copy is edited. Main tests, Writing lessons, backend/config, rules, chart and all other tracked main files remain byte-identical except index and the explicitly proposed API patch. Replay in a third detached worktree verifies the combined patch and asset bytes.

## QA matrix

| Verification | Result | Evidence / limits |
| --- | --- | --- |
| Fresh main, all 28 commands | **13 PASS / 15 FAIL**, 402/436 assertions | [Baseline](integration-finalization/baseline-1-report.json) |
| Combined candidate, same unmodified 28 commands | **25 PASS / 3 FAIL**, 426/436 assertions | [Candidate](integration-finalization/candidate-1-report.json); failures classified below |
| Full feature QA Runner | **PASS**: 130 Node tests, 244 original regression assertions, 10/10 browser suites, 443 screenshots | [Full report](integration-finalization/round-1-full-report.json); overall release gate still BLOCKED |
| Candidate navigation/main browser | **PASS 18/18** | [Policy/browser](integration-finalization/policy-browser-report.json); student/tester/admin × 390/768/1280 × light/dark |
| Candidate original Vocab browser suites | **PASS 6/6**, zero transport violations | Reality, 20/12 batch, Mission, shell, curated engine, Teacher Review; unchanged assertions |
| Candidate additional Homework/auth/Cleanup | **PASS 5/5** | [Additional tests](integration-finalization/additional-tests.txt): successful/rejected Submit, retry, account/class isolation, local signed JWT verification, read-only cleanup |
| Firebase Emulator | **PASS 11 security + 2 browser tests** | [Emulator](integration-finalization/emulator-report.json); all 87 new routes persist/recover versioned evidence; teardown confirms 102 DRAFT, no retained fixture approvals |
| Deployed staging auth/IAM and actual-user migration | **NOT_TESTED / BLOCKED** | No production credentials/network/data or deployed staging environment used |

Full feature QA covers 20/12 sorting, Reality Check, Mission stages, Teacher Review, mobile/desktop light/dark, reload/account switching/cross-tab and existing regressions. Candidate browser smoke covers Writing Coming Soon/direct-action/forced-state/forged-flag/revocation plus authorized preview, Reading renderer, Homework card and Admin/Class navigation. More detailed Reading generation/review/import, Homework explicit Submit and assistant class scope are verified through unchanged main scripts and additional isolated API/VM tests; browser smoke is not claimed as live end-to-end Firebase integration.

Candidate round 1 was **5/6**: Mission's root-app demo fixture did not match main's versioned `md-config.js?...` URL, so demo login remained hidden. The QA preload now preserves candidate HTML and extends only existing local config/backend fixture matchers to accept cache queries. It retains the outer network guard and all callbacks/assertions. The overlay was also expanded to use every candidate root JS/CSS and data JSON (including latest-main chart/content), avoiding fallback to stale feature assets. All six suites pass in round 2; candidate source hash is unchanged. No test was weakened or skipped; round-1 failure logs remain. Full feature and emulator runs preceded this QA-only preload change; the candidate rerun validates that loader change. Packaging/report files are written after test completion.

## Expected failures and limits

- `data-cleanup.test.js` **13/15**: two expectations require purge/delete UI, outside the approved read-only policy. Preview and protected-user refusal pass. The candidate rejects non-preview cleanup operations and has no cleanup delete button/demo purge path.
- `server-purge.test.js` **0/8**: purgeStudent/adminClassDel/destructive route intentionally not restored. Do not enable them to make tests green.
- `lm-check.js --release` **FAIL / editorial BLOCKED**: latest main has **206 Unit 0 and 226 Unit 2 pending items**. Validation and access tests pass; no status is automatically approved.
- **102 Vocab drafts remain pending**, with zero real approval/publication. No gameplay, approved Vocabulary Bank, grading content or progress schema is rewritten. Published full-bank mission readiness is still blocked by editorial/publication gates.
- Firebase Emulator uses synthetic local demo identities and unsigned emulator tokens. Additional locally generated RSA-token tests verify the candidate verifier, but neither result proves deployed auth/IAM, revocation propagation, storage policy or production readiness. Main Firebase rules/backend remain unchanged; no automatic wiring to real student collections is proposed.

## Approval boundary and next steps

Reproduction in a fresh feature checkout with the pinned Node/Playwright runtime: run `node tools/vocab-integration-candidate.cjs`, `node tools/integration-finalization.cjs prepare`, then `baseline-1` and `candidate-1` through that same finalization tool. Run `node tools/vocab-qa-runner.cjs --session integration-finalization --round 1` for full feature QA and `node tools/integration-finalization-vocab.cjs 1` for candidate suites. The additional policy browser uses `tools/integration-finalization-browser.cjs` with the existing QA preload and Edge environment. Emulator commands remain in `staging/README.md`, with the exact demo test project. Existing evidence directories are immutable: inspect them rather than overwriting a run. At most three bounded cycles per scope are allowed.

1. Review the six proposed increments before applying them to a real integration source branch. This task commits only tools, documentation and proposals on `feature/vocab-lab` with `[CF-Pages-Skip]`.
2. Separately authorize a synthetic deployed staging configuration and real-auth adapter/IAM/rules validation; keep real student data excluded. Verify immediate account revocation and progress isolation there before considering rollout.
3. Teachers review the exact 102 draft versions and pending Writing content, assign reviewers/testers, and separately decide publication. Existing agreed vocabulary decisions are preserved, not reopened.
4. Keep Cleanup preview-only. Any deletion policy or migration requires separate authorization. Merge/PR/deploy remains unauthorized.

Rollback is candidate-only: retain immutable evidence and create a fresh detached main worktree; alternatively reverse checked patches in reverse order only when bytes match. Do not reset main/feature or restore historical whole files. No manual testing is requested for checks automation already covers.

Detailed final results: [machine-readable finalization](VOCAB-INTEGRATION-CANDIDATE-FINALIZATION.json). Logs/screenshots remain under the ignored `qa-artifacts/integration-finalization/` and `qa-artifacts/phase28/integration-finalization-1/`; committed JSON evidence includes log hashes and source provenance.
