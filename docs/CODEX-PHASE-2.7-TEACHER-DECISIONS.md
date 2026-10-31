# Codex — Phase 2.7 Teacher Editorial Decisions

Read the full downloadable handoff `CODEX-PHASE-2.7-TEACHER-DECISIONS.md` if provided by teacher. Apply these decisions on `feature/vocab-lab` ONLY, after inspecting approved P1 bank and current draft/QA docs.

**These are instructions for draft revision, NOT item approvals. Keep all 102 items pending teacher review, 0 approved and 0 published.**

1. **Independent Recall Option A:** Grade retrieval of the exact taught target/expression, allowing only individually reviewed grammatical/orthographic variants. Unapproved synonyms do NOT get target-correct status. Never show target while independent recall active; distinguish hint/retry/reveal from first-attempt independent evidence.
2. **slum (C17-T1-R1-016):** Historical housing conditions; neutral and respectful toward residents.
3. **carriage (C17-T1-R1-019):** Horse-drawn carriage in current exercise with unambiguous horse/shaft context. Do not globally narrow the approved bank meaning; verify passage scope before publishing.
4. **solicitor (C17-T1-R1-026):** Accurate legal professional in England and Wales, with jurisdiction clear.
5. **clear slums (C17-T1-R1-029):** Neutral historical clearance/displacement; do not imply guaranteed consent, benefit or rehousing.
6. **emission (C17-T1-R1-055):** Rewrite *exercise* to plural **emissions**, consistently revising sentence, answer, distractors, hint, explanation and acceptable recall variants. Keep approved bank lemma/gloss and source/sense ID unchanged. Don't force plural in unnatural contexts.

Version changed draft items and invalidate any previous-version approval while preserving audit history. Do not alter approved Vocabulary Bank or Writing. Keep Library UI, Vocab Check 20/12, Reality Check, Mission and Word Morph behavior, isolated safe static preview and access restrictions. Ensure full 102 draft coverage is retained.

Add automated tests for target vs synonym, approved variant acceptance, no answer leak, accurate five source mappings, plural emission exercise, immutable version/review state and old saved snapshots. Run full `node tools/vocab-qa-runner.cjs` and focused browser tests; report honest PASS/FAIL and staging/editorial blockers. Write `docs/VOCAB-PHASE-2.7-TEACHER-DECISIONS-HANDOFF.md` with before/after examples, remaining teacher review and 0 approvals/0 published. Commit/push `feature/vocab-lab` using `[CF-Pages-Skip]` only; no merge or deployment.