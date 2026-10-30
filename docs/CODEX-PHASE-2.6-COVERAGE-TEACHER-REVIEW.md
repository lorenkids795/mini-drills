# CODEX — Phase 2.6: Coverage Expansion + Teacher Editorial Review

## Goal
Continue Phase 2.5 on `feature/vocab-lab`. User wants Codex to do the repetitive content creation, validation and QA so teacher only reviews an organized final editorial queue. DO NOT mark Vocab Lab production-ready merely because technical checks pass.

## Ground truth
Phase 2.5 report: 0/102 human-approved published senses; 15 candidate target senses across 3 curated packs; 5 context-only senses; 4 ambiguous/sensitive; 78 deferred. QA final full run PASS but readiness BLOCKED. Preserve accurate provenance from approved Cambridge 17 Test 1 Reading Passage 1 vocabulary bank. Pending P2 unchanged. Preserve Saved Check 20/12, current gameplay, Library navigation, tester/student gating, Writer work, Safe UI-only preview and zero production network.

## Content expansion
- Produce a **reviewable learning route for all 102 approved senses** using a sensible mix of narrative mission packs, short contextual retrieval challenges and targeted micro-review. Do NOT shoehorn every word into a lengthy fictional story. A word counts as covered only with independently assessable contextual task + valid answer/hint/explanation; context-only appearances do not count.
- Break work into bounded batches (e.g. 15–25 senses), each with explicit new draft coverage numbers and provenance. Prioritize Core and frequently useful IELTS phrases, then Supporting/Advanced. Never silently rewrite teacher-approved vocabulary bank.
- For the 4 ambiguous/sensitive senses, prepare concise decision cards with source sense, interpretation options, classroom-appropriate original examples, and recommendation; leave TEACHER_REVIEW pending. Do not invent approval or modify bank definitions without approval.
- Every authored item must pass deterministic schema/content consistency checks and an editorial heuristic audit: correct grammar, idiomatic usage, one defensible MCQ key, credible distractors, hints not revealing answers, explanations specific to target, acceptable typed recall variants with appropriate morphology/articles, narrative consistency, source/sense precision, reasonable challenge level. Mark subjective IELTS judgments TEACHER_REVIEW.
- Offline drafting permitted; no unchecked runtime LLM generation, no copying copyrighted Cambridge passages, no invented source IDs, no AI-created artwork.

## Teacher review interface — main priority
Build a **teacher-only editorial review workbench** on `feature/vocab-lab`, ideally inside Mini Drills Library > Learning Materials > Vocabulary for actual teacher/admin role, with tester only if legitimately authorized. Reuse real Mini Drills UI styles. Show queue by pending/questionable/approved/rejected, source, sense, theme, form and priority.
- Review one manageable item/card at a time with original context, target phrase, question, choices, correct answer, hint, feedback, accepted variants, family forms, source mapping and coverage impact.
- Actions: Approve exact immutable content version, Request Fix (with teacher note), Reject, and Edit/Replace draft. Edits must create a new version and invalidate prior approval, not silently mutate a published pack. Review a whole pack only after constituent items pass; record reviewer identity/time and approval version.
- Explicit `Send to AI for revision` and `Apply suggested revision as draft` workflow when applicable. If no approved backend or secure AI integration exists, do NOT fake a working AI button: provide a copyable structured revision brief or offline Codex workflow; label as requiring manual transfer. No misleading live AI connection.
- For Phase 2.6 deliver **functional local/staging editorial queue** and clear persistence design. UI-only Cloudflare preview uses demo reviewer fixtures only, local browser state, no privileged production writes; real app persistence/auth must be staged/tested before enabling.
- Bulk approval allowed only after clear per-item previews, version audit and teacher explicit action; no auto-approval from AI tests. Keep lightweight and uncluttered.

## Testing + release gate
Extend `node tools/vocab-qa-runner.cjs`: every approved sense either has assessable draft route or flagged editorial blocker; never count context-only or awaiting review as published. 102/102 DRAFT coverage is a target, but report actual achieved number honestly. Test edits/revisions/approval invalidation, role restrictions, provenance, duplicate IDs, storage isolation, migration, empty/filter states, keyboard, mobile, UI regression, Check→Mission→Review. No production API/Firebase use.
- Keep review evidence/reports with `DRAFT`, `TEACHER_REVIEW`, `APPROVED`, `PUBLISHED` distinct. Readiness remains BLOCKED while teacher review or staged auth/security or full approved coverage missing.
- 3 bounded QA/fix iterations max. Capture concise screenshots and teacher review digest rather than asking teacher to test hundreds of screens.
- Preserve main divergence and Claude Writing; no merge to `main`, no Cloudflare production or preview deploy without user approval. Build versioned audited static ZIP for UI-only preview if relevant; cloud Direct Upload requires manual upload.
- Report exact coverage counts, review queue, open editorial decisions, branch/SHA and tests in `docs/VOCAB-PHASE-2.6-HANDOFF.md`. Commit/push to `feature/vocab-lab` with [CF-Pages-Skip].

## Prioritized milestones
A. Review-workbench schema, mock UI and honest approval workflow; 15 existing pilot target items visible and editable.
B. Expand drafted content in batches with automatic QA and coverage ledger to as many of 102 as feasible, preserving review status.
C. Teacher-ready concise review digest and UI-only audited ZIP; release still gated by actual approvals.
