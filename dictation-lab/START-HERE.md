# START HERE — Mini Drills Dictation Lab (R3): contract v1.1, validator and engine

Standalone package, **not integrated** into Mini Drills. Free tools only (Node 18+, Python 3). No backend, no Firebase, no Cloudflare,
no AI, no paid service. All lesson data is synthetic; no Cambridge material is included.

**Tiếng Việt, ngắn gọn:** Bản R3 làm theo chính sách chủ dự án đã duyệt: không có Gợi ý và Xem đáp án; luyện tập chỉ xem lại sau khi
Check; bài về nhà chấm trên máy chủ, máy học sinh không nhận đáp án; PASS = 70% điểm toàn bài. Mọi bài kiểm tra đều đạt
(`qa-results.md`). Giáo viên đọc `TEACHER-GUIDE.md` (cách dùng) và `TEACHER-DECISIONS.md` (việc còn phải quyết).

## Who reads what

| You are | Read |
|---|---|
| Teacher / owner | `TEACHER-GUIDE.md`, `TEACHER-DECISIONS.md` (Vietnamese), then `pkg/dictation-scoring-contract-v1.1.md` |
| Integrator (Codex) | `CODEX-HANDOFF.md`, `pkg/decision-log-v1.1.md`, `pkg/hybrid-engine/README.md`, `pkg/js-validator/README.md` |
| Reviewer / QA | `qa-results.md`, `pkg/golden-tests-v1.1/README.md`, `pkg/golden-tests-v1.1/baseline-diff.md`, `pkg/dictation-scoring-changelog.md` |

## Layout

```
START-HERE.md  CODEX-HANDOFF.md  TEACHER-GUIDE.md  TEACHER-DECISIONS.md  qa-results.md  SHA256SUMS.txt  R2-BASELINE-CHECKSUM.txt
HANDOFF-NEW-CHAT.md, src-*-checksums.txt, tools/build_golden_v2.py     history / provenance (unchanged)
pkg/
  dictation-scoring-contract-v1.1.md   normative rules (owner policy), Vietnamese
  dictation-scoring-contract-v1.md     contract v1 (history, unchanged)
  decision-log-v1.1.md                 D-12…D-32, P-01…P-06, O-1…O-4 → APPROVED / REPLACED / PENDING, with tests
  scoring-decision-matrix.md           v1 decision matrix (history)
  dictation-scoring-changelog.md       what changed, when, which tests
  golden-tests-v1.1/                   259 vectors for contract v1.1 + runner + v2 difference report
  golden-tests/                        242 vectors v2 (contract v1), unchanged
  golden-tests-original/               the 134 original vectors and spec, unchanged
  rev1-reference/                      Python reference validator + schema (Rev1, unchanged)
  js-validator/                        JavaScript validator (unchanged in R3)
  hybrid-engine/                       JavaScript engine 0.3 (+ README, browser-example.html, mutation tool)
  tools/run-all.mjs                    every check in one command
  tools/browser-selftest.mjs           example pages in a real headless Chrome/Edge + homework network scan
```

## Run everything

```bash
cd pkg
node tools/run-all.mjs                                   # both test suites, golden v1.1 + v2, v2 difference check, Python reference check
node tools/run-all.mjs --mutation --browser "C:/Program Files/Google/Chrome/Application/chrome.exe"   # everything (~10 minutes)
```

Expected: `OVERALL: PASS`. The Python-reference check needs `pip install jsonschema` (skipped otherwise).

## Status in one table

| Part | State |
|---|---|
| Teaching policy | **owner-approved** (contract v1.1 §0); human-only items open (`TEACHER-DECISIONS.md` B) |
| Golden tests v1.1 | 259 vectors; 255 runnable pass (oracle and engine); 4 UI vectors **not run** on a product UI |
| JS validator | unchanged; parity with Python 533/533 |
| Hybrid engine | draft 0.3: no hint/reveal, review gate, server-authoritative homework, PASS on the whole assignment |
| Mini Drills integration | **not started**; bounded plan in `CODEX-HANDOFF.md` §4–§6 |
| Production | **NO-GO** (not integrated; retention period and human approvals pending) |
