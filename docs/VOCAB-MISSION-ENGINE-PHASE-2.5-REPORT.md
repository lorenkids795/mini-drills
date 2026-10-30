# Phase 2.5 — curated personalized mission engine

Status: **BLOCKED — NOT READY FOR TEACHER REVIEW as a release**. Three technically testable, original candidate packs are available only in explicit admin/tester editorial QA. None is human-approved or published. No deployment or main merge is authorized or performed.

## Milestones

- A: design, pure planner, editorial schema/rubric and all-102 source/sense audit; separate commit `694c245`.
- B: Station Access Audit, A New Home for Evening Classes, The Power Exhibit Review. Each has five approved target senses, original coherent case, contextual inference, story-linked decoding, an attested useful noun family, all-target independent final recall and distinct debrief. Shared Library selector uses actual saved classifications, not demo profiles. Technical validation never becomes editorial approval.
- C: complete 102-row coverage accounting and a checked scale queue, with concrete future themes or micro-review/manual-sense routes. **Scaling the remaining authored/approved content is deferred** as the task explicitly permits. A scale-plan entry does not count as mission content. Existing Vocab Check Review remains available; a new spaced scheduler or alternative micro-task engine has not been implemented.

## Honest coverage

| Category | Count |
| --- | ---: |
| Human-approved published target senses | **0/102** |
| Authored candidate target senses, awaiting teacher review | **15/102** |
| Additional context-only senses | 5 |
| Ambiguous/sensitive source senses, deferred to teacher | 4 |
| Other deferred mission target senses | 78 |

The 15 candidate + 5 context + 4 ambiguous + 78 deferred rows partition all 102 approved P1 senses. Published coverage is a separate numerator, currently zero. The bank and Pending P2 have not been rewritten. Exact source/sense provenance is in `VOCAB-MISSION-COVERAGE.json` and the packs; the prospective queue is `editorial/vocab-mission-scale-plan.json`.

## Personalization, saves and publication

Planning, offline pack data, deterministic construction, Library delivery and existing storage remain separate. No runtime model calls. Packs require version-bound APPROVED metadata including human reviewer/time before normal gameplay can select them. All three current versions remain TEACHER_REVIEW, with their ten-dimensional rubric and variant-review queue in `editorial/vocab-mission-review-queue.json`.

New→Discover; unsure/needs-practice→Strengthen; unverified Know It→light contextual check; verified→context without basic drills. Zero/all-verified overlap shows a truthful empty state and Continue Sorting. One/two active targets keep the entire coherent story; unclassified/context words earn no assessment coverage. Source revision, evidence, selected IDs, content snapshot/version, plan version and task IDs are pinned per run. Every selected target receives independent recall; the legacy two-final cap is not used for curated runs.

The v2 storage namespace separates identity, pack and QA/publication. Legacy v1 snapshots remain untouched. Saved prompts and typed/reconstruction drafts resume from their original snapshot. Recent independent per-form evidence is identity/lesson-bound, limited to 30 days, separate from base-sense evidence and segregated between QA and published runs. Hints/retries remain assisted; no Mastered/XP/account writes are added.

## Content findings and bounded repair

Offline AI-assisted original prose is declared explicitly; no copyrighted passage examples or downloaded artwork are used. Original code-native schematics differ across the three cases. Dictionary attestations establish lexeme/POS only: [congestion](https://dictionary.cambridge.org/dictionary/english/congestion), [construction](https://dictionary.cambridge.org/dictionary/english/construction), [condensation](https://dictionary.cambridge.org/us/dictionary/english/condensation). Grammar, collocations, plausible distractors, fixed recall variants, narrative quality and all teaching claims remain subject to human review.

Provenance review corrected draft source numbers: alternative is 089, power supply 099 and slum 016. Approved bank source 090 means confined space; 100 means technical achievement. A regression now rejects mapping another approved sense onto an incompatible final-recall key. The original bank was not altered.

Focused QA exposed test synchronization with asynchronous saved-state/render updates and a Windows line-ending sensitivity in the existing app harness. Browser assertions now wait for both committed task state and its rendered prompt; root index retains its prior LF encoding. These were test/integration repairs, not reasons to change teaching keys or weaken gates. Initial focused failures remain under `qa-artifacts/phase25-pilot-unit` and pilot screenshots; they are not silently replaced by the final full-run report.

## Verification and evidence

Run `node tools/vocab-qa-runner.cjs --session phase25-final --round 1` from the repository root. The authoritative PASS/FAIL results, counts, actual commands, failed/untested gates and immutable run path are in `VOCAB-QA-STATUS.md` / `.json`; a focused run can never declare readiness. Full repair rounds are bounded to three. The runner includes the nine browser suites, all existing regression scripts and Writing content validator, all Vocab Node tests, 100 deterministic mixed-classification plans, exact-coverage/publication checks, protected scope, provenance and browser transport auditing.

Curated browser QA exercises all three packs through briefing/case/investigate/decode/morph/final/debrief, typed draft reload, unchanged source Check and A/B isolation at 390/768/1280 in light/dark. Legacy Town/Coast remain explicitly internal regression fixtures; learner navigation does not expose them. Real-shell QA separately exercises admin/tester/student access, UID mock paths, stale-tab conflicts, logout and unchanged Writing access.

The static bundle is now **21 files**: the previous 17 plus planner/packs/engine/library JS. New assets are script-loaded, not new API/fetch allowances. Exact allowlist, byte hashes, forbidden material, missing/tampered/unknown files, redirect/transport probes and CSP remain required. The network guard and its three-JSON read allowance are unchanged. ZIP V6 is a manual-upload artifact only; a Git push does not update Direct Upload.

## Review locally

1. Run `node tools/build-vocab-ui-preview.cjs`, then `node tools/serve-vocab-ui-preview.cjs --port 8787`.
2. Open `http://127.0.0.1:8787/` → Library → Learning Materials → Vocabulary → Vocab Check. Use Tester A/B fixture data only.
3. Classify a Standard 20 or Quick 12 batch, then Personalized Missions. Normal mode truthfully has no published mission. Explicitly check **Review unpublished candidate packs · admin/tester QA** to review a candidate overlapping your classified words. Later terms need later batches; no finish-all-102 prerequisite is imposed.
4. Continue Sorting returns to the saved Check. Reload during a mission restores its exact version and typed draft. Switching A/B keeps separate progress. Do not use real student data.

## Scope and remaining gates

Root `index.html` is identical to milestone A after removing the four new script imports. Writing files, backend/config, auth/rules, approved Check data, CSS/font/layout contracts and nested `mini-drills/` are protected. Latest observed main is `9536e3a022308b906975e3cbce292cf7699c8518`; it has divergent Writing/backend/rules and is not merged. A future main reconciliation needs separate review.

Before any future release: author the deferred routes, resolve the four sensitive meanings, obtain teacher approval of exact pack versions/variants and UX, satisfy mandatory 102-sense coverage, and run Firebase emulator/staging authorization tests plus reconcile latest main. Cloudflare configuration/production endpoints were not changed or contacted. No claim of complete Phase 2.5 release readiness is made.
