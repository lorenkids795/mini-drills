# Dictation Lab — raw-answer retention (P-05, approved: 90 days)

Owner decision (11/2026, option B): keep a student's **final submitted homework answers** for at most **90 calendar days** from the
server-accepted submission, visible only to the teacher of that class, then delete them automatically.

## What is stored

| Data | Where | How long |
|---|---|---|
| Final submitted answers, as display text (Level 1 tiles become their words) | `dlRaw/{slug(email)}_{asg}_{ex}` `{email, cls, asg, ex, ver, answers, submittedAt, expMs, expiresAt}` | `expMs = submittedAt + 90 days` (UTC milliseconds, server clock). Never extended |
| Score record, per-item result, answer key of the version | `dlSubs/…`, `attempts/…` | like every other attempt (no raw text) |
| Part-1 answers of a two-part homework | `dlSits/….lock` | wiped when the homework is submitted; an abandoned sitting is wiped 90 days after the lock (`rawExp`) |
| Drafts, keystrokes, audio, practice answers | device only (draft in localStorage until submit) | never on the server |
| The student's own copy of their final answers | device localStorage (`md-dlhw:…:done`) | dropped after 90 days on that device |

Not stored: anything when `DL_RAW_RETENTION` is not `on` (default = fail closed). No raw answers in logs, URLs, query strings, analytics or
error messages (the Dictation server part has no `console` calls; the cleanup records only an error message, never data).

## Who can read it

`POST /api/dictation/raw {op:'list', exId}` with a staff key. Checked on every request from server records only: the staff key is still
valid and the account is still a teacher (removed / paused teachers get 401); the student's **current** roster row exists (Kick = gone),
is in the class of the submission's assignment, is not in `classes.removed`; the assignment still belongs to that class and still contains
the exercise; and the roster "Giáo viên" of that student equals the teacher's account name (same normalisation as the app). Ids sent by
the client are ignored. **Exception (documented):** the admin account (owner) sees every class for diagnosis. Homework Assistants,
students and signed-out users cannot call it. A student sees their own result after submitting (no access to classmates).

## Deletion

* Read path: a row whose `expMs <= now` is never returned (the teacher sees "answer details expired", the score stays) and is deleted at
  once, even if the scheduled cleanup is late.
* Automatic cleanup: Cloudflare Pages Functions have no cron trigger, so the cleanup runs from `GET /api/status`, which every signed-in
  app calls every 10 minutes. At most once an hour (KV `dlreap:last`), after the reply (`waitUntil`), it deletes up to 200 expired
  `dlRaw` rows and wipes up to 200 expired `dlSits` locks; if a batch is full or the run failed, the next status call runs again.
  Idempotent. **Limit:** if nobody uses the site, nothing runs; rows past expiry stay in Firestore (never shown) until the next visit.
* Manual: `POST /api/admin/dictation {op:'reap'}` (5 × 300 per call) and `{op:'retention'}` (on/off + last run) for missed runs and
  monitoring.
* Optional second layer: a Firestore TTL policy on `dlRaw.expiresAt` (a timestamp field). Check in the Firebase Console whether your
  plan allows it and what it costs before relying on it; it is not configured by this code.
* Kick deletes `dlRaw`, `dlSubs`, `dlSits` of the student with the rest of their learning data.
* Backups / exports: the project has no automatic Firestore export configured by this code; if one is added later, its own retention
  applies and must be at most 90 days for these rows.

## Cost (estimate, not measured)

One extra Firestore write per accepted homework submission; teacher list = 1 query + ~3 reads per submission (cached per student /
assignment / class); cleanup = 2 small queries per hour while the site is used, plus one delete per expired row. Free tier.

## Deployment status

Code and tests are on branch `feature/dictation-lab`. **Not deployed to production. Not switched on anywhere** until
`DL_RAW_RETENTION=on` is set by the owner. No Firestore TTL policy has been configured.
