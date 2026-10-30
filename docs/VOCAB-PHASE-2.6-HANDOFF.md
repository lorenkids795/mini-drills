# Phase 2.6 — Coverage and Teacher Review

Branch: `feature/vocab-lab`, repository `lorenkids795/mini-drills`. Base `742e95ac856ab07d6403b562c7f895f29a0e9f76`. Milestone A: `aad9620` (local editorial workbench); B: `a53fa21aa14d756675f7bdd9fab7925c8d597615` (content/rehearsal/QA). The final C evidence commit is identified by Git history and the delivered handoff manifest; generated QA status records the exact tested SHA and working-source fingerprint.

**Release readiness: BLOCKED. No merge or deployment.** Technical test results are distinct from teacher approval. No real student data or production backend is used.

## What is implemented

Teacher Review is inside the existing Library → Learning Materials → Vocabulary. One card shows the original context, bank definition, source/sense, priority, choices/key, hint, feedback, typed variants and available family forms. Filters support pending/questionable/approved/rejected/all and text search across source/sense/theme/forms/priority. Local teacher/admin and explicitly authorized editorial testers are supported; an ordinary tester is not a reviewer. UI-only uses separate demo reviewer A/B fixtures. Real non-demo production review storage is disabled.

Approve binds reviewer/time to the exact content version; Request Fix and Reject require notes. Edit/Replace and offline suggestions create a new DRAFT and invalidate approval while retaining history. Pack approval requires all current constituent versions and consistent metadata. Compare-and-swap storage rejects stale-tab writes; migration preserves older evidence without trusting old approvals. The offline revision brief requires manual transfer to Codex; there is no connected AI backend.

All 102 cards have contextual assessment and independent typed retrieval. “Try draft exercise” rehearses a card without writing learner Check/Mission evidence. Existing Check 20/12, autosave, Reality Check, three candidate mission packs and their classified-word selector remain in place.

## Exact content coverage

| Measure | Count |
| --- | ---: |
| Approved bank senses (denominator) | 102 |
| Independently assessable drafted senses | 102 |
| Existing mission target senses | 15 |
| New contextual challenge senses | 63 |
| New micro-review senses | 24 |
| Missing draft routes | 0 |
| Awaiting teacher review | 102 |
| Human-approved shipped / published | 0 / 0 |
| Flagged editorial decisions, included in draft total | 4 |
| Core / supporting / advanced | 69 / 20 / 13 |

Four bounded batches add 22, 22, 22, 21 senses, with cumulative draft totals 37, 59, 81, 102. The five former context-only appearances now also have their own independent routes. No double counting; each approved source/sense appears once in the editorial catalog. No bank definitions or pending P2 data were changed.

Decision cards: slum (`016`), carriage (`019`), solicitor (`026`), clear slums (`029`). Each has alternatives, original examples and a recommendation. A different interpretation requires revision before approval. These are draft coverage, not approval.

`editorial/vocab-phase26-review-queue.json` contains all tasks, version digests, deterministic results and heuristic flags. Automated checks cover unique IDs, approved mapping, key/choice consistency, explicit variants, non-revealing hints, contextual task completeness, forms and independent retrieval. Offline wording review corrected an installation phrase word count and a redundant timber-beam cue. Grammar, idiom, distractor plausibility, IELTS challenge, source interpretation, narrative and rights remain **TEACHER_REVIEW**; explicit lexical scaffolds are not proof of independent proficiency.

## Verification and evidence

Focused new-content/workbench tests: 36/36 PASS. Focused browser matrix: 390/768/1280 light/dark plus actual Library admin/teacher, blocked ordinary tester/student/production mode. Checks include exact-version approval, edit invalidation, reload, fix notes, offline brief, empty/filter states, keyboard, A/B storage isolation and draft rehearsal. The broad test query `040` matched other sense hashes; the source-specific regression uses full `C17-T1-R1-040`. An observed stale error after switching filters was corrected by clearing card-specific feedback on navigation.

Full QA round 1: 105 Node tests, 244 original assertions, Writing validator and nine of ten browser suites PASS. Reality geometry failed by 3 px in one app initialization case. Layout-shift diagnostics showed the Library tab/shell typography settling before the click baseline, while measured stable-context clicks did not move options. The regression now waits for fonts plus ten stable animation frames before taking the baseline, with a bounded timeout; post-click rectangle equality remains exact. No gameplay or Writing code was changed for this test synchronization fix. Round 2 failed under sandbox (temporary-file rename EPERM and localhost EACCES), with browser preflight also unavailable. Round 3 outside sandbox passed all 105 Node tests, 244 regression assertions and Writing validation, but could not resolve playwright/package.json. All ten browser suites were NOT_TESTED in that final round; network verification therefore failed. Final full QA is FAIL/BLOCKED, not PASS. The three-round limit has been reached; no further retries were performed. The geometry synchronization fix still needs browser verification in the next explicitly authorized QA session with pinned Playwright available.

Full regression authority: `docs/VOCAB-QA-STATUS.json` and `.md`, session `phase26-final`, maximum three bounded rounds. These generated reports contain actual PASS/FAIL, all commands, counts, transport evidence, screenshots, source fingerprint and remaining gates. Do not infer full PASS from the focused results above. The full plan includes all Vocab Node tests, ten original regression scripts (at least 244 assertions), Writing content validation, and ten browser suites including Teacher Review. Check → Mission flow remains covered by existing suites; the reviewer suite covers Library → Teacher Review with isolated identities.

Root app comparison confirms byte-equivalence after removing the Vocab adapter block and new Vocab imports. Protected Writing/auth/backend/bank/P2 hashes and nested-tree checks remain required. Main was inspected only: `9536e3a022308b906975e3cbce292cf7699c8518`; divergence is preserved, not reconciled or merged.

## Deliverable and open work

The audited UI-only static build contains exactly **26 static files**, including manifest (25 hashed entries). A new V7 ZIP was not delivered in this closeout because final browser QA remains blocked. It retains the existing CSP, network guard, cloud-adapter removal and deny-by-default server tests. Audit output bytes against the manifest before manual upload. No Cloudflare configuration was changed and no upload was performed. Use a fresh browser origin/profile to test without real student data; existing local Check saves remain untouched.

Concise digest: `docs/VOCAB-PHASE-2.6-TEACHER-DIGEST.md`. Earlier round-1 and focused screenshot evidence remains in local qa-artifacts; the closeout output includes the final reports and concise handoff. No new verified browser screenshots were produced in rounds 2/3.

Still incomplete/disabled: human approval and publication of all 102; secure server-authenticated review persistence, staged role/rules/conflict/security validation; live AI revision service; trusted export/import/publication pipeline; learner assignment/save-resume for the 87 new routes (reviewer rehearsal only). Existing candidate mission gameplay persists normally; draft rehearsal deliberately has no saved learner progress. Family-form coverage has not been expanded beyond existing attested forms. Do not claim production-ready or READY FOR TEACHER REVIEW for the full release while mandatory gates remain blocked.

## Closeout on 2026-10-30

Remote feature head was fetched and verified as an ancestor (two local milestone commits ahead, no remote-only commits). This closeout commits the existing Reality Check test synchronization fix, final honest QA reports, teacher digest and handoff. No application code was changed during closeout. No merge, deployment, publication or teacher approval was performed. Final commit SHA is recorded in Git history and the delivered closeout manifest after commit.
