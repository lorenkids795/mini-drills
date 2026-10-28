# Checkpoint A — Phase 1.1 final

Source instruction: `CODEX-PHASE-1.1-FINAL-AND-PHASE-2.md` from feature/vocab-lab, base `5ec9f6b`.

Removed the redundant In context + target label. The existing context sentence now marks exact whole-word/whole-phrase occurrences, preserving original characters, whitespace, case and punctuation. Context and target are escaped before insertion. No substring match inside pressure; missing targets and annotated/ambiguous surfaces such as pass (a proposal) fall back to plain escaped context with the target named in the question. No guessed stemming or invented surface forms.

The mark inherits readable text colour and adds bold/underline, rather than relying on colour alone. The context has an accessible name. Approved cards, options, grading, hints, save model and other modules are unchanged.

Completed before any Phase 2 implementation:

- 3 highlighting regression cases PASS: repeated word/case/punctuation; multiword/whitespace/boundaries; absent/ambiguous target and untrusted HTML fallback.
- 15 Vocab Check model/adapter tests PASS; all 244 existing project checks PASS.
- 36 browser viewport/theme/state checks PASS, including highlight text/accessible context and contrast >=4.5:1 at 390/768/1280 in both themes.
- Browser regressions for undo, double-click, reload, old/new questions, reduced motion and account separation PASS.
- git diff --check PASS. No Writing/LM/auth, nested copy, bank, store or Firestore rules changes.

Screenshots and full browser log are exported under outputs/vocab-checkpoint-a in this chat workspace. Firebase tests remain doubles/static tests, not production/emulator integration. No merge or deploy.
