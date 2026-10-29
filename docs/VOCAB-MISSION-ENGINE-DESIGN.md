# Phase 2.5 — milestone A

Separate pure planning (`vocab-mission-planner.js`), offline versioned authored pack data, deterministic task construction, and existing delivery/store. No runtime model calls. Every target/context sense maps to the approved lesson link and source ID; bank/P2 remain unchanged.

Pack schema: id/version/lesson/theme/title/briefing; 4–7 target terms with sourceId/senseId/sentence/investigate/decode/final; optional separately identified context; morph tasks with attestation reference, POS, definition and discover/transform/recall/extra; original-authoring rights; review status and publication state. Publication requires APPROVED + reviewer + approval timestamp + approvedVersion exactly matching version. A technical validator cannot set human approval.

Planner consumes an identity-bound Vocab Check snapshot. New→Discover, unsure/failed→Strengthen, unverified Know It→light check. Verified senses provide story context without basic drills. Rank packs by eligible needs, exclude already selected senses, never synthesize classifications. One/two classified senses are valid overlaps; no overlap or all-verified overlap offers Continue Sorting. Story context can contain other approved senses but does not count as assessed coverage.

Each run pins contentSnapshot, planVersion/contentVersion, sourceLesson/revision, selected/eligible/context sense IDs, eligibility/form evidence, stable task IDs and typed draft. Resume the saved snapshot even if catalog changes; do not re-plan or overwrite history. Forms are separate evidence and must be recent, independent, identity/lesson-bound and attestable; no automatic base-sense mastery from forms.

Editorial rubric: source meaning/POS exact; natural grammar/collocation; original copyright-safe context; coherent case paragraph; one defensible MCQ key with plausible distinct distractors; hints do not give away the key; Final uses independent new-context recall with explicit variants; variants must fit number/articles/meaning; morph only with attested useful forms. Every drafted candidate is TEACHER_REVIEW for all rubric dimensions until a teacher approves that exact version.

Three planned pilots: Station Access Audit, community evening-class relocation, museum power-exhibit review. They share a delivery engine, not a story skin. `VOCAB-MISSION-COVERAGE.*` contains all 102 approved sense IDs, candidate/context/deferred/ambiguous accounting and explicit next routes. No initial candidate is published. Existing Town/Coast are legacy QA fixtures, not published catalog coverage.

Main audit: main `9536e3a022308b906975e3cbce292cf7699c8518` differs at root index, Writing Unit 0/2, backend and rules (908 insertions/337 deletions across these six paths at observation). No main code is merged or overwritten. Any root index edit in milestone B is limited to new script imports; verify the Writing block and protected sources remain unchanged before updating QA baselines.

Milestone A tests cover identity, review/publication policy and coverage accounting. B adds three complete technically validated candidates and QA-only review delivery. C audits remaining coverage/alternate routes; scaling content can be a later task. Release stays BLOCKED while required coverage or human approval is missing.
