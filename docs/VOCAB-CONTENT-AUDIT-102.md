# Phase 2.7 — Content quality audit

{
  "audited": 102,
  "denominator": 102,
  "draftsChanged": 102,
  "autoCheckPassed": 102,
  "taskRecords": 231,
  "wordMorphFamilies": 3,
  "wordMorphTasks": 12,
  "wordMorphNotAuthored": 99,
  "teacherReviewFlags": 102,
  "prioritySenseDecisions": 5,
  "policyDecisions": 1,
  "approved": 0,
  "published": 0
}

Audited every exact approved source/sense ID, not only the 15 mission targets. All 231 task records include original text, repair, field diff, severity, category, rationale and bounded automated checks. There are 102 original contexts and five extra pack-context appearances; 3 attested morphology families / 12 tasks. 99 senses have no authored morphology activity and are explicitly NOT_AUTHORED. No new family or sense was invented.

All 102 drafts changed to authored version 2. The approved bank is unchanged. All remain TEACHER_REVIEW; 0 APPROVED / 0 PUBLISHED. Five source-specific decisions plus one shared recall-policy decision are prioritised; routine editorial signoff still covers all 102.

## Before / after examples

### C17-T1-R1-040 — pass (a proposal)

investigate before:
```json
{
  "kind": "meaning",
  "context": "After considering the changes, the committee voted to pass the proposal.",
  "prompt": "Which interpretation is supported by this note?",
  "options": [
    "refuse to approve the proposal",
    "officially approve",
    "physically walk past the meeting room"
  ],
  "answer": 1,
  "clue": "Use the committee's decision-making sense of the verb.",
  "why": "In this context the vote gives official approval; it is not movement past an object."
}
```
After:
```json
{
  "kind": "meaning",
  "context": "After considering the changes, the committee voted to pass the proposal.",
  "prompt": "Which interpretation is supported by this note?",
  "options": [
    "postpone the decision until another meeting",
    "officially approve",
    "refer the proposal for further consultation"
  ],
  "answer": 1,
  "clue": "Consider what the recorded vote decided, rather than what might happen at an earlier stage.",
  "why": "The committee voted to give the proposal official approval. Postponing the vote or sending it for more consultation would leave that decision unresolved."
}
```

final before:
```json
{
  "kind": "recall",
  "prompt": "Use the base verb meaning officially approve: The committee may ___ the revised proposal.",
  "answers": [
    "pass"
  ],
  "clue": "Use the committee's decision-making sense of the verb.",
  "why": "In this context the vote gives official approval; it is not movement past an object.",
  "variantPolicy": "Bank label: pass (a proposal). The gap requires the base verb pass, without its object."
}
```
After:
```json
{
  "kind": "recall",
  "prompt": "A new motion is ready for a final vote. If enough members support it, the council will ___ the motion today.",
  "answers": [
    "pass"
  ],
  "clue": "Check the verb form and any required small words against the sentence around the gap.",
  "why": "Pass fits the base-verb slot after will and takes the motion as its object; passing or passed would not fit here.",
  "variantPolicy": "Bank label: pass (a proposal). This gap requires pass; its object is already written. Do not accept pass the proposal, passed or passing.",
  "strictVariants": true
}
```

### C17-T1-R1-005 — overground railway

investigate before:
```json
{
  "kind": "meaning",
  "context": "An overground railway crosses the park on raised tracks rather than in a tunnel.",
  "prompt": "Which interpretation is supported by this note?",
  "options": [
    "railway operating only underground",
    "a road used exclusively by buses",
    "railway operating above ground"
  ],
  "answer": 2,
  "clue": "Locate the tracks relative to the ground.",
  "why": "The visible raised tracks identify the above-ground railway sense."
}
```
After:
```json
{
  "kind": "meaning",
  "context": "An overground railway crosses the park on raised tracks rather than in a tunnel.",
  "prompt": "Which interpretation is supported by this note?",
  "options": [
    "railway running through a shallow tunnel",
    "railway running deep beneath a city",
    "railway operating above ground"
  ],
  "answer": 2,
  "clue": "Locate the tracks relative to the ground.",
  "why": "The visible raised tracks identify the above-ground railway sense."
}
```

final before:
```json
{
  "kind": "recall",
  "prompt": "Write the two-word rail expression: Visitors can see the passing trains because the line is an ___.",
  "answers": [
    "overground railway"
  ],
  "clue": "Locate the tracks relative to the ground.",
  "why": "The visible raised tracks identify the above-ground railway sense.",
  "variantPolicy": "Explicit variants only; ignore case, sentence punctuation and repeated spaces. Articles and inflections must fit the gap; other legitimate wording needs teacher review."
}
```
After:
```json
{
  "kind": "recall",
  "prompt": "From her window, Leena watched trains on tracks above the street. Her flat overlooked an ___.",
  "answers": [
    "overground railway"
  ],
  "clue": "Check the article, number and any required small words on both sides of the gap.",
  "why": "The visible raised tracks identify the above-ground railway sense.",
  "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
  "strictVariants": true
}
```

### C17-T1-R1-026 — solicitor

investigate before:
```json
{
  "kind": "meaning",
  "context": "In the fictional England-and-Wales setting, the client asks a solicitor to handle legal paperwork.",
  "prompt": "Which interpretation is supported by this note?",
  "options": [
    "a person who repairs railway signals",
    "a court witness with no professional legal role",
    "type of legal practitioner in England and Wales"
  ],
  "answer": 2,
  "clue": "Keep the specified jurisdiction and professional role in view.",
  "why": "The bank identifies a legal practitioner in England and Wales; the example does not claim the same professional system applies everywhere."
}
```
After:
```json
{
  "kind": "meaning",
  "context": "In the fictional England-and-Wales setting, the client asks a solicitor to handle legal paperwork.",
  "prompt": "Which interpretation is supported by this note?",
  "options": [
    "a professional whose main role is surveying buildings",
    "a professional whose main role is auditing accounts",
    "type of legal practitioner in England and Wales"
  ],
  "answer": 2,
  "clue": "Check the profession in the stated jurisdiction.",
  "why": "The bank identifies a legal practitioner in England and Wales; the example does not claim the same professional system applies everywhere."
}
```

final before:
```json
{
  "kind": "recall",
  "prompt": "Use the legal-profession noun for this England-and-Wales context: The client consulted a ___ about the documents.",
  "answers": [
    "solicitor"
  ],
  "clue": "Keep the specified jurisdiction and professional role in view.",
  "why": "The bank identifies a legal practitioner in England and Wales; the example does not claim the same professional system applies everywhere.",
  "variantPolicy": "Explicit variants only; ignore case, sentence punctuation and repeated spaces. Articles and inflections must fit the gap; other legitimate wording needs teacher review."
}
```
After:
```json
{
  "kind": "recall",
  "prompt": "In this England-and-Wales scenario, Priya needs professional legal advice on a property contract. She makes an appointment with a ___.",
  "answers": [
    "solicitor"
  ],
  "clue": "Check the article, number and any required small words on both sides of the gap.",
  "why": "The bank identifies a legal practitioner in England and Wales; the example does not claim the same professional system applies everywhere.",
  "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
  "strictVariants": true
}
```

### C17-T1-R1-055 — emission

investigate before:
```json
{
  "kind": "meaning",
  "prompt": "What does emission refer to here?",
  "options": [
    "A substance released from the engine.",
    "The price paid for the engine.",
    "The number of passengers in a carriage."
  ],
  "answer": 0,
  "clue": "Identify what leaves the engine, rather than its cost or users.",
  "why": "Emission in this engine context refers to substances released by it; the source sense is not about a fare or passenger count.",
  "context": "An archive note records material released from the engine during operation.",
  "artifact": "Case evidence",
  "purpose": "Interpret this finding before writing the team recommendation.",
  "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
}
```
After:
```json
{
  "kind": "meaning",
  "prompt": "What does emission refer to here?",
  "options": [
    "A substance released from the engine.",
    "A substance supplied to the engine as fuel.",
    "A substance retained inside the engine as lubricant."
  ],
  "answer": 0,
  "clue": "Trace the direction of the material in the engine note.",
  "why": "The emission leaves the engine. Fuel enters it, while lubricant retained inside has not been released.",
  "context": "An archive note records material released from the engine during operation.",
  "artifact": "Case evidence",
  "purpose": "Interpret this finding before writing the team recommendation.",
  "clue2": "Check the evidence against each option; avoid adding claims the finding does not make."
}
```

final before:
```json
{
  "kind": "recall",
  "prompt": "Use the singular release noun: The monitor recorded an ___ from the engine.",
  "answers": [
    "emission"
  ],
  "clue": "The gap follows an and names a release from the engine.",
  "why": "Emission is the singular noun for the recorded release.",
  "variantPolicy": "Explicit list only; case, sentence punctuation and spaces normalize. Articles/inflections must fit this exact gap.",
  "artifact": "Independent final note",
  "purpose": "Recall the expression in a new finding without a word bank."
}
```
After:
```json
{
  "kind": "recall",
  "prompt": "The monitor detected an ___ of nitrogen oxides from the engine while it was running.",
  "answers": [
    "emission"
  ],
  "clue": "Check the article, number and any required small words on both sides of the gap.",
  "why": "An emission of nitrogen oxides identifies material released by the engine; the article an requires a singular noun here.",
  "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
  "artifact": "Independent final note",
  "purpose": "Recall the expression in a new finding without a word bank.",
  "strictVariants": true
}
```

### C17-T1-R1-073 — timber beam

investigate before:
```json
{
  "kind": "meaning",
  "context": "The model labels a long wooden roof support as a timber beam.",
  "prompt": "Which interpretation is supported by this note?",
  "options": [
    "a curved support made from bricks",
    "long structural wooden support",
    "a thin sheet of glass used as a window"
  ],
  "answer": 1,
  "clue": "Identify both the material and the supporting shape.",
  "why": "Wood and a long supporting member match this structural term."
}
```
After:
```json
{
  "kind": "meaning",
  "context": "The model labels a long wooden roof support as a timber beam.",
  "prompt": "Which interpretation is supported by this note?",
  "options": [
    "a long structural support made of steel",
    "long structural wooden support",
    "a curved structural support made of brick"
  ],
  "answer": 1,
  "clue": "Identify both the material and the supporting shape.",
  "why": "Wood and a long supporting member match this structural term."
}
```

final before:
```json
{
  "kind": "recall",
  "prompt": "Use the two-word structural noun phrase: A ___ supports the model roof.",
  "answers": [
    "timber beam"
  ],
  "clue": "Identify both the material and the supporting shape.",
  "why": "Wood and a long supporting member match this structural term.",
  "variantPolicy": "Explicit variants only; ignore case, sentence punctuation and repeated spaces. Articles and inflections must fit the gap; other legitimate wording needs teacher review."
}
```
After:
```json
{
  "kind": "recall",
  "prompt": "The roof rests on a long wooden support running across the room. The carpenter inspected the ___ for damage.",
  "answers": [
    "timber beam"
  ],
  "clue": "Check the article, number and any required small words on both sides of the gap.",
  "why": "Wood and a long supporting member match this structural term.",
  "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
  "strictVariants": true
}
```

### C17-T1-R1-097 — be made up of

investigate before:
```json
{
  "kind": "meaning",
  "context": "The exhibition will be made up of six sections, each covering a different topic.",
  "prompt": "Which interpretation is supported by this note?",
  "options": [
    "be positioned entirely outside",
    "be composed of",
    "be removed before anyone sees it"
  ],
  "answer": 1,
  "clue": "Identify the relationship between a whole and its components.",
  "why": "The sections are the parts composing the exhibition."
}
```
After:
```json
{
  "kind": "meaning",
  "context": "The exhibition will be made up of six sections, each covering a different topic.",
  "prompt": "Which interpretation is supported by this note?",
  "options": [
    "be assembled beside",
    "be composed of",
    "be replaced by"
  ],
  "answer": 1,
  "clue": "Identify the relationship between a whole and its components.",
  "why": "The sections are the parts composing the exhibition."
}
```

final before:
```json
{
  "kind": "recall",
  "prompt": "Use the four-word composition phrase: The display will ___ three linked panels.",
  "answers": [
    "be made up of"
  ],
  "clue": "Identify the relationship between a whole and its components.",
  "why": "The sections are the parts composing the exhibition.",
  "variantPolicy": "Explicit variants only; ignore case, sentence punctuation and repeated spaces. Articles and inflections must fit the gap; other legitimate wording needs teacher review."
}
```
After:
```json
{
  "kind": "recall",
  "prompt": "The exhibition has three sections and no others. It will ___ those three sections.",
  "answers": [
    "be made up of"
  ],
  "clue": "Check the verb form and any required small words against the sentence around the gap.",
  "why": "The sections are the parts composing the exhibition.",
  "variantPolicy": "Explicit reviewed forms only. Ignore case, curly apostrophes and repeated spaces; preserve articles, inflections, hyphens and internal punctuation. Other wording is not automatically accepted.",
  "strictVariants": true
}
```

## Limits and QA

Deterministic PASS is not English/IELTS approval. Generic or plausible alternative wording may still deserve teacher revision. Copyright/source-context comparison cannot be established without the source passage. Learner progress for 87 routes and real staged auth remain disabled. Reviewer V8 layout is unchanged; only its isolated rehearsal hides answer panels. Old mission saves remain pinned to their content snapshot, not silently upgraded.

Run node tools/build-vocab-phase27.cjs, node tools/vocab-phase26-audit.cjs, node tools/vocab-phase27-audit.cjs to reproduce data. Read docs/VOCAB-QA-STATUS.md for the final exact QA run. No merge/deploy/approve/publish.

Word Morph lexical attestations: [congestion](https://dictionary.cambridge.org/dictionary/english/congestion), [construction](https://dictionary.cambridge.org/dictionary/english/construction), [condensation](https://dictionary.cambridge.org/dictionary/english/condensation). Only noun/POS and sense evidence was consulted; no dictionary example or Cambridge reading passage was copied.
