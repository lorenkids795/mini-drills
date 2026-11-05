# Phase 2.9 — Writing integration follow-up

**Writing policy: PASS in disposable candidate. Overall integration: BLOCKED.** No main merge, deployment, production connection, content approval or publication. This phase changes QA tools/reference transformations only; checkout Writing/runtime/content files remain unchanged.

## Exact source and investigation

- Latest fetched and remote-verified main: `8d9cf7742a14f64db4d7e22f63a395ee68531113`.
- Feature base after fast-forwarding the supplied follow-up document: `463d860c556d9a14c5dd957726ad3a8a383d1bd5`.
- Main commit 8d9cf77 ("Add files via upload") removes the earlier `lmTester`, `lmSkillLocked`, focused lesson view and several unrelated Reading/Homework/Admin implementations while leaving newer tests. Its message does not establish a new intentional access policy. The explicit teacher instruction in this follow-up governs the candidate; no older Writing implementation was copied wholesale.
- On unmodified main, Writing's category is enabled for ordinary students. Unpublished lessons are admin-only; publishing a lesson bypasses that gate for students. Authorized roster testers do not get unpublished Writing access. This violates the confirmed policy, and main's own `tests/lm-access.test.js` expects the missing roster gate.
- The historical feature implementation trusts `U.tester` for Writing. The proposed candidate instead resolves the current user's email against a student roster row with `tester === true`. A user-object flag/display name cannot grant preview access. This is client-side UI policy, **not proof of server authorization**.

## Minimal proposal — TEACHER_REVIEW before actual integration

Exact proposed source diff: [VOCAB-WRITING-POLICY-TEACHER-REVIEW.patch](VOCAB-WRITING-POLICY-TEACHER-REVIEW.patch). The policy itself is already confirmed; this label applies to applying the source diff in a future integration checkout.

Only two source locations change in the disposable main index:

1. Replace `lmVisible` with a roster-based `lmTester`, a Writing-only `lmSkillLocked`, and a visibility guard shared by listing/opening. Ordinary students remain blocked even for a published fixture. Admin can preview; roster testers can preview Writing. Teacher behavior and other skills are preserved. Missing roster support fails closed.
2. Filter the Writing module list through the same guard. Existing disabled-category markup renders **Coming soon**. Existing click handlers and forced-state rendering already call `lmVisible`, so no parallel bypass is introduced.

`tools/vocab-integration-followup.cjs` first builds the existing dry-run Vocab candidate, restores latest-main Writing, then applies this exact narrow transform. It exports 53 root main files into ignored snapshots (excluding the divergent nested copy); all 52 non-index files are byte-identical between main and candidate, including all main tests, Writing lesson assets, API, Firebase rules and config. Only Vocab assets absent from main are added. Candidate SHA-256: `94c74b84c7b0a7d4395bec846be26ae4b9d22e3ab29fa778394e4ae18d98e545`. A changed source boundary aborts generation instead of guessing.

No whole Writing-region rewrite is proposed. No changes to the approved Vocabulary Bank, 102 draft versions, progress schema, Writing content, grading or production rules.

## Automated evidence

Machine-readable results, command lists, failure excerpts and log hashes: [VOCAB-INTEGRATION-CANDIDATE-FOLLOWUP-QA.json](VOCAB-INTEGRATION-CANDIDATE-FOLLOWUP-QA.json).

| Run | Result |
| --- | --- |
| Feature QA Runner, full round 1 | **PASS**: 130 Node tests, 244 core assertions, 10/10 browser suites, 443 screenshots, zero failed commands |
| Candidate Vocab browser regression | **PASS**: 6/6 suites — Reality Check, batch Standard 20/Quick 12, Mission, real app shell, curated engine, Teacher Review; includes reload, two-tab state, role gates, light/dark/mobile |
| Additional candidate browser policy/main smoke | **PASS**: 18 scenarios (3 roles × 3 widths × 2 themes); normal student Coming Soon, direct URL/action/forced state, published fixture, forged tester flag, tester revocation, Admin/Tester access, reload; existing Reading renderer, Homework card and Admin/Class navigation |
| Firebase Auth/Firestore Emulator | **PASS**: 11 security/integration tests + 2 browser tests; all 87 new routes persist evidence; source unchanged; demo project and loopback only |
| Unmodified main scripts | **FAIL**: 12/23 commands PASS, 11 FAIL; 246/350 counted assertions PASS |
| Candidate with identical main scripts | **FAIL**: 10/23 commands PASS, 13 FAIL; 249/350 counted assertions PASS |

The 23-command runs execute all 20 root main `*.test.js` scripts, both contrast scripts and the Writing `lm-check.js --release` gate. Assertion totals refer to scripts emitting the `x/y passed` counter; the three auxiliary commands are reported separately by exit status. No main test is deleted, rewritten, bypassed or given a test-specific role exception.

### Before/after and remaining failures

- Prior candidate failed the unchanged shell assertion at `tests/vocab-shell.browser.js:95` (student category enabled). The final candidate passes that entire suite, including tester access and remote-origin gating.
- Main `lm-access.test.js`: **0/9 → 8/9**. All access-policy assertions now pass. The remaining failure requires a focused lesson layout with no Home chrome, a behavior removed in latest main. Reintroducing that layout is outside this narrow gate proposal.
- Nine main test scripts already fail on pristine main: Admin actions, Create Reading UI, data cleanup, Homework Assistant, external Homework, mixed Homework, Reading generation, import and review. Examples: missing `adminOrphans`, `hwaData`, `asgState`, `extSubsHTML`, `aiReadingPart`, `rdImport`, `rdRetry`, `rdRvAct`; duplicate admin actions/input IDs. The candidate reproduces them. Repairing these unrelated source removals needs a separately scoped main-recovery change, not a broad rollback hidden in Vocab integration.
- Two additional command failures reflect conflicting legacy test assumptions: `lm-meta.test.js` is **21/22** because it requires “No units yet” for an ordinary student's Writing subtree; `lm-unit0.test.js` is **19/23** because four practice/progress flows force a normal student's unit to Published. Confirmed policy still denies that user. Do not grant ordinary access to satisfy these tests. Future test reconciliation must preserve their content/progress assertions while running practice as an explicitly authorized roster tester; it is not applied here.
- Writing release gate fails on both pristine main and candidate: Unit 2 has 152 pending items and Unit 0 has 165 pending items. This is retained editorial gating, not permission to approve them automatically.

### Bounded repair record

Main/candidate scripts ran two iterations. Iteration 1 exposed isolated Writing harnesses without `allRoster`; iteration 2 adds a `typeof` guard that fails closed, without changing assertions. The initial candidate export refused the excluded nested copy; export now skips that copy and retains traversal checks. Browser setup first attempted missing Chromium; explicit installed Edge was used. The forged-user browser fixture initially aliased the demo roster object; corrected it to clone the user so forging a flag cannot also modify the authoritative fixture. Original logs are retained. Final policy browser assertions and six Vocab candidate suites pass. No third iteration was needed; unrelated failures are reported, not retried until green.

## Reproduce locally

With the pinned QA runtime and installed Edge, from feature branch:

```powershell
node tools/vocab-integration-followup.cjs
node tools/vocab-main-qa.cjs 1
$env:NODE_PATH = (Resolve-Path tools/qa-runtime/node_modules).Path
$env:VOCAB_QA_BROWSER = 'msedge'
node --require ./tools/vocab-qa-preload.cjs tests/vocab-integration-policy.browser.js
node tools/vocab-candidate-browser-qa.cjs 1
node tools/vocab-qa-runner.cjs --session phase29-writing-followup --round 1
```

Existing immutable run directories are not reused; inspect saved results or follow the bounded round protocol. Emulator startup/QA commands remain in `staging/README.md`. Existing emulators were verified as `demo-mini-drills-vocab-test` on loopback before reuse. No production credentials were used. Final documentation was added after successful QA; implementation/test sources are unchanged.

## Safe next steps and human decisions

1. Keep integration blocked while main's source/test mismatch is repaired under a separate task. Reconcile focused lesson layout and legacy normal-student test fixtures explicitly; retain every learning/progress assertion. The confirmed ordinary-student Coming Soon policy does not need to be decided again.
2. In a future authorized integration checkout based on then-current main, review/apply the narrow policy diff with Vocab-only hooks, retain all main tests/assets, rerun the full baseline/candidate matrix. No merge has been performed here.
3. Signed Firebase-token/current-account adapter, deployed staging IAM and immediate server-side revocation remain **NOT_IMPLEMENTED / NOT_TESTED**. Emulator unsigned tokens and synthetic demo roles cannot certify these. No full real-auth security claim is made.
4. Teachers still review the 102 exact Vocab draft versions, confirm carriage's passage-specific scope, designate reviewers/tester cohort and separately authorize publication when technical gates pass. All 102 remain pending; zero actual approvals/publications. Full-102 published personalized missions remain unimplemented. Emulator fixture approvals are erased by teardown.

No user is asked to repeat automated QA manually. GitHub push does not update Cloudflare Direct Upload; no deployment is included.
