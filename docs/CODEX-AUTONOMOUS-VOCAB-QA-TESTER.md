# CODEX — Autonomous Vocab Lab QA Tester (teacher only reviews release candidate)

## Teacher intent
Teacher does NOT want to manually repeat Vocab Check/Mission flows after every code change. Create a **repeatable automated QA agent/workflow** that tests, reports, fixes reproducible bugs and reruns tests in a bounded loop. No claim that tests guarantee perfect UX or curriculum correctness. Human approval remains mandatory before production release.

## Branch and safety
Repo lorenkids795/mini-drills, work ONLY feature/vocab-lab. Never merge to main, deploy to myhomeworkmyfuture, alter Firebase production, Cloudflare projects or student data without explicit approval. Use test fixtures, localhost, and isolated UI-only dist. Don't rely on a fake privileged tester account as an authorization bypass. Keep Writing untouched. No real credentials, secrets or real student accounts in QA logs.

## Deliver a single QA command and protocol
- Provide `node tools/vocab-qa-runner.cjs` or equivalent simple documented one-command workflow, reproducible from repo root with needed dependencies described. Use existing Node/Playwright browser tests and add coverage where missing; fail loudly when browser is not installed.
- Every run builds/verifies the exact static allowlisted artifact, verifies no production Firebase/API/network requests, runs Vocab + 244 core regression tests, Writing protection/scope check, and browser E2E at 390, 768, 1280 widths / light and dark; no external production network needed.
- Test Vocab Check Standard 20 and Quick 12 (new batch + existing 12 resume), all 102 approved item boundaries and last partial batch, undo, autosave/reload, A/B identity isolation, reality check first wrong retry + no double counting, hints, reveals, results and pause.
- Test actual eligible Check→Mission flow (and no eligible mission), Case File cumulative sentence reveals, Investigate no premature definition, personalized skip rules, Decode Evidence varied challenges, Word Morph 3 rounds/per-form evidence, Final Report typed free recall and resume, Debrief, return to Sorting. Keep Save the Coast as INTERNAL QA fixture only, never learner UI.
- Verify Library > Learning Materials navigation, no top-level Vocab nav, normal student Coming Soon, admin/tester visibility in mocked full shell, main/Writing compatibility.
- Accessibility smoke checks: keyboard, focus, aria live, reduced motion, contrast/disabled button, zero overflow. Visual snapshots or screenshots with explicit stable baselines to flag unintended changes; do not blindly accept screenshot updates. Distinguish browser automation from teacher aesthetic approval.
- Include strict asset manifest, CSP, network guard, no Firebase/API, no external URLs or accidental production writes, account data segregation.

## Autonomous loop bounds
- Run QA and collect failures; group by root cause, reproduce one issue, implement minimal scoped fix, rerun focused then full suite. Maximum 3 iterations per task; if unresolved, report blocker and STOP. Never invent passing results; no hiding/flaking/retrying failures until green.
- For editorial/IELTS content ambiguities, flag `TEACHER_REVIEW`, don't silently rewrite approved pedagogy or assume AI is authoritative.
- For missing coverage of full 102-word personalized mission generation, explicitly mark as NOT IMPLEMENTED, not PASS; differentiate prototype from release-ready.
- If CI GitHub Actions available safely, add PR/branch checks on feature/vocab-lab that produce artifacts (logs/screenshots) and fail on regressions, but never auto-merge/deploy. If CI is not available, document a manual Codex-run equivalent. Don't schedule recurring cloud compute without user's explicit setup/approval.

## Output
Create `docs/VOCAB-QA-STATUS.md` regenerated per run, with:
- timestamp, exact branch/SHA, command, environment
- test counts and failures, screenshots paths, changes made
- feature coverage matrix: PASS / FAIL / NOT_TESTED / NOT_IMPLEMENTED / TEACHER_REVIEW
- severity and reproductions, regressions and open issues
- release readiness: READY_FOR_TEACHER_REVIEW only if objective gates pass; otherwise BLOCKED.
Include a machine-readable JSON report and browser artifacts. A single concise teacher summary after run with only top blockers and recommendation. Do not state "fully complete" because a limited prototype passes tests.

## Stop/approval
Run tests now, fix reproducible bugs within feature branch, push after successful QA and report. Do not update Cloudflare Direct Upload automatically (ZIP requires explicit teacher action). Do not take any production release action. Human final review is limited to UX/screenshots and learning content plus staging auth/security, not 102 repetitive manual steps.
