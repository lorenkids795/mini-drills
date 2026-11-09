# Metadata-Only Probe — ADC review and finalization

Date: 2026-11-09 (Asia/Saigon).
Base commit: 5d3707c253310f006974fcdef1c5df13da1d304f.
This document finalizes the offline design only. It does not approve login, token minting, IAM/API changes or a live request.

## Difference from the earlier CLI plan

Earlier proposal: obtain a token through gcloud CLI impersonation without preparing an application ADC file. The delivered probe does not invoke gcloud, discover default credentials, accept a bearer token from the caller or depend on a CLI access-token cache.

Current design: after a separate approval, an operator supplies the explicit path to an impersonated-service-account ADC JSON outside the repository. The probe validates that envelope and performs the credential exchanges directly over HTTPS. ADC is not a private key, but it contains a sensitive human refresh token and OAuth client fields. This new credential-preparation step requires separate approval.

## Two exchanges and the final GET

| Step | Source identity / input | Fixed destination | Output and permitted use |
|---|---|---|---|
| 1 | Human operator represented by source_credentials.refresh_token, with OAuth client ID/secret | POST https://oauth2.googleapis.com/token | Short-lived source-user access token; used only for step 2 |
| 2 | Source-user token from step 1 | POST IAMCredentials generateAccessToken for vocab-spark-runtime@mini-drills-vocab-staging.iam.gserviceaccount.com | Target service-account access token, requested lifetime 600 seconds, datastore scope, delegates [] |
| 3 | Only the target token returned by step 2 | GET https://firestore.googleapis.com/v1/projects/mini-drills-vocab-staging/databases/(default) | Sanitized database metadata summary |

Each CLI invocation attempts at most one request per stage, stops on the first error, and performs zero or one Firestore metadata GET. There is no retry, redirect following, alternate resource or fallback. Re-running the CLI would be a new run; there is no persisted lifetime-wide one-shot counter.

The source token never reaches Firestore, even when the human operator happens to be a project Owner. The effective identity for the GET is the pinned service account. An OAuth access token is opaque: regex checks establish safe formatting, not identity. Provenance comes from accepting only the fresh response of the pinned IAMCredentials endpoint over certificate-verified HTTPS.

The ADC file does not establish the human operator's email offline. The selected operator and authorization of their refresh token must be confirmed during separately approved credential preparation. No such verification has been performed.

## Required permissions and prerequisites

- The human/source principal needs iam.serviceAccounts.getAccessToken on the target service account, normally granted by roles/iam.serviceAccountTokenCreator on that individual account, not across the project.
- The target service account needs datastore.databases.getMetadata on the isolated staging project/database. The supplied confirmation says this is its only custom-role permission; live effective bindings are NOT_TESTED.
- The source refresh token must remain valid and have suitable Google API authorization for the IAMCredentials exchange.
- IAM Service Account Credentials API and Firestore API must already be enabled before an approved run. The probe cannot enable them.
- No datastore.entities.get/list/create/update/delete, Firebase Auth user permissions, IAM-management role, Owner or Editor is required on the target account.
- OAuth datastore scope does not itself grant document access; IAM permissions still govern authorization.
- quota_project_id must equal the staging project. The probe does not send X-Goog-User-Project or silently grant serviceusage.services.use. Any quota/permission error stops for review.

Official references: [Impersonation](https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation), [generateAccessToken](https://docs.cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/generateAccessToken), [Firestore IAM](https://firebase.google.com/docs/firestore/security/iam).

## Storage and leak prevention

The future ADC file must remain at an explicitly approved path outside the repository, with Windows ACL restricted to the operator and necessary administrators. loadCredential resolves real paths, rejects paths inside this repository, bounds file size and rejects unsupported fields/types. It does not discover global ADC or read a file in default --plan mode.

No real ADC was read, written or created during implementation/finalization. No private key was created. Synthetic test strings are not usable credentials.

During a future approved run, both access tokens stay in process memory and are not placed in stdout, stderr, log files or output artifacts. The probe has no file-write operation. It returns only allowlisted metadata or a fixed error code; raw Google error bodies are discarded. Token arguments, credential overrides, debug/TLS/proxy environment overrides, direct-user ADC and service-account keys are rejected.

The external ADC refresh token remains a disk secret. Preparation tools may maintain their own credential cache. JavaScript cannot guarantee zeroization, and the probe does not control OS swap, crash dumps or hostile local instrumentation. The no-token-persistence claim applies to the probe's own behavior.

## Offline finalization checks

- 22/22 mock tests PASS; source and raw evidence hashes match the reviewed implementation.
- Existing application adapter, Web Auth client, synthetic runner and all other previously tracked files are unchanged.
- The only Firestore operation exposed by the delivered CLI is the exact metadata GET above.
- No document/collection reads, data writes, user creation, IAM-policy changes, private-key creation or API enabling are supported.
- No production data or sensitive backup artifact is included. The 102 real entries remain untouched; their last verified baseline is 102 Pending / 0 Approved / 0 Published.
- Four handoff documents: OFFLINE-HANDOFF.md, OFFLINE-QA.json, WINDOWS-RUNBOOK.md and this ADC-REVIEW.md, all with the METADATA-PROBE prefix.
- Earlier uncommitted/pushed:false statements in the QA/handoff describe the pre-finalization snapshot; consult Git history and remote refs for the current packaging status.

Live metadata, IAM, actual ADC compatibility, billing and deployed Rules remain NOT_TESTED. Approval to commit/push this offline implementation does not authorize any live test.
