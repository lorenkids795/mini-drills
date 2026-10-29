# CODEX — Investigate first-wrong-answer premature lock in Vocab Reality Check

Teacher reports: after ONE wrong choice in Reality Check (example "passenger"), UI showed "Needs practice", disabled all answer options, and Next check. This is unexpected for a fresh question. Do not assume teacher clicked Stuck or answered twice. Screenshot also showed a previous state with wrong option highlighted + hint and choices available.

Expected:
- Fresh question with 0 attempts.
- First wrong choice: increment tries to 1 ONLY; mark wrong option, show answer-neutral hint, keep remaining choices selectable; NO answer reveal, NO Next, NO "Needs practice" terminal feedback yet. Never count one user click twice.
- Correct after one wrong: record needs_practice as assisted, show meaningful explanation, Next enabled.
- Second wrong: terminal needs_practice with explanation and Next (as currently designed).
- First correct with no hints: verified_for_current_task.
- Hint/reveal must be explicit user actions and counted distinctly.
- Reload after first wrong: same nonterminal retry state and selected wrong option disabled only; no extra increments.
- Changing view/tab/account and storage synchronization cannot replay the click or double-dispatch it; first wrong must be exactly one attempt event.
- Check core apply(), UI event delegation and overlapping touch/click/keyboard handlers, transition/debounce, localStorage/Firestore adapter, legacy snapshots and stale state reconciliation. Identify exact reproduction and root cause; don't alter data/history silently.
- Instrument deterministic tests for first-wrong single mouse click, rapid click/touch, keyboard Enter, reload, same-question resume, tab switch, restored old snapshot, first wrong + correct, 2 wrongs, explicit reveal.
- Test both Standard 20 and Quick 12, phase flow, admin/tester demo and real app shell. Existing approval of 20/12 batch length must be preserved; leave Writing untouched.
- Report a clear distinction between genuine premature-settle bug and screenshot reflecting persisted prior attempts, and surface transparent attempt/debug counters only in isolated QA, not learner UI.
- Commit/push only feature/vocab-lab, [CF-Pages-Skip]. Build new static UI-only ZIP after test; never merge/deploy automatically. Keep offline/no-Firebase network constraints.
