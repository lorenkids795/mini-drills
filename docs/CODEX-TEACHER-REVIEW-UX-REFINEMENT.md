# CODEX — Teacher Review UX refinement (Phase 2.6)

Teacher screenshot of deployed UI-only Teacher Review shows one very tall, narrow card with tiny text, many collapsed sections, raw source/sense IDs, technical version metadata, and tiny approval buttons. Teacher must review 102 items; streamline without weakening human editorial approval.

## Objectives
- Teacher's job: quickly determine if English meaning, sentence, correct answer, distractors, hint, explanation, and recall variants are pedagogically correct.
- Make the **default review card fully readable** at real viewing size: target word + meaning + 1 sample sentence + question/answers with correct option indicated for reviewer + clue + explanation + accepted recall variants. Avoid making teacher expand 4-6 accordions to inspect the core material.
- Use a comfortable main content reading width (roughly 760–920 CSS px), 15–16px body type, clear 18–20px headline, restrained spacing. Do not make text shrink to fit a 102-item overview.
- Technical details (source ID, sense ID, hash, version audit, transport, internal score) live in an optional 'Technical details' accordion. Show human-readable source 'Cambridge 17 · Test 1 · Reading Passage 1'.
- Above the card, compact sticky review toolbar with counts: Pending, Needs Fix, Approved (local), Rejected; search and status/source filters, plus next pending. Do not inflate the page with explanatory demo warning: one small badge/note 'UI demo · decisions saved only in this browser'.
- Card header: word + tier + lesson source; clear pagination '12 / 102'; concise AI audit indicators, e.g. 'Auto-checked' vs 'Needs teacher attention'. AI checks must NEVER be framed as teacher approval.
- Primary action row: Approve, Request Fix, Reject, Save draft; clear visual hierarchy, keyboard shortcut only when text fields not focused. On action, persist then optionally advance to next pending with Undo/confirmation where appropriate. Do not advance silently if unsaved edits or notes exist.
- For 'Request Fix', require a teacher note explaining what to fix, and produce a structured, copyable Codex revision brief if no live AI connector exists. Do not show an inert 'Send to AI' button; do not imply AI revisions happen online if no API/backend.
- Editable revisions must create new version and invalidate approval of prior version; review history accessible but not prominent by default.
- Add a 'Priority review' filter: surface ambiguous source senses, semantic mismatches, invalid recall variants, bad distractors, and failing editorial audit first. PASS from deterministic tests does not imply editorial correctness. Suggest low-risk/needs-attention groups; never auto-approve.
- Optional concise list/table view of all 102 items with status and priority; clicking opens review card. Maintain a clear 'next pending' flow. Bulk actions must not imply human approval if items weren't examined.
- Preserve responsive 390/768/1280, light/dark and accessibility/focus. Stay inside Library → Learning Materials → Vocabulary. Preserve UI-only isolated static 26-file-or-revised exact allowlist, no Firebase/production network. Do not change real Writing, bank source definitions, or student progress.
- QA runner regression: approval/version invalidation, note required for Request Fix, edit/leave confirmation, next pending behavior, status counters, filtering, A/B reviewer isolation, no external network.
- Create before/after screenshots in equal viewport sizes and report changes. Build versioned audited ZIP for optional Cloudflare Direct Upload; no merge or deploy. Feature branch feature/vocab-lab only; prefix [CF-Pages-Skip]. Human must review the screenshot before uploading.

Do not build a second admin app. Take visual tokens and patterns from actual Mini Drills Library, and remove duplicate metadata and clutter. 
