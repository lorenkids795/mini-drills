# CODEX — Main Baseline Recovery: Isolated Repairs and QA

**Teacher approved scope:** prepare/test candidate repairs for Admin; Reading generation/review/import/preview; Homework external/mixed; Homework Assistant; Cleanup **dry-run only**; Writing Coming Soon plus focused lesson view.

**This is NOT authorization** to modify/push main, merge, deploy, connect production, perform real data writes/deletion, approve/publish lesson content, or create a PR. Work only in fresh detached disposable worktrees from freshly fetched origin/main; leave feature/vocab-lab runtime unchanged. Read docs/MAIN-BASELINE-RECOVERY-AUDIT.md, docs/MAIN-BASELINE-RECOVERY-DECISIONS.md, associated JSON ledger, Admin proposed patch and Writing proposed patch. If the teacher supplies the downloadable CODEX-MAIN-BASELINE-RECOVERY-IMPLEMENTATION.md, follow its additional detailed acceptance criteria.

## Procedure
1. Record main SHA, working trees/status. Create isolated detached candidate from latest main (git -c core.autocrlf=false). Preserve baseline logs and distinct snapshots. Never restore historical index/API wholesale or reset any checkout.
2. **Admin:** apply existing minimal Admin patch in candidate; test Add Teacher vs Create Tester unique IDs/handlers, role checks, error and password handling, browser/auth regression. Prior 1/9 → 9/9 must be revalidated against latest main.
3. **Reading:** recover missing aiReadingPart, rdRetry, rdImport, rdRvAct and dependencies with narrow patches. Preserve Medium-first → teacher approval → Easy/Hard derivation. Test token truncation, split requests, validation, preview, review/edit/accept/undo. Mock AI API only.
4. **Homework:** restore external-only, Library-only and mixed assignments, extSubsHTML/asgState, stable records and legacy compatibility. External links require valid HTTP(S); title source-derived. Explicit successful Submit required before Turned in.
5. **Homework Assistant:** restore hwaData and dashboard with server-validated assistant role and assigned-class restriction, no email/cross-class leakage. Test forged role, revocation, statuses, late passes. No real posts.
6. **Cleanup:** restore **read-only candidate preview** of orphan accounts using exact email matching and protected staff/tester/live-roster checks. NO deletion, purge, destructive API or real data mutation, even in the test candidate.
7. **Writing:** restore ordinary-student Coming Soon inaccessible, admin / roster-verified Tester preview, direct-route denial, focused lesson view and Back behavior. Use only narrow patch in disposable candidate, protect original Writing lessons. Keep Writing Unit 0/2 editorial pending. Don't accept spoofed U.tester. Reconcile old normal-student learner tests by using authorized tester fixtures while retaining assertion coverage; don't weaken access gates.
8. Run all 23 original main commands and relevant browser QA after each increment. Categorize preexisting failures vs candidate-induced issues, editorial release gate vs technical failure. Run feature Vocab smoke QA without changing it. Use synthetic identities, no production network/credentials or paid AI.
9. Cap at 3 bounded repairs/test runs per scope; preserve failure logs. If main advances rerun baseline/diff.

## Deliver
- docs/MAIN-BASELINE-RECOVERY-IMPLEMENTATION-REPORT.md
- docs/MAIN-BASELINE-RECOVERY-IMPLEMENTATION-ISSUES.json
- Minimal independent proposed patch files for each source repair, only applied inside disposable candidate; test matrices and rollback plan, exact source SHAs and unchanged main/feature proof.
- Commit/push documentation/tools/patch proposals **only** on feature/vocab-lab with [CF-Pages-Skip] if clean and no concurrent work. Do not commit application source changes, merge, PR, deploy, or modify real data. Stop for teacher authorization before any real-source changes.
