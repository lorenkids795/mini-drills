# Phase 2.7 — Teacher decisions handoff

The five directions and Independent Recall Option A from CODEX-PHASE-2.7-TEACHER-DECISIONS.md are applied to drafts only. All 102 items remain TEACHER_REVIEW; 0 approvals, 0 published. The approved Vocabulary Bank, source/sense IDs, Writing, access restrictions and V8 layout are unchanged.

## Changes and versions

Four routes (016, 019, 026, 029) advance from v2 to v3. Power Exhibit advances from v2 to v3 for the emissions rewrite; its four unchanged siblings share the pack version. Thus 5 senses have content revisions, 9 items have new version numbers, 93 remain v2. Original v1/v2 content and previous local review history are preserved. Loading newer catalog versions invalidates prior exact-version approvals; existing saved mission snapshots stay pinned to their original version.

Option A uses explicit reviewed answer lists. Capitals/extra spaces remain tolerated. Emissions is a narrowly scoped reviewed plural for source 055; the bank lemma remains emission. The new plural gap rejects emission, fumes, exhaust and other unlisted wording. Legacy saved v2 missions retain their singular gap and answer. Rehearsal now records retries/hints separately from first-attempt independent success; mission hint/retry/reveal semantics are preserved. No rehearsal writes student progress.

Four priority cards now ask reviewers to verify implementation at the exact version; they do not reopen the settled directions or constitute approval. Carriage still requires passage-scope verification before publication.

## Before / after

### C17-T1-R1-055 — emission

Before context: The exhibit log describes an emission of exhaust from an old engine.

After context: The exhibit log records exhaust emissions released by an old engine while it was running.

Before recall: The monitor detected an ___ of nitrogen oxides from the engine while it was running. → emission

After recall: The laboratory measured the engine's ___. These included nitrogen oxides released during operation. → emissions

### C17-T1-R1-016 — slum

Before context: The historical report used the word slum for an overcrowded district with very poor housing; the editor explains that the label must not define the residents.

After context: The historical report called the overcrowded district with very poor housing a slum. This describes housing conditions, not the worth of its residents.

Before recall: In a historical account, families shared unsafe, overcrowded urban housing. The writer labelled the district a ___; discuss the limits of this label. → slum

After recall: A historical survey described an urban district of unsafe, overcrowded homes as a ___. The label described the housing conditions, not the residents. → slum

### C17-T1-R1-019 — carriage

Before context: The museum's carriage has wheels, seats and shafts for a horse to pull it.

After context: The museum carriage has passenger seats and two shafts attached to a horse that pulls the vehicle.

Before recall: Two people climbed into the wheeled vehicle and the coachman guided the horse forward. The ___ rolled down the lane. → carriage

After recall: A horse stood between the shafts of a wheeled passenger vehicle. Once the passengers were seated, the driver guided the ___ along the lane. → carriage

### C17-T1-R1-029 — clear slums

Before context: The archive records a plan to clear slums by removing poor-quality housing; the accompanying note asks what happened to displaced residents.

After context: The historical archive records a plan to clear slums by demolishing poor-quality housing. It does not say whether residents consented or where displaced households were rehoused.

Before recall: The historical plan proposed to ___ by removing the district's poor-quality housing. It gave no account of where residents would live afterwards. → clear slums

After recall: The historical authorities planned to ___ by demolishing poor-quality housing. The record does not establish residents' consent, successful rehousing or any benefit to them. → clear slums

### C17-T1-R1-026 — solicitor

Before context: In the fictional England-and-Wales setting, the client asks a solicitor to handle legal paperwork.

After context: In England and Wales, a client asks a solicitor for legal advice on a property contract.

Before recall: In this England-and-Wales scenario, Priya needs professional legal advice on a property contract. She makes an appointment with a ___. → solicitor

After recall: In England and Wales, Priya needs professional legal advice on a property contract. She makes an appointment with a ___. → solicitor

## QA

Final full QA: PASS, 117 Node tests + 244 core assertions, 10/10 browser suites, 0 failed commands, 443 screenshots. Session phase27-teacher-decisions, full round 1. Focused editorial repair rerun also PASS at 390/768/1280 light/dark, all 87 routes and role gates. Tested base 57768755419e580d2b71f9cf2db63a3f04721ba7; working-source fingerprint 0e292d3cfe0630b411054bb63f54171f999a0e4ecdc93be74d866f2b3a518972. This final documentation-only QA update is added after the run; runtime and test sources are unchanged. Focused editorial first detected the target press inside the new instruction word expression; replaced the instruction with vocabulary taught here without weakening leakage assertions. Original failure and repair evidence remain in qa-artifacts/phase27-teacher-decisions.

## Remaining work

All 102 require item-level review; directions are not approvals. Passage scope for carriage still needs verification. Full-102 published personalized missions remain NOT_IMPLEMENTED; the 87 reviewer routes have no learner-progress writes. Real staging auth/rules remain unverified by fixture tests. Latest-main reconciliation is NOT_TESTED. No merge, deployment, real account writes, Approve or Publish was performed. The safe static preview is rebuilt by QA, not uploaded.

Field-level v2/v3 diffs: VOCAB-TEACHER-DECISIONS-CHANGES.json. Current all-102 audit/digest and QA status are updated alongside this handoff.
