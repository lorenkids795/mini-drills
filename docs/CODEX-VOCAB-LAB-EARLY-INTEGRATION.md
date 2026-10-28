# CODEX TASK — Integrate Vocab Lab into Mini Drills (tester-only preview-first)

## Goal
Teacher approved **early integration** to avoid polishing separate sandbox and live app twice. Integrate Vocab Check + Personalized Mission into the REAL Mini Drills navigation/design for admin/tester preview, preserving unfinished Writing and regular students' experience. Do NOT deploy to production or merge to main without a separate explicit approval after QA.

## Branch/workflow
Repository `lorenkids795/mini-drills`; continue `feature/vocab-lab` only. First finish and test `docs/CODEX-PHASE-2-UX-PEDAGOGY-REFINEMENT.md`. Inspect origin/main latest and outstanding Claude Writing edits before reconciliation. NEVER blindly overwrite `index.html` / shared CSS / other Claude files. Preserve root source, do not edit nested `mini-drills/`. Prepare a scoped integration patch and report conflicts. No production Firebase writes, Cloudflare deploy, main merge or GitHub PR merge without confirmation.

## UI/UX: integrate early
- Use **actual Mini Drills app shell**, menu, header, fonts, spacing, theme and responsive breakpoints. The separate localhost vocab-mission-preview remains a development QA tool, NOT the sole student-facing design target.
- Show **Vocab Lab** navigation to admin/tester only while gated; for ordinary students either hide the nav or show one disabled `Coming Soon` state, consistently with product decision. Ordinary students must not access mission content by direct route, not just hidden buttons. Existing ordinary-student Writing remains Coming Soon and tester Writing available as previously specified.
- Vocab Check and linked Mission should use a unified route/section and smooth return to Word Sorting, preserving progress. Admin/tester preview must be clearly marked preview, without repeated technical labels cluttering exercises. One primary action per screen.
- Match already approved Vocab Check UI; Phase 2 should inherit styles. Do not reconstruct two copies of the design. Make responsive at 390px/768px/1280px, light/dark, focus, keyboard, reduced motion.

## Protect learning state
- Existing Vocab Check may use Firestore; current Phase 2 is **localhost-only localStorage prototype** and cannot simply be enabled on deployed production. Do not bypass localhost guard or silently fake account saves. For online tester access, propose and implement (in separate isolated test/staging config) secure Firebase-authenticated UID-bound storage with reviewed security rules and Emulator/test-project checks, or offer a genuine Cloudflare preview with feature gated while clearly labelling that Mission save/sync remains unavailable. DO NOT add insecure client-side tester flags as sole authorization for privileged data access.
- No user/tester data leakage, no mixing lesson contexts, don't overwrite existing Check classifications, lesson bank, XP, flashcards or Writing. Plan version migration and tab/device conflict handling. No experimental mission progress in production Firebase without approval.
- Approved Cambridge P1 bank remains 102 entries. Save the Coast is authored independent demo and Town on the Move draws approved P1 senses. P2 stays pending.

## Deploy topology audit FIRST
Investigate actual Cloudflare Pages config from available repo files, CI config and user-accessible project deployment settings. Identify production branch, preview branch deployment behavior, Pages build output root, Functions behavior and env differences. If dashboard access not available, state unverified facts and exact teacher steps; do not guess that push == deploy.
If an online Cloudflare Preview deployment can be made without exposing sensitive content or production services, prepare a safe preview plan and link after teacher approval. Do not silently configure deploy secrets/branches.

## QA gates before teacher considers production
1. Phase 2 refinement completed: no displayed definition before contextual inference; specific feedback; story-driven Decode; Word Morph rounds; Final Report independent free recall.
2. Integration on current latest main UI without clobbering Claude Writing.
3. Tester/admin authorization (direct route included), ordinary student blocked; no public content exposure through public static JSON or scripts when content must be secret (UI gating is not a security boundary).
4. Authentication + Firestore rules with emulator/test project BEFORE online progress persistence; no localStorage-only behavior misleading as cross-device.
5. Browser QA: logged-in admin/tester/student, local and mobile; 390px/768px/1280px light/dark; sorting→mission→sorting; reload/resume; account separation; failure states; no production API writes from sandbox.
6. Regression: existing Writing, Reading, auth, admin, Vocab Check and mission tests.
7. Document what is truly tested, blockers, screenshots, safe rollback plan, and exact user click steps for Cloudflare preview/prod only AFTER approval.

## Hand-off
Produce `docs/VOCAB-LAB-EARLY-INTEGRATION-QA.md` with changed files, branch/SHA, main-diff conflicts, security/storage state, launch readiness, preview-vs-prod mapping and testing evidence. Commit/push integration work only on feature/vocab-lab after checks. STOP before main merge or deployment; await explicit teacher decision.
