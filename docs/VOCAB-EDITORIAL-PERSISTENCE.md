# Teacher Review — Phase 2.6 local persistence contract

The workbench is inside Library / Learning Materials / Vocabulary. Local teachers/admins can review; an ordinary tester is not a reviewer unless explicitly assigned editorialReviewer. Static preview deliberately uses separate Demo Reviewer A/B identities, never production authorization. Non-demo production persistence is disabled even for a teacher.

Local key: `md-vocab-editorial:v2:<encoded-reviewer-email>`. The archive contains immutable item revisions, current content/status, reviewer/time/version/content digest evidence, pack constituent version lists and an action audit. Existing Check and Mission namespaces are never written. Compare-and-swap under a Web Lock rejects stale-tab writes; quota/parse/version errors do not overwrite existing data.

Approving an item binds the action to its exact version and content. Edit/Replace and Apply suggested revision create a new DRAFT, retain the prior content/review history, and invalidate current approval and any pack approval referencing it. A whole pack can be approved only after every current constituent passes review and shared narrative metadata agrees. Local APPROVED is never PUBLISHED and never modifies the shipped mission catalog. No automatic bulk approval exists.

The offline revision brief is copyable JSON for manual transfer to Codex. There is no live AI request, secure backend or inferred approval. A suggested edit is validated and saved as a new draft. Exported local evidence is not a signed publication artifact.

Schema 1 archives are preserved in migration evidence; their approvals cannot grant schema 2 privileges. Unknown schemas and wrong identities fail closed. New catalog items are appended to an existing local queue without overwriting reviewed revisions. There is no import that promotes arbitrary local JSON to trusted publication.

Before real persistence: authenticate reviewers with server-verified roles, authorize every read/write, use server timestamps and immutable revisions, validate approved source IDs server-side, require explicit publication of a fully approved version, stage conflict/migration/security tests in an emulator or isolated backend, and separate QA identities/evidence from learner publication. None of these production services is enabled by this phase.

Milestone A validation: 10 focused Node tests and seven browser screenshots covering 390/768/1280 light/dark, approval/edit invalidation, reload, fix notes, manual revision brief, filters/empty state, keyboard, A/B isolation, actual Library admin/teacher paths and blocked ordinary tester/student/production mode.
