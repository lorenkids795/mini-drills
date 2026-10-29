# CODEX ADDENDUM — Remove Save the Coast from the learner-facing Vocab Lab

Teacher decision: Save the Coast is an independent authored DEMO only, not the actual personalized mission generated from approved Cambridge lesson vocabulary and learner classifications. It should NOT appear as a selectable mission in Mini Drills Library > Learning Materials or the online UI-only preview's normal learner path.

Requirements:
1. Under Library > Learning Materials > Vocab Lab, display a single real learner route: Vocab Check -> Personalized Mission derived from the user's actual classified approved passage terms. Keep progression inside the learning flow, not a list of fixed unrelated stories.
2. Hide/remove the Save the Coast sidebar/menu/card/CTA from all learner/tester normal navigation and from the static UI preview default interface. No misleading fixed demo as a real mission.
3. PRESERVE Save the Coast *as a clearly marked internal QA fixture* in code/tests or dedicated developer-only local preview when useful for regression testing of five-sentence Case File, Word Morph and Final Report. It must not write to approved Cambridge P1 bank or affect real learner evidence. Do not erase tests just because the demo is hidden.
4. Town on the Move is likewise an authored fixed P1-linked *prototype scenario* for five approved terms, not an engine covering all 102 words. Avoid promising that all learner missions already exist. Show only genuinely eligible linked mission if actual classified sense IDs are available; otherwise present clear honest 'No mission available for these words yet' (or offer Continue Sorting), without synthetic filler.
5. Do not implement a fake generative pipeline or accidentally mix curated demo terms into approved 102 entries. Future automatic personalized mission content generation requires separate design/editorial approval.
6. Keep UI-only static preview self-contained/offline, fixture identities only; no Firebase or production API. Maintain current network security allowlist, responsive real-Library shell, Writing unchanged, and no Vocab Lab top-level sidebar item.
7. Update browser/Node tests for hidden demo, valid Check→eligible mission→Sorting, no eligible mission state, and preservation of internal QA fixture; build a versioned UI-only ZIP and report changes.
8. Commit/push only feature/vocab-lab using [CF-Pages-Skip]; no main merge or Cloudflare deploy.

Read this alongside docs/CODEX-VOCAB-LAB-INSIDE-LIBRARY.md and follow teacher's latest decision over earlier suggestions to list Save the Coast publicly.
