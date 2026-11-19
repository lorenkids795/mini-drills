# QA results — Dictation Lab package R3 (contract v1.1), 2026-11-18

Environment: Windows 10 Pro 10.0.19045, Node 24.20.0, Python 3.12.7 + jsonschema 4.26.0, Google Chrome 157.0.8103.79,
Microsoft Edge 157. All commands from `pkg/`. Every number below was produced in this session. Nothing here involves Mini Drills,
Firebase, Cloudflare or any network service; there is no staging URL (not integrated).

## 0. Baseline reproduced first (R2, before any change)

The R2 archive (`R2-BASELINE-CHECKSUM.txt`) was extracted to an empty folder and every file matched its `SHA256SUMS.txt`.
The R2 numbers were reproduced in the previous session from that archive (`node tools/run-all.mjs --mutation --browser …`, OVERALL PASS:
validator 15, engine 41, golden 238/238 + 4 not run, Python reference 533/533, engine mutation 32/32, browser 2/2).

## 1. One command (R3)

```bash
node tools/run-all.mjs --mutation --browser "C:/Program Files/Google/Chrome/Application/chrome.exe"
```

```
PASS  validator: npm test                                   ℹ pass 15  ℹ fail 0   (unchanged in R3)
PASS  engine: npm test                                      # golden: total=259 passed=255 failed=0 notRun(engine_ui)=4   ℹ pass 57  ℹ fail 0
PASS  golden v1.1 runner + JS adapter (contract v1.1)       integrity 15/15 · baseline 2/2 · oracle 255/255 · oracle mutation 37/37 · adapter 255 passed, 0 failed, 4 unsupported
PASS  golden v2 suite, oracle only (contract v1, unchanged)  integrity 15/15 · baseline 2/2 · oracle 238/238 · mutation 32/32
PASS  v2 suite on the v1.1 engine: only intended differences 187 passed, 51 failed (13 removed, 38 changed, 0 UNEXPECTED), 4 unsupported
PASS  python reference reproduced                            recorded=533 corpusFiles=533 reproduced=533 differ=0
PASS  engine mutation check                                  45 of 45 planted defects detected
PASS  browser self-test                                      validator page · engine page (practice) · engine page (homework) · homework network scan: 0 answer leaks
OVERALL: PASS
```

## 2. What was tested, and how

| Area | Evidence | Result |
|---|---|---|
| No hint / reveal / preview | API has no such function; `hint`, `reveal`, `preview`, `showAnswer` events → `unsupported_event`, state unchanged (practice and homework, before and after submission) | PASS |
| Review gate, practice | locked before a Check, locked after an empty/punctuation-only Check, open after a valid Check (RVU-001/002, ATS-002/003, run.test) | PASS |
| Review gate, homework | no review in draft or pending; only with the accepted acknowledgement (RVU-004…007, HWS-008/009, homework.test) | PASS |
| Independent items protected | Level 1/2 and options that would show an independent Answer Spotter answer are locked; reviews wait; homework phase 2 after the server locked phase 1 | PASS |
| Feedback before review | numbers only; no variant text, accepted form or target surface in any feedback string (scanned) | PASS |
| First valid attempt frozen | random logs (400), ATS-005, EXP-012, run.test; retries are practice | PASS |
| Scoring policy | case/punctuation ignored; apostrophes; contractions ≠ long form; s/ed/spelling wrong; `20`≠`20%`, `35`≠`£35`, `5 km`≠`5km`; reversed/inserted/deleted words; 80-word L4; declared vs misleading speaker labels (policy.test, 9 tests) | PASS |
| Input hygiene | 4000 code points accepted / 4001 rejected for Latin, Vietnamese, CJK, emoji; controls and bidi removed; hostile HTML is text; hostile response shapes never throw | PASS (one real bug found and fixed: P10 in the changelog) |
| PASS 70% | whole-assignment item-weighted, blanks 0, 69/100 fails, 70% passes, item weighting beats unit weighting (AGS-012…018) | PASS |
| Homework protocol | payload has no answer data (both phases); wrong class, no token, closed window, wrong version, unknown item, oversize, bad shape, missing key rejected; client claims ignored; tampered locked answer ignored; network failure keeps the draft; lost acknowledgement → one submission; repeat → already submitted | PASS |
| Content gate | unaudited transcript: practice only, labelled, never homework, never official; homework needs approval of the exact version | PASS |
| Minimal data | default record has scores only (no raw answers, no answer key); raw answers only with an approved retention period | PASS |
| Network-level leak check (reference page, real Chrome) | every response served to the homework page logged and scanned: 16 responses, 0 leaks before the accepted submission. **Sharpness check:** the same scan on a deliberately leaky build (phase 2 sent early) FAILED with 3 leaks (as-001, as-005) | PASS |
| Hostile text on the reference page | a `<img onerror>` prompt injected by the server renders as text, no element, no script | PASS |
| v2 regressions | all 51 v2 failures are intended (`golden-tests-v1.1/baseline-diff.md`) | PASS |

## 3. Defects found during R3

| # | Defect | Fix | Test |
|---|---|---|---|
| D1 | O-2 release blocker: homework scored on the device, so the lesson with the answer key was downloaded | server-authoritative homework (`HomeworkClient` + `scoreHomework`) | homework.test, network scan |
| D2 | Cross-item leak in the baseline: choose-option options (£8.50, £12) = the typed answers of as-005 | `discloses` + `presentBlockers` + phase plan | run.test, homework.test |
| D3 | Cross-sentence leak: Level 2 context "school groups" (s017) = the answer "groups" of as-001 (s007) | disclosure on the text actually shown | homework.test payload test |
| D4 | `check` crashed on a response whose `toString` throws | non-string values are empty text | run.test "hostile response shapes" |
| D5 | Test gaps found by the engine mutation check: lost-ack test passed by accident; no test changed a locked phase-1 answer | both tests strengthened; 45/45 | homework.test |
| D6 | The first network scan tokenised raw JSON (no spaces) and missed `£8.50` | scan each JSON string | sharpness check above |

## 4. Not tested (reported as NOT RUN, never as PASS)

| Item | Why |
|---|---|
| AS-027, SAF-001, SAF-002, SAF-003 on the **product** UI | there is no Mini Drills Dictation UI yet. The reference page checks (network scan, hostile text) are evidence about that page only |
| Mini Drills integration, Firebase Emulator rules, staging preview, production-equivalent build | not integrated; no repository change was made (see `CODEX-HANDOFF.md`) |
| Cloudflare Workers runtime | no Worker exists; the code uses no Node APIs |
| Teacher vs Homework Assistant parity, Late Pass per assignment occurrence | belong to the integration (the repo's `md-hw.js`); not part of this package |
| Free-tier cost | estimated only (`CODEX-HANDOFF.md` §4.5), not measured |
