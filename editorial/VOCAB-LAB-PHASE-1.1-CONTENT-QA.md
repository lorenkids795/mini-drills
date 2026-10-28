# Reality Check Phase 1.1 — editorial QA register

All 102 current P1 practice items were inspected against their approved contextual senses: natural English, intended sense, one defensible key, plausible near-miss distractors, answer-neutral clues and explanations that teach a distinction. This is an agent editorial review, **not teacher approval**. Original full Cambridge passages were not supplied; alignment was checked against the approved bank's source-linked senses, not independently against the full published passage.

All current items have `editorialStatus: reviewed_pending_teacher`, `version: 2`. The 102 approved terms/priorities and pending P2 bank are unchanged. No extra flag below means no additional ambiguity was identified during this review; it does not mean teacher-approved.

## Summary

- 102/102 items reviewed and changed.
- 102 items: `options` changed.
- 102 items: `explanation` changed.
- 34 items: `clue` changed.
- 2 items: `context` changed.
- 20 items have additional focused teacher-review flags; all 102 await approval.

The `overcrowded` context and its people/space clue are retained. Its distractors now distinguish comfortable busyness and appointment delays from excessive people per unit of space. `succeed` retains its natural preparation context, replaces the answer's awkward It reference with The team, and now explains achieving a result and the pattern succeed in doing something.

Two definition-like contexts (`boiler`, `ventilation shaft`) were replaced with natural scenarios. Technical/general-sense and culturally sensitive wording is flagged below rather than represented as certain expert approval.

## Compatibility and evidence

Question IDs now use `context-v2`. Correct-answer positions remain unchanged. Original Phase 1 questions are archived byte-for-byte in `data/vocab-lab-practice-v1.json`. If a saved batch already has an attempt on a v1 question, the UI pins that question to its v1 context and options across reload. Answer-neutral hints and the improved explanation are applied to the same sense, including resumed questions; hint/retry flags remain preserved. Existing results/attempts are never rewritten. An explicit fresh revision of the word starts v2.

The Phase 1 core hardcoded context-v1 into evidence even if the practice item's actual ID differed. The narrow core fix uses the actual answered item's ID for evidence on success/retry/reveal. This is required to avoid attributing new content to old evidence; there is no Firestore schema, rules or store change. Regression tests cover both versions and legacy resume.

## Items needing focused teacher review

- **overground railway** (C17-T1-R1-005): terminology: generic overground, not a branded operator.
- **capital** (C17-T1-R1-009): polysemy: main city definition should be read as seat of government.
- **slum** (C17-T1-R1-016): sensitive terminology: teacher should confirm classroom wording.
- **carriage** (C17-T1-R1-019): polysemy: workbook combines train coach and horse-drawn vehicle.
- **scheme** (C17-T1-R1-021): regional sense: neutral British-English scheme.
- **solicitor** (C17-T1-R1-026): jurisdiction: source sense is England and Wales.
- **clear slums** (C17-T1-R1-029): sensitive redevelopment terminology and social impact.
- **critical** (C17-T1-R1-047): polysemy: distinguish critical of from critical to.
- **cut and cover** (C17-T1-R1-069): technical terminology: teacher review recommended.
- **timber beam** (C17-T1-R1-073): technical building term: teacher review recommended.
- **brick arch** (C17-T1-R1-074): technical building term: teacher review recommended.
- **steam locomotive** (C17-T1-R1-080): technical railway term: teacher review recommended.
- **boiler** (C17-T1-R1-081): technical sense: not all boilers are steam generators.
- **fumes** (C17-T1-R1-085): health wording: strong fumes are not all equally toxic.
- **ventilation shaft** (C17-T1-R1-086): technical building term: teacher review recommended.
- **confined space** (C17-T1-R1-090): technical safety term: everyday meaning, not a legal definition.
- **electric motor** (C17-T1-R1-092): technical device term: teacher review recommended.
- **transfer power** (C17-T1-R1-094): technical wording: power/energy distinction for source-level paraphrase.
- **generator** (C17-T1-R1-095): technical device term: teacher review recommended.
- **deep-level electric railway** (C17-T1-R1-096): technical railway terminology: teacher review recommended.

## Full 102-item change log

Each row records the changed learner-facing fields and the specific editorial rationale. All 102 still await teacher sign-off before broad student release. Reviewed overrides are in `editorial/vocab-lab-review.tsv`; the deterministic builder applies them to the scenario source TSV.

| Source | Term/expression | Changed fields | Editorial rationale | Extra teacher flag |
| --- | --- | --- | --- | --- |
| C17-T1-R1-001 | astonishing rate | options, explanation | Distinguish rate from total and variation. | No extra flag; teacher approval pending |
| C17-T1-R1-002 | increasingly | options, explanation | Separate a trend from an initial condition. | No extra flag; teacher approval pending |
| C17-T1-R1-003 | congested | options, explanation | Movement restriction versus administrative closure. | No extra flag; teacher approval pending |
| C17-T1-R1-004 | expansion | options, explanation | Size/capacity distinguished from replacement. | No extra flag; teacher approval pending |
| C17-T1-R1-005 | overground railway | options, explanation | Avoid a bus-versus-rail giveaway; review British railway terminology. | terminology: generic overground, not a branded operator |
| C17-T1-R1-006 | network | options, explanation | Connected system versus single route. | No extra flag; teacher approval pending |
| C17-T1-R1-007 | result in | options, explanation | Test causal direction, not unrelated vocabulary. | No extra flag; teacher approval pending |
| C17-T1-R1-008 | passenger | options, explanation | Traveller versus crew or greeter. | No extra flag; teacher approval pending |
| C17-T1-R1-009 | capital | options, explanation | Retain source city sense; avoid equating capital with largest city. | polysemy: main city definition should be read as seat of government |
| C17-T1-R1-011 | historic | options, explanation | Distinguish historic from historical. | No extra flag; teacher approval pending |
| C17-T1-R1-012 | form a ring | options, explanation | Use plausible audience arrangements. | No extra flag; teacher approval pending |
| C17-T1-R1-013 | consist of | options, explanation | Part/whole relationship and consist of structure. | No extra flag; teacher approval pending |
| C17-T1-R1-014 | poorly built | options, explanation | Quality versus age and completion. | No extra flag; teacher approval pending |
| C17-T1-R1-015 | overcrowded | options, explanation | Retain teacher-approved context and answer-neutral people/space clue. | No extra flag; teacher approval pending |
| C17-T1-R1-016 | slum | options, explanation | Preserve Supporting priority; describe housing conditions without labelling residents. | sensitive terminology: teacher should confirm classroom wording |
| C17-T1-R1-017 | horse-drawn | options, explanation | Physical role of drawn in a compound adjective. | No extra flag; teacher approval pending |
| C17-T1-R1-018 | nightmare | options, explanation | Figurative sense versus literal dream. | No extra flag; teacher approval pending |
| C17-T1-R1-019 | carriage | options, explanation | Clarify train sense within workbook's broader carriage entry. | polysemy: workbook combines train coach and horse-drawn vehicle |
| C17-T1-R1-020 | numerous | options, explanation | Quantity versus frequency/diversity. | No extra flag; teacher approval pending |
| C17-T1-R1-021 | scheme | options, explanation | Replace absurd distractors; flag regional connotation. | regional sense: neutral British-English scheme |
| C17-T1-R1-022 | propose | options, explanation | Contrast suggestion, authorisation and execution. | No extra flag; teacher approval pending |
| C17-T1-R1-023 | resolve | options, explanation | Problem-solving stages as distractors. | No extra flag; teacher approval pending |
| C17-T1-R1-024 | succeed | options, explanation | Replace awkward It/team reference and answer-echo explanation. | No extra flag; teacher approval pending |
| C17-T1-R1-025 | vocal advocate | options, explanation | Public support versus private agreement/reporting. | No extra flag; teacher approval pending |
| C17-T1-R1-026 | solicitor | options, explanation | Plausible property professionals rather than builder/reporter. | jurisdiction: source sense is England and Wales |
| C17-T1-R1-027 | social and economic advantages | options, explanation | Require both parts of the phrase. | No extra flag; teacher approval pending |
| C17-T1-R1-028 | link together | options, explanation | Relationship rather than general improvement. | No extra flag; teacher approval pending |
| C17-T1-R1-029 | clear slums | options, clue, explanation | Avoid implying a social benefit or residents' consent from clearance alone.; hint revised to a contextual cue without a defining synonym | sensitive redevelopment terminology and social impact |
| C17-T1-R1-030 | relocate | options, clue, explanation | Location versus internal changes.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-031 | inner-city | options, explanation | Location rather than audience. | No extra flag; teacher approval pending |
| C17-T1-R1-032 | newly constructed | options, explanation | Repair and approval are plausible near misses. | No extra flag; teacher approval pending |
| C17-T1-R1-033 | suburb | options, explanation | Geographical relation to centre. | No extra flag; teacher approval pending |
| C17-T1-R1-034 | provide | options, explanation | Supply versus recommend/check. | No extra flag; teacher approval pending |
| C17-T1-R1-035 | gain support | options, explanation | Approval versus awareness. | No extra flag; teacher approval pending |
| C17-T1-R1-036 | submit a plan | options, explanation | Process sequence and collocation. | No extra flag; teacher approval pending |
| C17-T1-R1-037 | reject | options, explanation | Refusal versus delay/conditional approval. | No extra flag; teacher approval pending |
| C17-T1-R1-038 | coincide with | options, explanation | Time relation, not personnel or sequence. | No extra flag; teacher approval pending |
| C17-T1-R1-039 | proposal | options, explanation | Plan versus implementation/contract. | No extra flag; teacher approval pending |
| C17-T1-R1-040 | pass (a proposal) | options, explanation | Procedural approval versus transmission. | No extra flag; teacher approval pending |
| C17-T1-R1-041 | merge | options, explanation | Merger versus collaboration and split. | No extra flag; teacher approval pending |
| C17-T1-R1-042 | establish | options, clue, explanation | Founding versus promotion/occupation.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-043 | construct | options, explanation | Physical building versus adjacent tasks. | No extra flag; teacher approval pending |
| C17-T1-R1-044 | raise funding | options, explanation | Financing versus budgeting. | No extra flag; teacher approval pending |
| C17-T1-R1-045 | radical | options, explanation | Degree of change within architecture. | No extra flag; teacher approval pending |
| C17-T1-R1-046 | not least because of | options, clue, explanation | Emphasis without unsupported exclusivity.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-047 | critical | options, explanation | Intended evaluative sense of critical of. | polysemy: distinguish critical of from critical to |
| C17-T1-R1-048 | press | options, explanation | Same topic, different communication roles. | No extra flag; teacher approval pending |
| C17-T1-R1-049 | objector | options, explanation | Opposition versus neutral enquiry/qualified support. | No extra flag; teacher approval pending |
| C17-T1-R1-050 | argue | options, clue, explanation | Academic reporting verb, evidence versus quotation.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-051 | collapse | options, explanation | Failure versus less severe damage. | No extra flag; teacher approval pending |
| C17-T1-R1-052 | overhead | options, explanation | Source physical sense; preserve alternative cost as plausible distractor. | No extra flag; teacher approval pending |
| C17-T1-R1-053 | shake | options, explanation | Movement type and grammatical subject. | No extra flag; teacher approval pending |
| C17-T1-R1-054 | poison | options, clue, explanation | Toxic harm without adding unsupported mechanism.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-055 | emission | options, explanation | Released substances versus indoor production/cleanup. | No extra flag; teacher approval pending |
| C17-T1-R1-056 | persist | options, explanation | Continuation despite obstacles rather than mere repetition. | No extra flag; teacher approval pending |
| C17-T1-R1-057 | enable | options, clue, explanation | Possibility versus encouragement/obligation.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-058 | invest | options, explanation | Commitment versus estimate or loan of equipment. | No extra flag; teacher approval pending |
| C17-T1-R1-059 | eventually | options, explanation | End of a sequence versus frequency. | No extra flag; teacher approval pending |
| C17-T1-R1-060 | route | options, explanation | Path versus measurement/schedule. | No extra flag; teacher approval pending |
| C17-T1-R1-061 | beneath | options, clue, explanation | Vertical position relative to a reference.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-062 | minimise | options, clue, explanation | Reduction versus management or stability.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-063 | expense | options, clue, explanation | Cost versus workload and income.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-064 | demolish | options, explanation | Destruction versus renovation/relocation. | No extra flag; teacher approval pending |
| C17-T1-R1-065 | originally scheduled | options, clue, explanation | Initial, final and actual dates distinguished.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-066 | construction | options, clue, explanation | Planning, building and operation sequence.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-067 | street level | options, explanation | Elevation versus orientation/access route. | No extra flag; teacher approval pending |
| C17-T1-R1-068 | technique | options, explanation | Method versus tools and outcome. | No extra flag; teacher approval pending |
| C17-T1-R1-069 | cut and cover | options, clue, explanation | Plausible tunnel methods; preserve technical definition.; hint revised to a contextual cue without a defining synonym | technical terminology: teacher review recommended |
| C17-T1-R1-070 | trench | options, explanation | Shape-based spatial distractors. | No extra flag; teacher approval pending |
| C17-T1-R1-071 | temporarily | options, explanation | Duration versus permanent/indefinite arrangement. | No extra flag; teacher approval pending |
| C17-T1-R1-072 | hold up | options, clue, explanation | Source physical-support sense of phrasal verb.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-073 | timber beam | options, explanation | Structural role and material. | technical building term: teacher review recommended |
| C17-T1-R1-074 | brick arch | options, explanation | Geometry and material in compound noun. | technical building term: teacher review recommended |
| C17-T1-R1-075 | layer | options, explanation | Distribution over a surface. | No extra flag; teacher approval pending |
| C17-T1-R1-076 | rebuild | options, clue, explanation | Re- form and restoration after damage.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-077 | operation | options, clue, explanation | Intended service-functioning sense.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-078 | extension | options, clue, explanation | Physical addition versus service frequency.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-079 | authorise | options, clue, explanation | Authority versus recommendation/payment.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-080 | steam locomotive | options, explanation | Same railway domain with source power distinction. | technical railway term: teacher review recommended |
| C17-T1-R1-081 | boiler | context, options, clue, explanation | Keep source steam context; avoid claiming every domestic boiler makes steam.; hint revised to a contextual cue without a defining synonym; definition-like context replaced with a natural scenario | technical sense: not all boilers are steam generators |
| C17-T1-R1-082 | introduce | options, clue, explanation | Implementation versus explanation/removal.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-083 | be fitted with | options, clue, explanation | Installed versus compatible/inspected.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-084 | condense | options, clue, explanation | Direction of phase change.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-085 | fumes | options, explanation | Vapour versus dust; avoid exaggerating toxicity. | health wording: strong fumes are not all equally toxic |
| C17-T1-R1-086 | ventilation shaft | context, options, clue, explanation | Airflow function distinct from adjacent tunnel uses.; hint revised to a contextual cue without a defining synonym; definition-like context replaced with a natural scenario | technical building term: teacher review recommended |
| C17-T1-R1-087 | congestion | options, explanation | Cause of delay rather than delay alone. | No extra flag; teacher approval pending |
| C17-T1-R1-088 | circuit | options, explanation | Loop without overclaiming circular geometry. | No extra flag; teacher approval pending |
| C17-T1-R1-089 | alternative | options, explanation | Choice versus obligation/addition. | No extra flag; teacher approval pending |
| C17-T1-R1-090 | confined space | options, explanation | Source everyday sense; avoid legal workplace classification. | technical safety term: everyday meaning, not a legal definition |
| C17-T1-R1-091 | reliable | options, explanation | Dependability versus features/conditional operation. | No extra flag; teacher approval pending |
| C17-T1-R1-092 | electric motor | options, explanation | Mechanical function and electrical input. | technical device term: teacher review recommended |
| C17-T1-R1-093 | means of | options, clue, explanation | Instrument/method versus cause/destination.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-094 | transfer power | options, clue, explanation | Energy transmission versus storage/generation.; hint revised to a contextual cue without a defining synonym | technical wording: power/energy distinction for source-level paraphrase |
| C17-T1-R1-095 | generator | options, clue, explanation | Plausible device-level distractors.; hint revised to a contextual cue without a defining synonym | technical device term: teacher review recommended |
| C17-T1-R1-096 | deep-level electric railway | options, clue, explanation | Test both location and traction source.; hint revised to a contextual cue without a defining synonym | technical railway terminology: teacher review recommended |
| C17-T1-R1-097 | be made up of | options, clue, explanation | Composition versus accessory/product.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-098 | narrow | options, clue, explanation | Width versus height/distance.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-099 | power supply | options, clue, explanation | Power versus data/control signals.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-100 | technical achievement | options, clue, explanation | Technical success versus commercial success/intention.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-101 | make a profit | options, clue, explanation | Profit versus revenue and break-even.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-102 | in place | options, clue, explanation | Operational status versus documentation/intention.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
| C17-T1-R1-103 | soon afterwards | options, clue, explanation | Timing: after and soon both matter.; hint revised to a contextual cue without a defining synonym | No extra flag; teacher approval pending |
