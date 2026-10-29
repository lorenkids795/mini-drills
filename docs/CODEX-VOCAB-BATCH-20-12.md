# CODEX — Vocab Check batch sizes: Standard 20 / Quick 12 (teacher's latest decision)

## Decision (overrides earlier 6/12 proposal)
Default **Standard Check = 20 words** per batch. Optional **Quick Check = 12 words** for shorter sessions. Do NOT implement a 6-word mode. Applies to Vocabulary under Library > Learning Materials in the real app integration and the standalone UI-only Cloudflare Preview.

## UX
- Compact choice before starting a NEW batch: `Standard · 20 words` (default) / `Quick · 12 words`. If an existing batch is in progress, show its fixed size and permit preference changes only for NEXT batch; never shuffle/resize mid-batch.
- Prominent progress `Word X of 20` or `Word X of 12` and a batch-only progress bar. Show overall lesson progress (up to 102) subtly or in details; don't lead with intimidating `0 / 102`.
- After sorting a batch, keep Reality Check and enable Finish for now / Continue next batch / Start eligible Personalized Mission. No need to sort all 102 first.
- Preserve Undo, pause/resume, learner classification, first-try verified vs assisted and hints, keyboard and screen-reader support.
- Reality Check uses existing 3–5 sampling rule, capped by number of Known words in that batch. Zero Known gracefully skips; with fewer than three Known, never fabricate samples.

## Core correctness and backward compatibility
- Audit `vocab-lab-core.js`, `vocab-lab.js`, storage, tests for hard-coded 12 and progress math. Build an explicit per-batch size or end cursor, preserving exact sorted sense IDs and original bank order. Last batch may contain fewer than preference size.
- Existing in-progress saved v1 batches of 12 must remain EXACTLY 12 when resumed; don't silently expand them to 20. Historical result/undo/question snapshots remain valid. New sessions use Standard 20 unless learner selects Quick 12. Store per-user preference without cross-identity leakage, optionally version state safely if needed.
- Switching choice is allowed only between batches; never duplicate or skip lesson terms. Correct boundaries 102 items e.g. 5x20+2 and mixed 12/20.
- Do not change approved P1 vocabulary, pending P2, authored mission fixtures or teaching statuses. Ensure Mission eligibility still depends on actual classified senses.
- UI-only static artifact must retain exact network-zero safety restrictions, allowlist, no Firebase/API production calls or live auth. Working app remains admin/tester gated, under Library. Save the Coast remains developer QA only.

## QA and handoff
- Automated tests for 12/20, mixed sizes, final partial, same-account reload, A/B separation, Undo and review, no Known and fewer than 3 Known, 3–5 sampling, existing v1 12-word resume, mission flow after either size.
- Responsive 390/768/1280 light/dark screenshots, focus/accessibility, no UI regressions; existing Writing tests unaffected.
- Commit/push to `feature/vocab-lab` only (use [CF-Pages-Skip]); do not merge main or deploy either Cloudflare project.
- Produce fresh audited versioned static ZIP after tests; Cloudflare Direct Upload preview does NOT auto-update from GitHub.
