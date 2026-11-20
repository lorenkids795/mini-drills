# Decision log addendum — 21/11/2026 (supersedes "pending" entries in pkg/decision-log-v1.1.md)

| Id | Decision | Status | Evidence |
|---|---|---|---|
| E-1 | Homework: no per-item Check before Submit; edit until Submit; server scores the immutable approved version; first valid submission is authoritative | APPROVED | tests/dictation-decisions.test.js E-1; tests/dictation-server.test.js |
| E-2 | Independent Answer Spotter answers protected across items; homework split in two parts | APPROVED | E-2 test (£8.50/£12 → as-005, "school groups" → as-001), browser network scan |
| E-3 | Reuse of a sentence across Levels 1–4 allowed; recorded as exposure | APPROVED | E-3 test |
| E-4 | Check shows numbers only; Review is a separate step after a valid Check / an accepted submission | APPROVED | E-4 test |
| E-5 | Edits frozen while Submit is pending; failure restores the draft; idempotent retries | APPROVED | E-5 test; ui.js `Submitting…` state |
| E-6 | Legacy `postCheckReviewUnlock` kept in files, ignored at runtime | APPROVED | E-6 test |
| P-05 | Final submitted homework answers kept 90 days, class teacher only, automatic deletion | APPROVED (90 days) | PRIVACY-RETENTION.md; tests/dictation-retention.test.js |

Engine and validator files are unchanged (still byte-identical to the R3 package); the package's golden and mutation suites still pass.
