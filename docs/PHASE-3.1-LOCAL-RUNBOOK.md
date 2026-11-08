# Phase 3.1 — local/emulator operator runbook

Only branch `integration/vocab-lab-candidate-2026-11-07`. This is not a cloud adapter or a deployment. No billing, project provisioning, production credentials or Spark connection is implemented.

## Scope and boundaries

- `staging/phase31/fixtures.cjs`: eight invented items, four per lesson (`fx31_alpha`, `fx31_beta`), two route kinds. No real catalog item is copied or published.
- `runtime.cjs`: isolated `vocab31_fixture_runs/{runId}/lessons/{lessonId}/...` data scope. The HTTP client cannot select a database, namespace or lesson. Start another local server for another lesson.
- `server.cjs`: loopback UI/API on port 18788 by default. Only three static assets are served. No startup seeding. `/staging-health` reports emulator identity, selected run/lesson, Firestore run readiness and write lock; it is not a claim of cloud/Auth readiness.
- `operator.cjs`: explicit init, lock/unlock, snapshot and restore. No HTTP provisioning or lock-control endpoint.
- `backup.cjs`: recursive synthetic-only logical snapshot. Restore creates a new, write-locked run atomically.
- The shared service accepts an optional domain argument; existing callers retain their original domain by default. Root Library, Writing, Vocab assets, root Worker and root Firestore Rules are unchanged.

## Start cached emulators

Run from the integration worktree. Node 22+, Java 21+, the pinned emulator runtime and Playwright/Edge are prerequisites. No package installation or download is part of this runbook's execution commands.

For this existing worktree, cached runtimes are available three levels above it:

```powershell
$env:VOCAB_EMULATOR_RUNTIME=(Resolve-Path ../../../tools/emulator-runtime).Path
$env:VOCAB_QA_RUNTIME=(Resolve-Path ../../../tools/qa-runtime).Path
$env:JAVA_HOME=(Get-ChildItem "$env:VOCAB_EMULATOR_RUNTIME/java" -Directory | Select-Object -First 1).FullName
$env:PATH="$env:JAVA_HOME/bin;$env:PATH"
$env:FIREBASE_CLI_DISABLE_TELEMETRY='1'
$env:CI='1'
$env:NODE_OPTIONS='--require ./tools/phase3-loopback-preload.cjs'
node "$env:VOCAB_EMULATOR_RUNTIME/node_modules/firebase-tools/lib/bin/firebase.js" emulators:start --config staging/firebase.json --project demo-mini-drills-vocab-test --only auth,firestore
```

Use a separate PowerShell terminal, also in the integration worktree:

```powershell
$env:VOCAB_EMULATOR_RUNTIME=(Resolve-Path ../../../tools/emulator-runtime).Path
$env:VOCAB_QA_RUNTIME=(Resolve-Path ../../../tools/qa-runtime).Path
$env:GCLOUD_PROJECT='demo-mini-drills-vocab-test'
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:18080'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:19099'
node tools/phase31-qa.cjs unique-run-name
```

The QA runner refuses existing evidence directories, records source hashes before/after, uses unique synthetic run/account IDs and does not wipe the emulator database. If the retained catalog is absent, it creates only local DRAFT copies of the 102 source items; it never reviews or publishes them. Existing non-DRAFT catalog state causes QA to stop rather than reset it.

## Manual fixture UI

With the same emulator environment:

```powershell
node staging/phase31/operator.cjs init fx31_manual_001
node staging/phase31/server.cjs fx31_manual_001 fx31_alpha
```

Open `http://127.0.0.1:18788`. Init prints newly generated emulator-only account passwords to the operator terminal. Do not commit them or reuse them for Spark. The UI is clearly labelled synthetic and is not integrated into production Library.

Admin and assigned Teacher can review. Only Admin can publish a fixture. A Student needs server-owned tester membership and lesson/class enrolment. A Tester-only identity has no reviewer or learner privileges. The server re-resolves current Auth/roster on each API request. Sign-out clears the UI/token; 401/403 clear sensitive rendered content. Tokens live in browser memory, so refresh requires sign-in again.

## Write lock and logical backup

```powershell
node staging/phase31/operator.cjs lock fx31_manual_001
node staging/phase31/operator.cjs snapshot fx31_manual_001
```

The snapshot command prints the new JSON file path under ignored `qa-artifacts/phase31/backups/`. Writes must remain locked throughout traversal. API write transactions read the run lock; a concurrent lock update forces transaction revalidation. Keep operator provisioning closed during snapshot. Snapshot verifies the lock document's update time did not change during traversal.

Restore using that exact snapshot path:

```powershell
node staging/phase31/operator.cjs restore fx31_manual_restored <snapshot-file>
```

Restore rejects the source run, an existing destination, unknown paths, duplicate paths, checksum errors, missing versions and broken session references. It preserves nested sessions/events/operations/progress. Its 440-document ceiling leaves room for one atomic Firestore batch; exceeding the ceiling fails rather than partially restoring. This bounded limit is intentional for these small fixtures.

Supported data are the fixture schema's JSON values, including numeric millisecond timestamps. Unsupported Firestore types are rejected explicitly, not silently converted. This is not a general-purpose Firestore export utility.

After validating the restored run and signing in:

```powershell
node staging/phase31/operator.cjs unlock fx31_manual_restored
node staging/phase31/server.cjs fx31_manual_restored fx31_alpha
```

Firebase Auth users/passwords/refresh tokens are **not** backed up. The snapshot retains synthetic roster and assignments. Restore/resume is tested with the same emulator Auth users still present. Recreating Auth after complete emulator loss is a separate operator step; do not claim full Auth disaster recovery. No Spark managed export/import, PITR or cloud restore exists here.

## Rollback and shutdown

1. Lock the run and stop the local backend.
2. Preserve failed-run evidence and snapshot files.
3. Select a previously reviewed local artifact and compatible fixture run, or restore a snapshot into a new run.
4. Verify state/resume/idempotency before unlocking.
5. Stop emulators with Ctrl+C. Never reset main, remove the worktree, or copy production data.

No fixture deletion command or real-data purge capability is added. The disposable emulator data are not a durable service; keep the logical snapshot if the run must be retained.

## Remaining gates

Spark project creation, credentials, real Auth/IAM, two physical devices/LAN HTTPS, and all cloud deployment behavior are NOT_TESTED/DEFERRED. Two isolated browser contexts are not two physical devices. No old full Main QA rerun is needed for unchanged root runtime files. Phase 3.1 does not resolve existing Main QA policy/editorial failures.
