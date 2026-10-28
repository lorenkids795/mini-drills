# Vocab Lab Phase 1 — implementation and manual QA

Base: `feature/vocab-lab`, `56cb32b5fddc63c2898f6b294cae777259ca925d`.
No commit, push, PR, merge, deployment, or Cloudflare configuration changes were made.

## Source root and shared integration

The user explicitly authorized **repository root only** after confirming Cloudflare settings are unavailable.
Root `index.html` loads the root modules. The divergent nested `mini-drills/` tree is untouched.
Actual Cloudflare Root directory / Build output directory remain **unverified**. This is not a deployment-root confirmation.

Shared `index.html` edits are limited to:

1. Stylesheet include in the head; three Vocab Lab script includes before the existing script chain.
2. Empty `v-vocab` section.
3. `lmVisible` allows existing tester accounts to preview unpublished lessons. The Writing tree displays Coming soon for ordinary students. No Writing lesson content, grading or `lm-*` source changes.
4. `vocabAllowed` / `vocabRender`, conditional Vocab Lab tab, hide/show mapping in `showTab`.
5. `refreshLive` rechecks the gate when account/config snapshots change.

No changes to authentication, backend routes, `md-config.js`, flashcards, dictionary, XP, existing tests, or existing data migrations.

## Files and data

- `vocab-lab-core.js`: pure ES5 state transitions and task-specific evidence.
- `vocab-lab-store.js`: atomic Firestore transactions, optimistic revision lease, idempotent operation IDs, `onSnapshot` subscription.
- `vocab-lab.js` / `.css`: delegated events, keyboard controls, scoped theme-aware layout, device draft and retry UI.
- `vocab-lab-preview.html`: localhost-only device sandbox; no Firebase SDK/API/account writes.
- `tools/import-vocab-lab.py`: read-only XLSX import with source hash, counts, stable term/sense IDs and editorial overrides.
- `tools/build-vocab-practice.py`: validates 102 fresh contextual paraphrases and rotates answer positions.
- `data/vocab-lab-p1.json`: 102 approved P1 entries, 69 Core / 20 Supporting / 13 Advanced.
- `data/vocab-lab-practice.json`: one new contextual paraphrase per sense. Source-aligned and tested; teacher linguistic review remains necessary before general student release.
- `data/vocab-lab-import-audit.json`: reproducible import evidence.
- `editorial/vocab-lab-p2.pending.json`: 100 proposed P2 entries. Never fetched by the application.
- `editorial/vocab-lab-contexts.tsv`: reviewable authored practice source. No full Cambridge passage text.
- `tests/vocab-lab.test.js`: model, source map, app gate and transaction-double tests.
- `tests/vocab-lab.browser.js`: browser flows and offline draft/reload/retry using a local Firestore double.
- `firestore.rules`: three new isolated collections and a preview gate.

The workbook's old P1 review cells say Pending teacher review. The task/spec explicitly approve the 102 P1 entries; the importer records that authority and retains original review text. No P2 approval is inferred. Royal Commission is absent; slum is Supporting. Family suggestions retain `evidence: none`; no family-wide mastery is inferred. Existing term IDs/import actions are preserved as provenance, not silently mapped onto dictionary/flashcard IDs. Same canonical term + same contextual sense generates the same deterministic ID across passages; different senses remain separate.

## Behavior and persistence

Sort 12 words per batch (last batch 6), one word at a time, with meanings hidden. Use Know It / Not Sure / New to Me, keys 1/2/3, and Undo/U until Reality Check starts. Each action saves; reload resumes the partially sorted batch or check, including wrong choices/hint history.

Reality Check samples up to 3 Know It items, or fewer if fewer exist; no Know It skips checking. A high error rate (at least half of two or more completed checks) expands to up to 5. Initial mistakes show a clue without revealing the key; the second mistake or explicit reveal shows an explanation and records needs_practice. Correct first try without hints is verified_for_current_task only. All other Know It items stay self_reported_known / unsampled. No Mastered claim, XP, missions or puzzles.

State collection: `student_lesson_sort_progress/{uid}__cam17-t1-reading-p1` holds resumable batch, lesson-linked sense progress and attempt history. `student_term_progress/{uid}__{senseId}` mirrors changed sense evidence; `student_attempts/{uid}__{operationId}` is append-only. These write atomically. No existing collections are changed.

Transactions compare the saved revision to the action's starting revision. Concurrent stale actions are rejected and load the current remote state with a visible retry message. Repeated operation IDs are idempotent. Network failure preserves one pending device draft and pauses further actions until Retry sync succeeds; no silent last-writer-wins overwrite. Acknowledged remote progress wins over a stale device cache. Device storage is namespaced by email and lesson. Local drafts remain on that browser; shared-device privacy follows the existing local-storage approach and should be reviewed before broader rollout.

## Firestore permissions — not yet deployed

The gate requires an authenticated account and either admin claim, `roster/{email}.tester == true`, or explicit `config/vocabLab.enabled == true` for students. The UI defaults to tester/admin only when the config document is absent. Ordinary teachers retain read access for existing teacher workflows; preview writes require eligibility and ownership. IDs bind writes to the authenticated Firebase UID; updates preserve lesson/email and increment the revision. Attempts cannot be updated/deleted by clients. No permissions on cards/errors/etc. were widened.

The new rules must be reviewed and published **in an isolated Firebase test project first**. A normal static preview using current production config would connect to the production project; do not use it for write testing. No production Firestore or KV data was accessed for QA.

Real Firestore rules compilation/enforcement, authentication claims, indexes and cross-account denial have **not** been executed against Firebase or its emulator. The adapter tests use a transactional double; rule tests check the static contract only. Do not equate these with a security-rule integration test.

## Safe local preview

In the repository root, serve static files, binding localhost only:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/vocab-lab-preview.html` (not `index.html` with production config). The standalone page only writes sandbox localStorage, offers two separate tester identities and a theme toggle, and refuses non-localhost hosts. It imports no Firebase scripts. Do not change `md-config.js` to demo mode.

For full application QA, the browser runner substitutes `demo:true` in memory for its own request only. It never changes the config file. Run with Playwright provided through NODE_PATH, optionally setting `VOCAB_BROWSER_CHANNEL=chrome` if Edge is unavailable:

```powershell
node --test tests/vocab-lab.test.js
node tests/vocab-lab.browser.js
```

Browser screenshots go to an OS temp folder by default, or `VOCAB_QA_DIR` when explicitly set.

## Manual QA checklist

- [ ] Ordinary student: no functional Vocab Lab tab; Writing Learning Materials displays Coming soon; existing Cambridge Writing tasks still work.
- [ ] Tester/admin: Vocab Lab tab present; tester can open unpublished Writing units, following their normal stage prerequisites.
- [ ] Sort several terms, Undo the latest, reload, and confirm the next unsorted term and batch counts.
- [ ] Confirm definitions do not appear during sorting; long terms wrap at 390px.
- [ ] Finish a batch with zero Know It; checking skips and next batch contains no previous terms.
- [ ] Finish with 1–2 Know It; sample is limited to that number. With many Know It, initial sample is 3.
- [ ] Wrong first answer shows clue without key; reload retains that attempt; correct retry remains Needs practice.
- [ ] Hint/reveal do not create independent verification. Two wrong answers show explanation. Frequent errors expand the sample to 5.
- [ ] Unsampled Know It stays self-reported. Word-family suggestions do not create evidence.
- [ ] Revision from the results screen clears only the chosen sense's current evidence; previous attempts remain recorded.
- [ ] Nine batches cover 102 unique P1 items; final batch contains 6. No P2 or Royal Commission; slum Supporting.
- [ ] Keyboard-only sorting/undo/check, visible focus, 44px controls, 390px/1280px, light/dark, reduced motion and screen-reader announcements.
- [ ] Separate accounts have separate progress. After real Firebase test-project sign-in, close/reopen the browser and resume from the server.
- [ ] Two real sessions race on the same revision; one succeeds, the other loads latest progress and asks for retry.
- [ ] Disconnect during a save, reload, reconnect, Retry sync. Confirm device draft is visible and not falsely described as cloud-saved.
- [ ] In Firebase emulator/test project, anonymous/non-tester denied; own tester allowed; other student's reads/writes denied; teacher read allowed; UID-path spoofing, owner change, stale revision and attempt overwrite denied.
- [ ] Run all existing auth/Reading/Writing/admin/UI tests; manually smoke-test with test accounts before deployment.

## Before deployment / broad release

1. Confirm Cloudflare Root directory, Build output directory, branch preview behavior and production branch mapping. Nested source must not be selected accidentally.
2. Teacher reviews the new practice contexts, distractors and hints. Keep P2 pending.
3. Run Firebase emulator/test-project rules compilation and authorization matrix above; verify server persistence, real two-session conflicts and offline recovery.
4. Review the exact root-index hunks alongside concurrent Writing work; do not overwrite another author's changes.
5. Keep `config/vocabLab.enabled` absent/false until an explicit student release decision. No enablement, deploy, push or merge is part of this task.
