# Teacher Review UX refinement — verified handoff

Branch: feature/vocab-lab. Spec/base: b286c3d71dc7718578fff3a03318a1b43e7b65fd. No merge to main or deployment.

## Result

The default review card directly shows meaning, sample sentence, contextual question, every option with the reviewer key, hint, explanation and independent recall variants. Additional authored Decode/family-form tasks are also visible. Body type is 16px, headings 20px and main reading width is capped at 880px. The existing Library tokens and light/dark themes are reused; no artwork or new app was introduced.

A compact desktop-sticky toolbar shows disjoint Pending / Needs Fix / Approved (local) / Rejected counts, status filters, word/source search and review-priority groups. All content is from the same Cambridge 17 / Test 1 / Reading Passage 1 source, displayed in readable form; the search can narrow an exact source ID rather than adding a redundant single-source dropdown. On mobile the toolbar stays in document flow to avoid obscuring content.

Priority review ranks deterministic failures first, explicit ambiguous-source decisions next, then contextual/form/distractor warning flags. Needs attention and lower-risk groups are only review aids: no automated judgment approves content. Human editorial quality remains pending. Technical IDs, versions, audit JSON and rehearsal live under Technical details.

Approve, Request Fix, Reject and Save draft have distinct visible actions. Decisions persist before the view changes; the current card remains visible, including when its status leaves the active filter. Next Pending explicitly moves to another pending item, wraps the global priority queue and clears a narrower search. Alt+N works only outside text fields. Unsaved notes/edits require confirmation before navigation/filter changes, outside controls or browser unload. Draft edits must be saved before approval/fix/rejection; validation errors preserve the input. Request Fix generates a copyable manual-transfer Codex brief. No live AI or silent auto-advance is implied.

Existing exact-version approval, immutable history, approval invalidation, reviewer identity/time, storage keys/CAS, role gates, bank definitions and student progress contracts are unchanged. No bulk approval was added.

## QA

Command: node tools/vocab-qa-runner.cjs --session teacher-review-ux --round 2 --changes-file qa-artifacts/teacher-review-ux/round2-changes.json

Final report: QA PASS, release BLOCKED. 105 Node tests, 244 original regression assertions, Writing validator, all ten browser suites PASS. Zero failed report steps; provenance, protected files, visual baseline and network isolation PASS. 437 screenshots retained internally.

The existing browser checks remain, adapted for the relocated technical panel. Added visible core content, initial counters/attention, Next Pending, unsaved-note cancel/confirm, draft-edit guard, filter cancellation, shortcut suppression in text fields, and outside-control discard tests. Six width/theme cases (390/768/1280, light/dark), reviewer A/B, approved-version invalidation, fix/reject/history reload and all 87 new-route rehearsals PASS.

Full round 1 passed. A supplementary outside-control test then reproduced a presentation defect: confirming discard cleared memory but left the old note in the DOM, and clean outside clicks reset the edit buffer. The fix guards only dirty state and rerenders on confirmed discard. The reproduction is retained under outside-repro; focused outside-fixed and full round 2 passed. No gate or protected baseline was weakened.

## Preview and visual comparison

Delivered ZIP: mini-drills-teacher-review-ux-v8.zip. Exactly 26 static allowlisted files; all extracted bytes must match preview-ui-dist and its manifest. No Firebase/config/backend/production network is included. ZIP is for manual UI review; nothing was uploaded.

Before screenshots: prior verified browser-recovery run on unchanged pre-refinement UI; copied to qa-artifacts/teacher-review-ux/before. After: teacher-review-ux/round-2-full/browser/editorial. Six matched viewport/theme pairs use the same source C17-T1-R1-040. Full-page image heights differ because content is now expanded by default; viewport widths and 900px viewport heights match. Desktop after screenshots scroll to the document top so the sticky toolbar does not obscure the comparison. Review these images before any optional manual upload.

To run locally from the checkout: node tools/build-vocab-ui-preview.cjs then node tools/serve-vocab-ui-preview.cjs; open localhost port 8787 and navigate Library > Learning Materials > Vocabulary > Teacher Review. Use fixture reviewer identities only.

## Remaining gates

102/102 drafted senses, 0 human-approved shipped/published; four explicit source decisions. Real staged auth/persistence and student assignment/save-resume for the 87 draft routes remain unimplemented. This UX task does not enable them. Local decisions remain browser simulations, not publication approval. The tested working-source fingerprint and base SHA are recorded in the generated QA report; final delivery SHA is in Git history and the output manifest.
