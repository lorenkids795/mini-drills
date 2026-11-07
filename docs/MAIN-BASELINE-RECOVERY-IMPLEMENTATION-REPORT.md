# Main Baseline Recovery — isolated implementation

QA: 2026-11-06; handoff: 2026-11-07 (Asia/Saigon). **Six approved scopes prepared; integration/release remains BLOCKED.** No application source was changed on feature or main. Only documents, QA tools and proposed patches are committed.

## Provenance and isolation

- Fresh `origin/main`: `5a0c18b3fa35c6ae0f284cc2e5e7c7e5355152ed`; feature before delivery: `9a6c095f271e5435f281d1d683d6f6a928434214`. Remote refs re-fetched and unchanged at final verification.
- Selective API reference: parent `a5a2a5aca435706c96fe78eaf5e9d7eecb1016af`. New main already restored substantial UI but removed matching APIs. Therefore the old whole UI patches were not replayed.
- Separate detached `baseline`, `candidate`, `replay` under `qa-artifacts/recovery-implementation/`. Baseline stays clean; candidate/replay deliberately retain proposed modifications. No main checkout changed.
- Only candidate `index.html` and `functions/api/[[path]].js` differ. Writing region byte-identical; lessons, data, Firebase rules/backend/config and all original tests unchanged. Vocab runtime and approved Vocabulary Bank unchanged.
- AST-scoped functions/dependencies, route additions and narrow UI edits; no historical whole-file restore. Patch replay onto a third clean main checkout reproduced candidate bytes exactly. Hashes, selected symbols and QA reports: [evidence directory](main-baseline-recovery-implementation/manifest.json).

## Six scopes

| Scope | Result | Prepared change and verification |
| --- | --- | --- |
| Admin | PASS | Main already has unique Teacher/Tester forms (9/9); restore missing tester, join, identity/staff routes and prohibit staff self-registration. Browser form/role checks pass. |
| Reading | PASS | Restore missing staged generation, schema/validation, retry/split/relay dependencies. Existing Medium → teacher review → Easy/Hard UI preserved. All six Reading scripts pass, including import, edit/review/undo and truncation; AI calls mocked. |
| Homework | PASS | Restore image endpoint; upload stages a pending screenshot. Explicit **Submit screenshot** and successful save required; rejected save cannot mark Turned in or award completion. Legacy/mixed/library assignments retained. Additional success/rejection/retry/account/class tests 3/3. |
| Assistant | PASS | Restore scoped server dashboard, assignments/notes and admin management. Original 13/13 covers roles, class boundaries, no email leakage, revocation, statuses and late passes. Additional real cryptographic verification uses locally signed synthetic JWTs only. |
| Cleanup preview | PASS within approved scope | Restore exact-email preview; protect roster, testers, staff, admin and assistants. Reject all non-preview operations; remove delete UI and demo deletion path. Original purge expectations deliberately remain FAIL. |
| Writing | PASS, no source patch needed | Latest main already enforces ordinary-student Coming Soon, roster Tester/Admin preview, direct-route denial and focused lesson/back. All original Writing tests pass unchanged; browser also spoofs U.tester and published state to verify denial. Unit 0/2 editorial pending preserved. |

## Automated results

Every increment runs **28 commands**: all original 23 plus five tests added on latest main. No assertions removed or weakened.

| Snapshot | Commands PASS | Assertions PASS |
| --- | --- | --- |
| Latest-main baseline | 13/28 | 402/436 |
| Admin | 16/28 | 406/436 |
| Reading final | 21/28 | 415/436 |
| Homework final | 22/28 | 416/436 |
| Assistant | 25/28 | 425/436 |
| Cleanup final | 25/28 | 426/436 |
| Writing/final candidate | **25/28** | **426/436** |

Additional tests **5/5 PASS** (three submission tests, signed-token authorization, read-only cleanup). Original-main browser smoke: six role/viewport/theme scenarios after every group; final successful run `browser-writing-2` covers 390px dark and 1280px light, Admin forms, Reading rendering, Writing access/focus/back and Cleanup preview. Detailed Homework and Assistant actions are covered in VM/API tests, not claimed as full browser end-to-end Firebase tests. No live auth/IAM/storage or AI provider was contacted.

Preserved repair history: Reading preparation initially missed class declarations; first QA ran the unchanged Admin candidate, second exposed relay helper placement, third passed. Homework first run caught a generic Submit label; second fixed it. Cleanup second run removes the pre-existing demo deletion branch. Final browser first attempt raced demo API/re-render (100ms wait versus 250ms API); second uses settling time with unchanged assertions. No scope exceeds three QA attempts.

### Remaining original-main FAILs

1. `data-cleanup.test.js`: **13/15**. Two assertions require actual purge/delete UI, explicitly forbidden in this task. Preview and protected-user refusal pass. This is a deliberate candidate policy difference, not an unreported green suite.
2. `server-purge.test.js`: **0/8**. Missing purgeStudent/adminClassDel and destructive route intentionally not restored. Blocked by scope.
3. `lm-check.js --release`: **FAIL / editorial BLOCKED**. Latest main has 206 Unit 0 and 226 Unit 2 pending items; these supersede old audit counts. Content validation/access tests pass, but no review status is changed.

### Feature Vocab smoke

- QA Runner focused unit: **129/130 PASS**, overall **FAIL**. Failure is the existing `vocab-integration.test.js` latest-main candidate assertion: generated candidate lacks `function vocabMaterialsHTML`. The Phase 2.9 builder replaces a broad Learning Materials region with latest-main text, removing Vocab hooks. Runtime Vocab itself remains unchanged. This is a reproducible integration-tool issue requiring a separate scoped repair, not a reason to weaken the assertion.
- QA Runner focused batch browser: **PASS**, including 24 app/static × size20/12 × viewport390/768/1280 × light/dark captures, undo/reload/preferences, real classifications → Mission → Library → resume, legacy12 and account isolation. Focused QA cannot declare release readiness.
- An attempted `round 2` focused run was correctly rejected because the runner requires a previous full round. No tests ran there; its report is retained. Browser smoke then used the correct first-focused-run invocation in the same session.
- Current `VOCAB-QA-STATUS` shows the latest focused batch only; it does **not** supersede the unit failure retained here and in the JSON ledger.

## Patch delivery and rollback

Separate patch proposals: [Admin](main-baseline-recovery-implementation/admin.patch), [Reading](main-baseline-recovery-implementation/reading.patch), [Homework](main-baseline-recovery-implementation/homework.patch), [Assistant](main-baseline-recovery-implementation/assistant.patch), [Cleanup](main-baseline-recovery-implementation/cleanup.patch), [Writing no-op record](main-baseline-recovery-implementation/writing.patch).

They are independently reviewable **ordered increments**, not six interchangeable standalone patches against main: Admin → Reading → Homework → Assistant → Cleanup. Shared auth helpers originate in Admin; other groups depend on them. Writing file is a verification-only comment and must not be fed to git apply. Each snapshot has before/after hashes; replay verified the complete order. Apply only in a separately authorized checkout, checking each patch first. Reversal, if needed, is reverse order with `git apply -R --check` then `git apply -R`, only on unchanged candidate bytes. Prefer retaining evidence and creating a fresh disposable checkout; never reset an active checkout or restore an old whole file.

## Still requiring authorization or teacher decisions

1. Review these proposed patches before applying them to any real integration source branch. No PR/merge/deploy authorization was assumed.
2. Authorize a separate narrow repair of the Phase 2.9 integration builder to preserve both latest-main Writing and Vocab Library hooks, then rerun its unchanged tests and integration browser QA.
3. Keep cleanup read-only. Any future deletion policy, scope and data recovery process requires explicit authorization; none was implemented here.
4. Teacher editorial review of Unit 0/2 and the 102 Vocab drafts remains pending. No auto Approve/Publish.
5. A future synthetic staging environment with actual auth/IAM/storage integration needs a separately approved configuration. Local crypto/mocked tests do not establish deployed staging security.

No manual retesting is requested for automated checks already covered. No production network, student data, merge, deploy or PR was used.
