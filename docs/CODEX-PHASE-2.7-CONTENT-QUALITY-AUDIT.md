# CODEX — Phase 2.7: Vocabulary Content Quality Audit (102/102)

## Teacher's decision
Teacher approves a full CONTENT QUALITY AUDIT before manually reviewing 102 items. The Teacher Review V8 screen is already good enough; DO NOT redesign it. Focus on teaching quality, correctness, and independently meaningful retrieval.

## Current baseline
Repo `lorenkids795/mini-drills`, branch `feature/vocab-lab`. Teacher Review V8 screenshot highlighted `pass (a proposal)`: context MCQ distractor "physically walk past the meeting room" is too implausible for the context, and recall prompt is too close to recently displayed answers. 102/102 items have assessable draft routes; ZERO human-approved/published. Keep 102/102 coverage accounting honest, existing student progress handling limitations, and existing role/staging blockers.

## Audit 100% of content
Audit the exact 102 approved C17-T1-R1 sense IDs and all associated **learner-facing** drafted contexts, investigate/meaning tasks, decoding, independent recall, hints, explanations, variants, morphology and mission packs. Do NOT audit only the first 15; no silently skipped micro-review entries. Build a machine-readable per-sense / per-task report with severity, category, original text, proposed repair, rationale and status.

Rubric, per question:
- **Sense precision**: respect teacher-approved source meaning, sense, POS, register, phrase boundary, source ID; no collision of homonyms/senses or misleading context.
- **English naturalness**: grammar, collocations, tense, articles, number agreement, British/IELTS appropriateness, avoid stilted or ambiguous sentences.
- **Distractor quality**: exactly one unambiguously correct answer, other options credible in the sentence situation, reasonably similar length/register, not simply silly alternatives; avoid semantic near-synonyms that make multiple answers defensible.
- **Hint discipline**: on first wrong, hints guide interpretation without spelling the key, direct synonym answer, or allowing answer by elimination alone.
- **Explanation**: concise, sense-specific reasoning that contrasts tempting misunderstanding, no false claims.
- **Independent recall**: genuinely retrieve term without target, synonym keyed as the answer, exact answer shown in nearby persistent panel, or inappropriate word bank. Earlier exposure in a learning sequence is fine, but require an intervening independent retrieval/new context; explicit target must not remain visible in the same active view. Accepted variants must be precisely valid in the full sentence with correct inflections/articles/number/case; reject overpermissive surface matches.
- **Word Morph**: attested meaningful family forms, separate form-specific evidence, natural transformations; no false derivations or promotion to mastery.
- **Story consistency**: if in coherent mission, scenarios and selected learner words must match actual classification and step order. Keep internal Coast/Town demos out of published path.
- **Copyright and safety**: original contextual sentences, no reproducing Cambridge copyrighted reading passages, no student data.

## Automated repair, approval boundaries
1. Generate `docs/VOCAB-CONTENT-AUDIT-102.md` (readable summary) and `docs/VOCAB-CONTENT-AUDIT-102.json` (all IDs/task evidence); count all 102 with no omitted senses.
2. Repair unambiguous mistakes in **DRAFT** content only, under version control. Every edited item gets a new content version; invalidate any prior local approval when content changes. Preserve original plus diff, no silent rewrite of teacher-approved bank, lexeme sense, lesson provenance, or published artifacts.
3. For ambiguity requiring English/IELTS judgment or source-sensitive term (slum, carriage, solicitor, clear slums), mark **TEACHER_REVIEW** with 1–2 alternatives; don't fabricate teacher approval. Keep `APPROVED` and `PUBLISHED` at zero unless an actual teacher reviews and approves in authorized environment.
4. Prioritize serious semantic errors, duplicate correct choices, answer leaks and invalid recall variants over cosmetic rewriting. Avoid trivial churn and overengineering.
5. Quality heuristics/tests cannot prove idiomatic nuance. Clearly distinguish automatically detected/validated checks from subjective teacher review.

## QA / tests / output
- Extend deterministic unit tests to catch answer-in-hint, multiple valid options where detectable, bad answer variant grammar/morphology, target leakage during independent recall, version invalidation, no regression in first-wrong retry, Standard 20 / Quick 12 and review workflows.
- Browser test at least representative Mission, micro-review, Word Morph and Final Report at desktop/mobile light/dark; assert answer not visible during active independent recall. Check that reviewer view **may show correct answer**, but learner view must not.
- Run `node tools/vocab-qa-runner.cjs` full suite, fix reproducible bugs up to 3 bounded iterations; report exact PASS/FAIL/NOT_TESTED and explicit blockers. Preserve network-zero static Preview CSP/allowlist and all existing Writing/auth boundaries.
- Prepare `docs/VOCAB-CONTENT-AUDIT-TEACHER-DIGEST.md`: top-priority items, concise decision cards and number of items needing human review, designed to minimize teacher work, not falsely auto-approve.
- Provide before/after examples including `pass (a proposal)` and 5 diverse terms. Provide exact coverage counts: audited 102/102; drafts changed, auto-check passed, teacher-review flags, published 0.
- Generate a new versioned, audited UI-only ZIP only if needed to preview changed learner content; explicitly state whether it requires manual Cloudflare Direct Upload.
- Commit/push only branch `feature/vocab-lab` with `[CF-Pages-Skip]`; do not merge main, deploy production or Preview automatically. Avoid conflicting with concurrent Codex sessions; confirm clean working tree before starting.
