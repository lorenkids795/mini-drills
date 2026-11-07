# Synthetic staging plan — NOT provisioned

This is a reviewable plan only. No Cloudflare/Firebase project, binding, secret, IAM grant, deploy hook or public environment has been created. The owner subsequently confirmed saved Cloudflare production branch main / preview branches None and authorized this integration-branch-only push. That authorization does not provision or deploy staging.

## Prerequisites before any push or deployment

1. Owner verifies every connected deployment provider and webhook, including Cloudflare production and preview branch controls. Explicitly exclude `integration/vocab-lab-candidate-2026-11-07`, or confirm that the projects are Direct Upload with no Git/webhook pipeline. No workflow files, no Actions runs and `[CF-Pages-Skip]` alone do not prove external auto-deploy safety.
2. Record current configuration evidence and obtain authorization for committing/pushing this branch. Do not modify main/feature, create a PR or enable auto-merge. Any later deployment requires separate approval.
3. Review the API, Library integration and exact asset manifest, QA exceptions, and pending editorial content. A successful emulator run does not approve lessons or authorize publication.

## Proposed isolated environment

- Dedicated staging host, Firebase project and Cloudflare project; no production project IDs, service accounts, bindings, collections, domains or exports. Project names, billing owner and limits must be approved before creation. Never add a production fallback.
- Restrict access to a named test cohort. Use synthetic identities such as `*@local.invalid`, synthetic classes and newly generated fixture records only. No real student enrolment, logs, passwords, emails, progress or lesson decisions are imported.
- Default all 102 Vocab items to draft/pending. Any test-only approval/publication is fixture-scoped, explicitly labelled and removed after the run; it cannot become an actual teacher decision.
- No paid AI requests. Mock Reading generation and its truncation/split responses until a separate provider/cost approval exists. Initially cap the cohort at 5 staff and 10 synthetic learners, 102 content items, 87 route checks per smoke cycle, and a bounded three-run repair budget. Establish platform spending alerts and an operator stop procedure before provisioning; do not promise that a free tier prevents charges.

## Real-auth adapter design to validate

- Main issues a Firebase custom token; the staging backend must verify the resulting ID token's signature, issuer, audience, expiry and subject for the staging project. Do not accept a custom token itself as the API bearer credential.
- Resolve current UID/account status, server-side role, teacher assignment, tester flag and student enrolment at every privileged operation. Map main `teacher + adm` to the staging admin capability only after authoritative checks; a browser `U.tester`, display name, email-only key or forged role must never grant review/publication.
- Keep preview access separate from reviewer and publisher permissions. Testers can preview but cannot approve/publish; assigned teachers can review exact versions; publication is a separate authorized admin operation. Ordinary students remain denied experimental Library/Writing previews.
- Bind Teacher Review decisions to immutable item ID, version and content hash with idempotent operation IDs and an append-only audit trail. A draft revision invalidates the prior current approval/publication pointer; old learner sessions retain pinned versions according to the existing contract.
- Bind progress/session/event paths to authenticated UID, lesson/sense/version and task. Server grades independently of client correctness fields. Preserve optimistic concurrency, retries, hint/reveal evidence, Independent Recall Option A and the five agreed vocabulary decisions. Do not fabricate Word Morph evidence for the 87 routes lacking authored morphology.
- Check disabled/revoked/de-enrolled accounts on the server; separately test the token-expiry/revocation behaviour of any direct Firestore reader. Emulator tokens are unsigned, so deployed signed-token/IAM checks remain outstanding.

## Rules, IAM and validation

- Separate least-privilege identities for staging serving, fixture provisioning and deployment. No shared production service account or broad owner/editor role. Secrets belong in the approved staging secret store, never the repository or browser bundle.
- Preserve current main rules until a separately reviewed adapter/rules proposal exists. Staging should deny client writes to decisions, private drafts, grading keys and authoritative progress. Permit only assigned staff reads, public metadata and the authenticated student's own allowed progress. Review rules and server permissions together.
- Automated negative cases: wrong-project/signed-invalid/expired tokens; forged role/UID; paused/revoked users; removed teacher assignment; tester escalation; student A reading/writing B; stale version/hash; duplicate operation; concurrent tabs/devices; network failure/retry; draft superseding publication; all 87 routes reload/recovery; no answer leakage in active Independent Recall.
- Retain local Emulator QA as a fast gate, then run the same contracts against the authorized synthetic staging deployment. Confirm actual browser Library mount/back, sign-out/account switching and Writing preview gates there. Do not label the current local QA as deployed staging verification.

## Rollback and shutdown

- Before any future rollout, record immutable source/artifact/config/rules versions and a synthetic-only snapshot. Keep an operator-controlled kill switch for staging access and writes.
- On failure, stop staging traffic/writes, restore the prior reviewed artifact/config/rules in the isolated project, and verify integrity/idempotency before resuming. Never repair by copying production data or resetting main/feature.
- Keep synthetic logs free of tokens/PII; proposed retention is seven days after review. Deletion/cleanup of staging fixtures requires the separate approved staging policy. Current application's Cleanup remains read-only; destructive routes are not restored.
- A future main merge, production migration or deployment is outside this plan and requires explicit new authorization after technical and teacher editorial gates pass.
