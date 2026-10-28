# Checkpoint B — Phase 2 Personalized Mission prototype

Instruction: `CODEX-PHASE-1.1-FINAL-AND-PHASE-2.md`, branch `feature/vocab-lab`.
Checkpoint A was completed, tested, reported and committed/pushed separately as `558ec7583a346c3a252253611976bbe30aeee8c6` before B implementation began.

## Implemented

- Two coherent scenarios use one modular ES5 engine. **Save the Coast** is an independent authored demo with pose a threat / conduct research / substantial / reluctant / inevitable. These are not claimed to come from P1 and are not inserted into its bank.
- **Town on the Move** resolves five actual approved P1 sense IDs from the existing bank: congested, expansion, network, result in, passenger. Its prose and exercises are newly authored; they are not a Cambridge passage.
- Linked eligibility uses the saved lesson and stable sense IDs. Only classified target senses are included. A smaller eligible subset produces a smaller mission; zero eligible terms gives a truthful message and Continue Sorting. No requirement to complete all 102.
- New → supported Discover; unsure / failed check → Strengthen; provisional Know It → a light contextual check. Verified senses silently bypass basic tasks. They may remain in the shared story and debrief; there is no Previously Verified interstitial or Mastered claim.
- Briefing → one cumulative Case File paragraph → Investigate → varied Decode Evidence → integrated Word Morph → Final Report → Debrief.
- Each report activation reveals exactly one next sentence while retaining prior text nodes; Show full report is optional. After the full paragraph, the same report action opens the investigation. No separate Finish Reading button or numbered sentence cards.
- Decode supports collocations, token-based sentence reconstruction and paraphrase. Selection is personalized, so very small/verified subsets can omit task types rather than add filler.
- Word Morph has Discover, Transform and Independent Recall rounds. The coastal fixture has nine base tasks alternating reluctant / reluctance / reluctantly. The P1 fixture uses congested / congestion / expansion where eligible. Each form has its own evidence key; form evidence does not upgrade sense meaning. Previously independent forms can be omitted by the planner. Weak forms receive at most one additional authored context each, capped at three; later independent recall skips an unnecessary queued repetition.
- Final Report uses at most two fresh free-recall contexts. No word bank, displayed source answer or target label is rendered there. First wrong answers get a neutral clue; retry/hint/reveal is assisted, never independent.
- Debrief separates Ready for Review and Needs Practice for meanings and forms, with local next-review signals. No mastery, XP, reward or puzzle pieces are granted.
- Versioned session snapshots pin content across reload. Sentence position, reconstruction tokens, typed answer drafts, attempts and form evidence resume per identity/mission/input profile. Replay resets only that mission namespace. Continue Sorting works throughout and preserves the mission.

## Real app integration and exact shared hunks

Root `index.html`: only one scoped mission stylesheet and three external script includes (four added lines). No app logic or Writing code is rewritten.

`vocab-lab.js`: an active Start a local mission action on the batch results screen plus a handler passing a **copy** of the current Check progress and bank to the mission. The return callback continues the next sorting batch. `vocab-lab.css` adds only spacing for that action. The standalone Check page loads the same modules.

The action requires localhost, `demo:true` and an admin/tester demo user. It is absent in real/Firebase mode even for an admin. Normal students remain blocked by the existing Vocab Lab gate. In-app integration is real UI/controller integration using demo data; it is not a production-enabled mission or Firebase integration.

## Persistence/security boundary

No Firebase SDK or API is loaded by the mission preview. No Firestore rules, collections, cloud variables, authentication, flashcards, XP, Writing/LM, P1/P2 bank or nested source files are changed. P2 remains pending/non-visible.

Local key: `md-vocab-mission:v1:{encoded identity}:{missionId}:{authored|fixture|check}`. Existing Check keys are read only. The extra input-profile suffix prevents labelled QA fixtures from being confused with the learner's Check-derived mission. Source email and lesson must match. The local preview is a demo identity boundary, not server authentication.

Session schema implemented locally:

| Field | Purpose |
| --- | --- |
| schemaVersion, missionId, contentVersion, identity, runId | Namespacing and content/attempt identity |
| snapshot | Original mission content pinned for this run |
| sourceLessonId, sourceRevision | Linked source provenance (null lesson for authored demo) |
| plan.eligible, plan.routes, plan.story, plan.tasks | Selected senses, supported/bypass routes, original story and task instances |
| phase, index, revealed | Chapter and cumulative paragraph resume |
| records[taskId] | Tries, hints, completion, draft text/tokens, correctness and independent/assisted outcome |
| attempts[] | Versioned task IDs, sense/form, round, submitted answer, assistance and timestamp |
| forms[senseId::form] | Separate form evidence; no family-wide mastery field |
| adaptive | Bounded extra-practice selection |

Future server integration should separate session snapshots, append-only task attempts, per-form evidence and next-review signals, bind them to authenticated UID, and enforce content version/revision leases with dedicated rule/emulator tests. This is a design only: no future collections or rules are deployed here. Local mission sessions currently do not provide multi-tab conflict resolution or cross-device synchronization. Existing Phase 1 Firestore behavior is untouched.

## QA

- 12 pure mission tests: provenance, source eligibility, status routing/bypass, cumulative reveal, assistance, varied tasks, form evidence, adaptive caps, full runs, version/identity resume, idempotency, no source mutation and draft persistence.
- 56 screenshot cases: two scenarios × seven chapters × desktop/390px × light/dark. Browser checks cover no overflow, 44px controls, sampled text contrast >=4.5:1, live status, one paragraph, no Final Report bank/answer and no Firebase SDK.
- Full authored journey with keyboard Case File, five exact reveals, reload, separate accounts and Replay.
- Linked wrong-answer/reload/retry stays assisted; verified basics skip.
- Typed drafts resume; Continue Sorting works.
- Real root-app demo: complete a 12-word batch → open linked mission → read case; Check state remains unchanged until the learner explicitly chooses Continue Sorting. Real-mode/anonymous mission gating and no production API requests are checked.
- Phase 1/1.1, A highlight and existing Writing/Reading/auth/admin tests rerun before commit. Browser Firestore tests remain doubles/static checks, not real Firebase tests. Screen-reader semantics/focus are automated; a real NVDA/VoiceOver session remains a manual check.

## Preview

Serve the root checkout on localhost (for example `python -m http.server 8765 --bind 127.0.0.1`).

- `vocab-lab-preview.html`: finish a 12-word batch, then Start a local mission. This consumes your actual browser-local Check classifications.
- `vocab-mission-preview.html`: P1-linked mission from Tester A/B's existing Check progress; no progress produces the honest empty state.
- `vocab-mission-preview.html?profile=qa`: explicitly labelled, in-memory P1 QA profile. Does not seed or modify Vocab Check.
- `vocab-mission-preview.html?mission=authored-save-the-coast`: independent coastal demo.

Use the prepared localhost wrapper's `/app/` route to test full-app demo integration safely. Do not use root index with production Firebase settings for write testing. The wrapper overrides demo config in responses only and blocks live APIs.

## Implemented versus deferred

This is a tested end-to-end **prototype vertical slice**, not a complete mission library for all 102 terms. Both authored/linked scenarios and all gameplay chapters above work. Additional scenarios for the other P1 words, teacher editorial sign-off, server persistence/auth/rule integration, multi-tab conflict handling, cross-device reviews and real assistive-technology testing remain pending. Missions are local/admin/tester preview only. Vocab Rescue, Puzzle Collection, pieces, XP and production rollout are future scope and are not implemented or promised as rewards.

Original SVG/CSS coast/town imagery uses no external artwork, image-generation service, Pinterest image or new font artifact. No merge, PR merge, production change or deployment is part of either checkpoint.
