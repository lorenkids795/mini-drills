# Main baseline recovery audit

**Audit complete; integration/release remains BLOCKED.** The Admin-only proposed repair passes its tests in a detached disposable worktree. No application repair has been applied to feature or main. No PR, merge, deployment, production connection or data operation occurred.

## Sources and isolation

- Main: `8d9cf7742a14f64db4d7e22f63a395ee68531113`.
- Immediate parent: `ff1a3b363ce2ba102fbd534380b09a1d2ea66234`.
- Feature audit base: `b9d7075af2031feac89d13a4765283cae09c9ef3` (supplied recovery instructions).
- Read the follow-up report/QA JSON and exact Writing gate proposal. The requested repository recovery document was supplied; no separate full attachment was present in this request.
- Three task-owned detached worktrees under ignored `qa-artifacts/main-baseline-recovery/`: `baseline` (latest main, clean), `candidate` (latest main plus Admin-only proposal), `historical-parent` (clean, diagnostic only). No other task checkout was reused. Historical source was **not** copied wholesale into the repair candidate.
- Main/feature refs are preserved. All main tests are unchanged. Candidate Writing region, lesson files, API, auth/backend config and Firebase rules remain identical to baseline. Feature Writing, Vocab runtime, approved bank and all draft/student data remain unchanged.

Full issue ledger, every failed assertion label, command results, history evidence and log hashes: [MAIN-BASELINE-RECOVERY-ISSUES.json](MAIN-BASELINE-RECOVERY-ISSUES.json). Teacher decisions: [MAIN-BASELINE-RECOVERY-DECISIONS.md](MAIN-BASELINE-RECOVERY-DECISIONS.md).

## Verified root cause

All ten failing application test scripts are byte-identical on main and its immediate parent. **All 106/106 assertions in those scripts pass on the untouched parent.** They fail on current main with 104 failing assertions. Git symbol history and parent/current source comparisons show that 8d9cf77 removed the corresponding functions or reverted their routing. This is a verified source regression boundary, not merely stale tests. The upload commit message does not establish whether the broad removal was intentional; the recovery does not assume permission to undo the entire upload.

| Group | Main symptom / source cause | Minimal proposed recovery | State / risk |
| --- | --- | --- | --- |
| Admin actions | Duplicate `ad-tadd`; shared form IDs; wrong handler reads absent tester fields while adding a teacher | Separate teacher/tester actions and IDs; restore guarded form reads | Tested proposal; low–medium account-creation UI risk |
| Create Reading UI | Missing `rdRvAct` and preview/review-state handlers | Restore preview/review dispatch after shared Reading revision contract | Design only; medium |
| Reading generation | Missing `aiReadingPart`, part validation/retry orchestration | Restore isolated part endpoint + validator, then client retries; mock AI transport | Design only; medium–high |
| Reading import | Missing `rdImport`, per-level validation and preview | Local three-level import/validation with unchanged passage; no AI calls | Design only; medium |
| Reading review | Missing `rdRetry`, revision/accept/undo/approval-state helpers | Restore versioned draft state and no-op checks before permitting add | Design only; high editorial risk |
| External Homework | Missing `extSubsHTML` and external submission workflow | Restore external-task schema/render/submit contract; preserve legacy assignments | Design only; medium |
| Mixed Homework | Missing `asgState`, mixed form/completion state | Restore ex/ext normalization, stable task IDs and completion after external task contract | Design only; medium–high |
| Homework Assistant | Missing `hwaData`, role/class authorization route and UI | Separate authoritative assistant role/class adapter; immediate revocation/privacy checks | Design only; high authorization risk |
| Cleanup / staff views | Missing `adminOrphans`, live-roster filtering and orphan preview/purge | Preview-first exact-email/current-roster protection; separate purge/audit and staff filters | Design only; high deletion/identity risk |
| Writing access | Missing `lmTester`, policy gate and focused lesson view | Review existing narrow gate proposal; separately consider focused layout and legacy fixtures | Review only; Writing untouched |

User-visible effects are inferred from source and executable UI/API contracts: unavailable preview/retry/import/review flows, broken Admin account creation, missing extended Homework/assistant behavior and absent cleanup/staff filtering. The tests also verify server roles, class restrictions, stale state and error paths. These are local fixture results, not observations of a deployed production site.

Each ledger item records classification, regression commit, source symbol, parent/current counts, impact, scoped file list, minimal plan, risk and exact verification/approval needed. **Only Admin has a new implemented repair proposal in this audit.** The other groups have reviewable recovery plans, not tested code patches; no blanket claim of recovery is made.

## QA and before/after

- **Latest-main baseline:** 12/23 commands PASS, 11 FAIL; **246/350** counted assertions PASS.
- **Admin-only candidate:** 13/23 commands PASS, 10 FAIL; **254/350** counted assertions PASS. All eight Admin failures fixed; no previously passing command or assertion regressed.
- **Historical diagnostic:** 10/10 identical application test scripts PASS; **106/106** assertions. This is attribution evidence, not a recommended release tree.
- **Writing release:** both baseline/candidate fail intentionally: Unit 2 has **152 pending**, Unit 0 **165 pending**. Do not approve or alter these items automatically.

The 23 commands are all 20 root main `*.test.js` files, `contrast.js`, `contrast-rules.js`, and `lm-check.js --release`. Counts refer to scripts emitting x/y assertion counters; auxiliary command status is reported separately. All run with outbound non-loopback transport blocked and fake identities/KV/API fixtures. No actual model API, Firebase/Cloudflare deployment or real student data is used.

| Command | Main baseline | Admin-only candidate |
| --- | --- | --- |
| `tests/admin-actions.test.js` | FAIL 1/9 | PASS 9/9 |
| `tests/admin-kick.test.js` | PASS 50/50 | PASS 50/50 |
| `tests/chart-facts.test.js` | PASS 56/56 | PASS 56/56 |
| `tests/create-reading-ui.test.js` | FAIL 0/9 | FAIL 0/9 |
| `tests/data-cleanup.test.js` | FAIL 0/15 | FAIL 0/15 |
| `tests/hw-assistant.test.js` | FAIL 0/10 | FAIL 0/10 |
| `tests/hw-external.test.js` | FAIL 0/7 | FAIL 0/7 |
| `tests/hw-mixed.test.js` | FAIL 0/13 | FAIL 0/13 |
| `tests/lm-access.test.js` | FAIL 0/9 | FAIL 0/9 |
| `tests/lm-meta.test.js` | PASS 22/22 | PASS 22/22 |
| `tests/lm-unit0.test.js` | PASS 23/23 | PASS 23/23 |
| `tests/lm-unit2-ui.test.js` | PASS 41/41 | PASS 41/41 |
| `tests/misc.test.js` | PASS 6/6 | PASS 6/6 |
| `tests/reading-gen.test.js` | FAIL 0/14 | FAIL 0/14 |
| `tests/reading-import.test.js` | FAIL 1/10 | FAIL 1/10 |
| `tests/reading-review.test.js` | FAIL 0/10 | FAIL 0/10 |
| `tests/reading.test.js` | PASS 12/12 | PASS 12/12 |
| `tests/server-purge.test.js` | PASS 8/8 | PASS 8/8 |
| `tests/sign-in.test.js` | PASS 11/11 | PASS 11/11 |
| `tests/ui-audit.test.js` | PASS 15/15 | PASS 15/15 |
| `tests/contrast.js` | PASS | PASS |
| `tests/contrast-rules.js` | PASS | PASS |
| `tests/lm-check.js --release` | FAIL | FAIL |

### Environment and bounded iterations

Fresh Windows checkout converted source to CRLF. Several legacy harnesses search for literal `<script>\n(function(){`; on CRLF they extracted invalid JS (`Unexpected identifier 'html'`). Those are **environment/harness failures**, retained in `baseline-results`, not additional source regressions. Materializing the exact root Git blobs and refreshing unchanged index metadata produced the canonical baseline (`baseline-lf-results`). Tests were not edited. New worktrees should be created with per-command `-c core.autocrlf=false`; no global Git setting was changed.

The initial proposal guard stopped on stat-only dirty metadata after LF materialization; `candidate-1-results` therefore records the unchanged baseline, not a repair. After verifying every staged blob remained identical and refreshing metadata, the Admin-only proposal ran once as `candidate-2-results`. No third candidate repair cycle was needed. All logs remain immutable. Syntax checks passed for the final audit scripts; their final branch guard does not change candidate app behavior.

### Difference from the prior Vocab integration candidate

The prior Vocab+Writing-gate candidate had 10 PASS / 13 FAIL commands. It is **not** this Admin-only candidate. Its additional `lm-meta` and four Unit 0 failures come from legacy tests expecting a normal-student subtree/practice after publishing a fixture, contrary to the confirmed Coming Soon policy. The main baseline's missing `lmTester` masks those paths. Keep these classified as **policy/test-contract conflicts**, not Vocab gameplay regressions. The remaining `lm-access` focused-layout assertion concerns a removed layout, not permission to weaken access checks.

The Writing gate proposal is reviewed unchanged at [VOCAB-WRITING-POLICY-TEACHER-REVIEW.patch](VOCAB-WRITING-POLICY-TEACHER-REVIEW.patch). It was not applied in this recovery. Existing Vocab browser/Emulator PASS evidence remains in the prior follow-up report; it was **not rerun or counted as fresh QA** here because no Vocab/runtime/test source changed.

## Tested proposed diff

[MAIN-BASELINE-RECOVERY-ADMIN-PROPOSED.patch](MAIN-BASELINE-RECOVERY-ADMIN-PROPOSED.patch): `index.html`, **12 added / 10 removed lines**, limited to Admin form IDs/action dispatch and a guarded `adForm` helper. Teacher/tester endpoint names, payloads, role checks and error behavior are preserved. The patch passes `git apply --check` against the clean main worktree.

Unchanged `admin-actions.test.js`: **1/9 → 9/9**. Covers correct endpoints, required fields/password checks, wrong-tab refusal, Generate targeting, server errors without password exposure, existing Kick/password/remove routes. Full 23-command verification confirms no new failures. Browser/live-token verification of this new Admin patch is **NOT_TESTED**; this is a proposed source repair, not approval to ship account-management code.

## Safe implementation sequence / approval boundary

1. Review the small Admin diff for a future isolated implementation task; do not apply directly to main. Gate any release on normal integration/browser/auth checks.
2. Authorize a separate Reading recovery task: map shared validators/revision state first, then generation, review, import and preview patches with bounded tests. Recover functions deliberately, not an old whole index/API.
3. Authorize external/mixed Homework compatibility recovery, then the Assistant role/class adapter as a separate security review. Preserve all existing assignment data; no migration writes without a reviewed plan.
4. Keep cleanup separate and preview-only until synthetic protection/idempotence/audit checks pass. This audit authorizes no live purge or credentials use.
5. Preserve confirmed ordinary-student Coming Soon, Admin/roster-Tester preview. Future narrow Writing integration and focused-layout/test-fixture reconciliation require explicit scope; no gameplay/content edits. Keep exact content assertions and independent denial tests.
6. Real-token staging IAM/auth remains unverified. Writing editorial gates and all 102 Vocab pending reviews/publication remain separate human decisions. No manual retest is requested for anything automation can cover.

Stop boundary from the requested recovery document: **“stop before any main modification, PR, merge or deployment.”** Only audit documents, proposal diff and reproducible scripts are committed to feature. Detached worktrees/evidence are retained for inspection; the candidate intentionally has its one proposed index diff.

## Reproduce (fresh disposable directories only)

```powershell
git -c core.autocrlf=false worktree add --detach qa-artifacts/main-baseline-recovery/baseline origin/main
git -c core.autocrlf=false worktree add --detach qa-artifacts/main-baseline-recovery/candidate origin/main
git -c core.autocrlf=false worktree add --detach qa-artifacts/main-baseline-recovery/historical-parent origin/main^
node tools/main-baseline-recovery.cjs baseline
node tools/main-recovery-history.cjs
node tools/main-baseline-recovery.cjs propose-admin
node tools/main-baseline-recovery.cjs candidate-1
```

On this checkout these directories and logs already exist: inspect them instead of overwriting evidence. Scripts enforce detached latest-main candidates, the feature audit branch and a maximum of three candidate labels; reports record whether tests remain unchanged. No repository-wide reset/revert/merge operation is part of this workflow.
