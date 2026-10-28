# CODEX — Mini Drills Vocab Lab Phase 1.1: UI/UX Polish + Cleanup + Reality Check QA

## Scope / safety
Repository: lorenkids795/mini-drills. Work ONLY on branch `feature/vocab-lab`; verify actual git checkout first. Do not edit nested `mini-drills/`, do not merge to `main`, deploy, touch production Firebase/Cloudflare or modify unrelated Writing/Reading/auth/flashcards. Claude works on Writing concurrently. Favor isolated `vocab-lab.js`, `vocab-lab.css`, `vocab-lab-preview.html`, related practice data/tests. Keep existing Firestore model/rules unless fixing a proven defect; document any necessary change.

## Existing functionality that MUST remain
- Approved Cambridge 17 Test 1 Reading P1: 102 items, 69 Core / 20 Supporting / 13 Advanced; exclude Royal Commission, keep slum Supporting. P2 (100) is pending, not student-visible.
- 12 words per batch, one at a time, Know It / Not Sure / New to Me, undo including keyboard shortcut, autosave/resume, separate accounts, privacy-aware save status.
- Reality Check samples 3 of self-reported Known (or fewer), may expand to 5 for high error rate; zero Known skips. First error gets answer-neutral hint, no answer reveal. Correct first try without hint verifies only current task; hint, retry, reveal => needs practice, NEVER Mastered. Preserve contextual evidence.
- Admin/tester preview only; students see Writing Coming Soon; tester Writing access remains unchanged. Keep keyboard and screen-reader support.
- No AI-generated images. Pinterest is an inspiration source only; use original CSS/SVG or assets with verified licenses.

## Rebuild Word Sorting UI as a clean compact mini-game
Current teacher screenshots show huge empty dashed word frame, three stacked oversized buttons, source ID/priority exposed, sidebar `This batch` taking extra screen space, distant Undo, excessive scrolling. Replace with centered compact word card, nearby 3 selection tiles (side-by-side on desktop, legible responsive treatment at 390px), short header and single progress indicator. Keep definition hidden. Remove raw IDs and priority from learner UI. Put Undo adjacent to game actions. Add subtle 150–250ms transition and clear selected-feedback, with reduced-motion support and no double submits. Preserve focus/accessibility, 44px min touch targets.

## Teacher request: DELETE redundant items, don't merely shrink them
Remove/consolidate on all student-facing steps:
- Repeated `Vocab Lab · Preview`, redundant giant titles and full Cambridge identifiers.
- Raw `supporting · C17-T1-R1-014`, revision/technical statuses and verbose Firebase terminology.
- Repeated `Saved on this device only / Sandbox — no Firebase writes / Device-only sandbox` inside activity; leave ONE brief truthful sandbox notice in separate preview utilities and unobtrusive save/error indicator when needed.
- Duplicate overall and per-batch progress bars; retain one clear compact progress area.
- Entire redundant `This batch` sidebar/card under Sorting, Batch Ready, Reality Check and Results; incorporate three small chips when useful.
- Long descriptions of 3→5 algorithm, `Unsampled Know It (subset)`, `word-family forms have no independent evidence yet`, `Personalized Missions and puzzles are planned`, QA copy, empty decorative containers and competing primary actions.
Do NOT remove Undo, current word, three bins, accessible hint/reveal, next action, understandable results, revise classification or accurate sync/error feedback. Diagnostic QA landing page may remain separate, NOT embedded in learner screens. Include a Removed/Consolidated/Retained checklist in report.

## Batch Ready & Results
Batch Ready must be one short transition with 3 bins counts and prominent Start Reality Check (or skip transparently for no Known), optional Undo. Results should be celebratory but restrained, not an admin dashboard: Batch Complete, progress e.g. 24/102, 3 sorting totals, concise verified/needs-practice/self-reported breakdown, one primary Continue Next Batch. Keep `Revise a classification` under collapsed secondary control. Never imply single check = mastery or show inert Mission/Puzzle buttons.

## Reality Check & educational copy
Compact focused card containing one contextual sentence, one question, 3 legible options, `Check 1 of 3`, and contextual feedback directly below. Wrong first choice marked, other options selectable, show nonrevealing clue near choices without scroll. Reveal is quiet secondary help; it leads to needs practice, not verified. After correct answer, explain meaning / grammar / collocation rather than merely repeat correct option; make language simple and positive.
Editorially inspect ALL 102 tasks: natural English, passage-aligned target sense, one defensible correct option, plausible (not absurd) distractors, hint not giving answer, explanations pedagogically helpful. Keep change log and flag ambiguous entries for teacher approval. Teacher examples: `overcrowded` hint is appropriate; `succeed` explanation currently merely repeats `It hoped to achieve its goal`, improve it and pronoun consistency.

## Visual/responsive standards
Use existing Mini Drills design tokens and typography, polished light/dark, SVG/CSS only or licensed assets. No generic admin-like tables in learner gameplay; avoid visual clutter. Test viewport widths 390px, 768px, 1280px, mobile fold and touch targets, no horizontal scroll, focus after transition, aria-live and reduced motion. The floating `Work with Codex` input shown in teacher screenshots is Codex preview overlay, not part of app; do not attempt to fix it.

## Verify and report
Run existing and Vocab Lab tests; test browser flows, wrong-answer/retry, responsive/dark, Undo, batch resume and persistence. Be explicit that mocked Firestore tests aren't real Firebase tests. Produce desktop + 390px screenshots for Sorting, Ready, Reality Check before/after first error, Results, both light/dark when possible. List files changed, editorial QA changelog, what was removed/consolidated/retained, test outcomes and limitations. Do not automatically commit/push unless the teacher asks; NEVER merge or deploy.

## Acceptance
One word, three choices, compact card and minimal scrolling; first wrong answer doesn't reveal answer; no repeated irrelevant UI; accurate progress and honest verification; all Phase 1 functionality preserved; no unlicensed/AI art.
