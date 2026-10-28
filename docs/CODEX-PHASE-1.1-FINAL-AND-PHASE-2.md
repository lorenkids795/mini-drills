# CODEX TASK — Phase 1.1 Final + Phase 2 Personalized Mission (Mini Drills Vocab Lab)

Repository: `lorenkids795/mini-drills`
Branch ONLY: `feature/vocab-lab`. Verify via git. Never merge/deploy/change `main`. Claude concurrently edits Writing; do not modify Writing/LM/auth unrelated files or the nested `mini-drills/` source tree. Do not touch production Firebase. Keep students blocked from unfinished Vocab Lab; admin/tester preview. No AI-generated images; Pinterest for inspiration only, assets must be licensed or original CSS/SVG.

## ORDER OF WORK — two checkpoints

### Checkpoint A — Phase 1.1 final (finish first)
- Reality Check: remove redundant `In context · <target>` label, highlight **only the target surface text occurring in the context sentence** (including multiword expressions). Preserve original text, case and punctuation, highlighting every intended occurrence without accidental substring matches (e.g. 'press' inside 'pressure'). Use safe escaped text + <mark> or scoped <strong>; never inject untrusted HTML.
- Preserve question meaning, options, first-error answer-neutral clue, independent/assisted evidence statuses, autosave/resume, mobile and accessibility.
- Final cleanup: remove repeated prose/visual clutter only, don't redesign approved card/tile/results UI. Validate screenreader announcement and contrast of highlighted term, mobile 390px, light/dark. Add regression test for highlighting a word and a phrase, and an absent/ambiguous target fallback.
- Report results of A before starting B. Commit A separately for easy rollback; push to feature branch only if safe.

### Checkpoint B — Phase 2 Personalized Mission prototype with REAL app integration
**Overall goal**: use the Vocab Check classifications to construct a cohesive, learner-specific game based on the approved `Save the Coast! V2.3` gameplay, not generic flashcards. Implement modular files (e.g., `vocab-mission-core.js`, `vocab-mission.js`, `vocab-mission.css`) and minimal integration in root index; no whole-app rewrite. Build a safe localhost-only sandbox analogous to `vocab-lab-preview.html`; optional in-app tester/admin preview, but no production writes until Firebase rules and schema have dedicated tests. All learner content must be authored original text, not lifted from Cambridge passage.

**Input and eligibility**:
- Read approved P1 bank and existing saved progress by stable sense IDs, not reimport a second independent list. P2 remains pending/non-visible.
- Work from a 5-item *demo subset*: `pose a threat`, `conduct research`, `substantial`, `reluctant`, `inevitable` are pedagogical demonstration vocabulary, **not verified to exist in approved P1**. Therefore do NOT claim these are sourced from Cambridge 17 P1 or silently add them to its bank. Either (a) build Save the Coast as an explicitly labeled **independent authored demo fixture**, AND (b) demonstrate the same mission engine with a coherent, separately authored scenario using five actual approved P1 terms. For the real linked mission, use only approved lesson IDs and senses.
- Map statuses: `new` → Discover; `unsure` and failed check → Strengthen; `verified_for_current_task` → bypass basic Discover/Investigate, silently (NO 'Previously Verified' interstitial) but may appear in integrated final scene; `self_reported_known`/unsampled Know It is provisional, not Mastered, and can receive a light contextual check. If insufficient terms, show short, truthful “not enough words yet” or use a smaller mission; never force artificial fillers.
- Never require finishing all 102 before starting a mission. After a 12-word batch, a Phase 2 sandbox CTA may start from classified words. Do not put inert future-feature buttons in student UX. Keep “Continue Sorting” option.

**Save the Coast V2.3 play sequence**:
1. Mission Briefing: short immersive story/setup (factory pollution, coastal investigation), original SVG/CSS imagery if desired.
2. Case File: EXACTLY ONE cumulative paragraph; each tap/click on report reveals ONE NEXT sentence, previous sentences remain; clear keyboard-accessible action and optional `Show full report`. No separate cards or numbered headings or extra “Finish Reading” button. Five coherent original example sentences for authored Save the Coast demo:
   - Chemical waste from the factory may **pose a threat** to marine life.
   - Before recommending any action, the team must **conduct research** into water quality.
   - The latest samples show a **substantial** increase in pollution levels.
   - Some factory owners are **reluctant** to change their production methods.
   - Without immediate action, further damage to the coast may become **inevitable**.
   Do not directly copy these into Cambridge P1 metadata as source text; they are original mission content.
3. Investigate: infer meanings in new contexts, personalized skipping according to above; first wrong attempt gives progressively helpful clue without answer; never answer reveal on first mistake.
4. Decode Evidence: combine collocation, sentence reconstruction and paraphrase tasks; NOT 5 identical multiple-choice items.
5. Word Morph mini-game integrated in Decode Evidence: 3 rounds (Discover form → Transform/paraphrase → Independent Recall), repeatedly alternate useful forms like `reluctant / reluctance / reluctantly` across varied contexts. Example demo 9 tasks (3 per round); adapt quantity to actual useful family members. Track EACH form's evidence independently; do not invent unattested forms, don't infer mastery of whole family. Wrong/hint/reveal does not count as independent recall. Don't force long forms drill on known forms; add limited adaptive repetitions for weak forms. In linked P1 mission choose authentic, useful families (e.g., congested/congestion, relocate/relocation, reliable/reliability/unreliable) when relevant.
6. Final Report: independent recall without word bank, sources or on-screen answer; new context vs prior tasks, small number of items. First wrong gets hint and retry; after additional errors can reveal and mark needs practice; correct first try without help records independent evidence. Avoid requiring all 5 verified words to do easy repetition.
7. Debrief: meaningful Ready for Review / Needs Practice by sense and form, no fake Mastered. Offer `Continue Sorting` / `Replay Demo`. The next Vocab Rescue / Puzzle Collection is a *future phase*, DO NOT implement or promise earned puzzle pieces in Phase 2.

**Persistence and security**:
- Prefer Phase 2 sandbox uses isolated localStorage namespaced by demo identity / mission ID, no real Firebase API/SDK.
- Design an explicit future data shape for mission session, task attempts, per-form evidence, and next-review signals, but do not change Firestore rules or write production collections without separate authorization/integration tests. No anonymous progress leaked cross-account. Version content/attempt IDs to support resume without changing questions mid-session.
- Never overwrite existing Vocab Check results, flashcards, XP, rewards, or Writing.
- Ensure progression buttons have working actions and replay resets only mission demo state.

**Visual UX**: match approved Phase 1.1 clean look while adding thoughtful game atmosphere. No overly dense screens, card stacks, redundant captions, excessive animations, stock/unlicensed/Pinterest hotlink art. Native original SVG/CSS illustrated coastal elements okay. 390px/mobile and desktop, dark/light themes, reduced motion, 44px touch targets, keyboard, focus handling, aria-live. No `Coming soon` screen pretending to be a functional phase. Clearly mark authored demo vs Cambridge-linked mission.

**Acceptance/QA and handoff**:
- Provide runnable local preview URL/instructions, safe from production service calls.
- Automated tests: status → personalized task selection; skipped verified words; 5-sentence cumulative reveal; hint/retry not independent; Word Morph per-form progress; varied tasks; Final Report no bank; resume/versioning; mobile/theme/accessibility; no regression in Phase 1.1 and existing Writing/Reading tests.
- Output screenshots of each chapter desktop and 390px, and test report; enumerate what is implemented vs deferred. Make A and B separate commits on feature branch, no PR merge or production deploy.
- If full Phase 2 is too large for one pass, implement coherent tested vertical slice and explicitly report what's still missing instead of claiming full delivery.
