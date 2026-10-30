# Vocab Lab autonomous QA protocol

Run from repository root on `feature/vocab-lab`:

```powershell
node tools/vocab-qa-runner.cjs
```

This executes the full suite once, regenerates `docs/VOCAB-QA-STATUS.md` and `.json`, and retains immutable logs/screenshots/static-dist/network evidence under ignored `qa-artifacts/<session>/round-1-full/`. It never edits app code, merges, deploys, calls a model API, clears progress, or accesses real accounts. The coding agent uses the bounded repair protocol below when a test fails. No background scheduler is installed.

## Setup once

Use Node 22+ and Playwright **1.62.1**. The small private package in `tools/qa-runtime/` isolates QA dependencies from the app:

```powershell
npm install --prefix tools/qa-runtime --ignore-scripts
node tools/qa-runtime/node_modules/playwright/cli.js install chromium
```

Windows defaults to installed Microsoft Edge (`msedge`); to use the downloaded browser:

```powershell
$env:VOCAB_QA_BROWSER = 'chromium'
node tools/vocab-qa-runner.cjs
```

Linux/macOS default to Playwright Chromium. Install its official OS dependencies during environment setup if needed; QA never downloads/installs anything automatically. The runner resolves the private runtime or an existing pinned installation (`NODE_PATH` is supported), then passes the resolved modules directory to every child process. Missing/wrong Playwright or browser produces a failed preflight and NOT_TESTED browser gates; it cannot quietly skip to READY. Each browser suite has an 8-minute timeout; other commands have 2 minutes. There are no automatic failure retries.

## Status and exit codes

- Exit 0: `READY_FOR_TEACHER_REVIEW`, all mandatory objective gates passed. This is never production approval.
- Exit 1: test, safety, dependency or runner failure. Read grouped severity/reproductions and the original log.
- Exit 2: tests can PASS but release readiness is `BLOCKED` by incomplete mandatory coverage.

Current full-102 personalized mission generation is explicitly `NOT_IMPLEMENTED` and mandatory for complete Vocab Lab readiness. Three curated candidate packs (15 target senses, 5 additional context senses) are not a substitute. They require explicit admin/tester editorial QA; no candidate is human-approved or published. Editorial validity is a mandatory `TEACHER_REVIEW` blocker; visual aesthetics remain `TEACHER_REVIEW`; staging auth/security is also human review, not proven by mocks. Latest-main reconciliation is `NOT_TESTED` because QA stays offline and never fetches/merges main. Preserve these distinctions in the teacher summary. Do not create an engine or rewrite approved curriculum just to turn the report green.

## Bounded coding-agent repair loop

1. Keep the same session ID throughout one task (the first report prints it). Read branch, exact SHA/working-source fingerprint, failed commands and artifact logs. Group related failures by root cause. Inspect stored **fixture** attempts for state issues; never infer the teacher clicked twice or clear actual progress.
2. Reproduce one failure in isolation. Identify whether it is a reproducible app defect, QA harness defect, environment blocker or `TEACHER_REVIEW` editorial ambiguity. Implement only a minimal authorized Vocab/QA fix. Writing/backend/auth/data changes outside task scope remain blocked. Do not weaken guards/assertions or accept new screenshots because a test failed.
3. Save repair evidence as JSON in the session artifacts, e.g. `changes-round-2.json`:

```json
[{"rootCause":"specific cause","files":["vocab-lab.js"],"reproduction":"specific failing command/case and expected behavior"}]
```

4. Run focused then full for the next round, with the same evidence:

```powershell
node tools/vocab-qa-runner.cjs --session TASK_ID --round 2 --focused --suite reality --changes-file qa-artifacts/TASK_ID/changes-round-2.json
node tools/vocab-qa-runner.cjs --session TASK_ID --round 2 --changes-file qa-artifacts/TASK_ID/changes-round-2.json
```

Focused suite names: `unit`, `reality`, `batch`, `isolation`, `visual`, `check`, `accessibility`, `mission`, `shell`. Focused runs always BLOCKED, regardless of selected suite results. Existing run directories cannot be reused. A later round requires a previous full round and repair evidence. **Maximum three rounds per task**. Round 4 is rejected. After unresolved round 3, report blockers and stop; never start a new session to erase failures or retry a flake until green. An independently requested later QA task can use a new session.

5. Regenerate a concise teacher summary from the final JSON: QA PASS/FAIL, readiness, top blockers and recommendation. Commit/push reviewed Vocab/QA changes and status reports with `[CF-Pages-Skip]` only after successful regression QA. If tests pass but the known 102-mission gap blocks readiness, report that limitation clearly; do not disguise it as an app regression.

## Safety and evidence

- Exact 21-file static allowlist and manifest are built, copied to the immutable run and verified again at the end. No config/backend/Functions/Firebase code or external URLs may enter it. Direct Upload is not updated automatically, and no ZIP is uploaded by QA.
- Browser transport preload wraps both context-level and page-level route handlers in all nine browser suites (including curated engine), with local GET-only transport, mocked `.example.invalid` origins fulfilled locally, service workers blocked, and WebSocket detection. Any production/API attempt or external transport makes the command fail. Full-app Google font references are aborted; fonts use local fallback. The isolated static runtime's own guard/CSP is independently tested, including cookies and redirect rejection.
- Admin/tester full-shell users, UID auth/storage and rules expectations are mocks. Ordinary students/direct routes remain blocked; a fixture admin is never evidence of live authorization. No credentials, real students, or cloud database is used.
- Protected normalized hashes include the full app index/Writing, lesson content, approved banks/pending P2, store/rules/config and static guard/builder. Nested repository tree and uncommitted/untracked nested changes are checked.
- `tests/fixtures/vocab-qa-baselines.json` freezes style/markup sources and identifies the reviewed source SHA. Existing fidelity and accessibility suites assert explicit container/sidebar/type/icon metrics, 390/768/1280 light/dark, keyboard/focus/aria/reduced motion/contrast/overflow and stable first-wrong answer rectangles. PNGs are evidence for teacher review; automation cannot guarantee aesthetics or curriculum correctness.
- There is no `--update-snapshots` switch. For an authorized UI fix, inspect the before/after render and source diff, document why each baseline change is expected, preserve Writing/data scope, then review the baseline edit in Git. Never update a hash merely to silence a failure.

## CI / manual equivalent

This feature tree had no GitHub Actions workflows. Actions availability/permissions/billing have not been established through the available connector; no new cloud trigger or schedule is enabled. The local one-command Codex-run protocol is the complete manual equivalent. It can later be wired into approved branch/PR CI with the pinned runtime, Chromium, full checkout of `feature/vocab-lab`, and artifact upload even on failure; use read-only repository permissions, no production secrets, no deployment/auto-merge steps. Exit 2 must remain visible as an incomplete-readiness signal.

Before an eventual production release, teacher reviews UX/screenshots and learning content, staging validates auth/rules, and latest main/Writing changes are reconciled under explicit approval. Passing this workflow does not grant that approval.
