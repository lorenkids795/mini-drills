# CODEX — Phase 2.9 follow-up: resolve integration candidate Writing policy mismatch (NO MERGE)

## Context
Repo `lorenkids795/mini-drills`; work ONLY `feature/vocab-lab`. Read `docs/VOCAB-INTEGRATION-READINESS.md` and `docs/VOCAB-INTEGRATION-QA.json` first, fetch latest `origin/main`, and confirm clean checkout. Prior latest-main disposable candidate had zero Git text conflicts but browser test failed: ordinary student Writing was enabled on main while the Vocab regression expected "Coming Soon".

## Teacher policy (confirmed)
- Ordinary students: Writing shown as **Coming Soon**, not accessible.
- Admin/Tester: Writing test access remains enabled.
- Preserve existing Writing module content and all unrelated current-main changes. Do not copy old feature Writing implementation wholesale onto main.

## Task
1. Investigate true runtime policy in latest main, including role/tester/account gates, direct-route and click access, student normal vs authorized tester, and whether a source gate was intentionally changed. Distinguish stale test from actual policy violation; preserve teacher policy. If main has newer intentional behavior not accounted for, document the minimal exact adjustment and flag for teacher review—do not silently overwrite Writing.
2. Prepare a **disposable integration candidate** only (ignored test directory, no main or production edits) that composes the latest main's Writing assets unmodified with minimal Vocab Library hooks and a narrowly scoped policy gate where needed. If a Writing source edit would be required for final integration, produce the proposed diff separately and label `TEACHER_REVIEW`; do not commit a wholesale Writing rewrite.
3. Run candidate browser checks including ordinary student Coming Soon, tester/admin access, direct URL/access-control, Reading, Homework, Admin, roles, Vocab Check 20/12, Reality Check, Mission, Teacher Review, reload/two-tab, light/dark/mobile. Run all main-only test scripts in addition to feature QA Runner. If an unimplemented adapter prevents a full security claim, mark NOT_TESTED/BLOCKED.
4. Re-run Firebase Emulator Auth/Firestore security tests with synthetic identities and isolated loopback-only environment. Preserve source isolation and never use real credentials or production data.
5. Keep signed Firebase-token/current-account adapter, deployed staging IAM/security, review of all 102 content items, and publication clearly blocked unless separately implemented/tested/approved. No automatic teacher approvals and no production writes.
6. Deliver `docs/VOCAB-INTEGRATION-CANDIDATE-FOLLOWUP.md` with exact current-main SHA, minimal diff, fail/pass/untested results, before/after test evidence, policy decision points, and safe future integration steps. Commit/push only `feature/vocab-lab` with `[CF-Pages-Skip]` prefix. Never merge main, deploy Cloudflare/Firebase, or apply edits to main.

## QA discipline
Do not weaken or delete access-control assertions to force PASS. If candidate still fails, stop after at most three bounded fix/test iterations and report root cause. GitHub push does NOT auto-update Cloudflare Direct Upload.
