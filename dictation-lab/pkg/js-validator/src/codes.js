// GENERATED from rev1-reference/dictation-semantic-validator.py CODES by tools/gen-codes.py. Do not edit by hand.
export const CODES = {
 "E-AS-MARKER-NOTE-MISSING": [
  "error",
  "Marker cue sentence differs from answer sentence and markerRelationNote is absent"
 ],
 "E-AS-MODE-VISIBILITY": [
  "error",
  "Item requires selecting text that is not visible (select_span_in_text outside post-check review, or transcript shown during independent listening)"
 ],
 "E-AS-OCC": [
  "error",
  "Answer Spotter span occurrence mismatch"
 ],
 "E-AS-OPTIONS": [
  "error",
  "choose_option needs at least two options"
 ],
 "E-AS-ORIGIN-CLAIM": [
  "error",
  "Unsupported official-material claim"
 ],
 "E-AS-QMARKER-REF": [
  "error",
  "relatedQMarkerIds references a missing marker"
 ],
 "E-AS-REVIEW-PAIR": [
  "error",
  "Post-check review item lacks a valid paired independent item"
 ],
 "E-AS-SCOPE": [
  "error",
  "Span sentence is not in evidenceSentenceIds"
 ],
 "E-AS-SPAN": [
  "error",
  "Answer Spotter span surface differs from cleanText slice"
 ],
 "E-AS-WORDLIMIT": [
  "error",
  "Answer or candidate longer than answerFormat.maxWords"
 ],
 "E-AS-WORDLIMIT-ALT": [
  "error",
  "Accepted form longer than answerFormat.maxWords"
 ],
 "E-AUDITSTATE": [
  "error",
  "auditState inconsistent with issues"
 ],
 "E-BLANK-OVERLAP": [
  "error",
  "Blanks overlap or repeat a target"
 ],
 "E-BLOCK-CONSISTENCY": [
  "error",
  "pending_verification does not match open blocking issues"
 ],
 "E-BREAK-SPAN": [
  "error",
  "sectionBreak rawSpan is not a separator line placed after afterSentenceId"
 ],
 "E-CLEAN-DERIV": [
  "error",
  "cleanText is not raw text minus (Qn) markers for an unverified-edit sentence (silent correction)"
 ],
 "E-CLEAN-METADATA-LEAK": [
  "error",
  "Speaker label, (Qn) marker or section separator inside cleanText"
 ],
 "E-DECISION-EVIDENCE": [
  "error",
  "Approved or applied decision lacks confirmed evidence, or finalText does not match"
 ],
 "E-DECISION-REF": [
  "error",
  "Decision references a missing issue"
 ],
 "E-DECISION-STATE": [
  "error",
  "Issue/sentence state does not match the latest decision"
 ],
 "E-FORM-INVALID": [
  "error",
  "allowedForms/acceptedForms kind does not fit the span"
 ],
 "E-FULLTEXT": [
  "error",
  "fullCleanText differs from canonical join"
 ],
 "E-ID-DUP": [
  "error",
  "Duplicate id inside one collection"
 ],
 "E-ISSUE-CLEANSPAN": [
  "error",
  "Issue cleanSpan does not slice to the expected text"
 ],
 "E-ISSUE-REF": [
  "error",
  "Issue references a missing sentence or marker"
 ],
 "E-ISSUE-SPAN": [
  "error",
  "Issue sourceQuote differs from rawSpan slice"
 ],
 "E-L1-DISTRACTOR-IN-SENTENCE": [
  "error",
  "Distractor already occurs in the sentence"
 ],
 "E-L1-HARD-LEN": [
  "error",
  "Level 1 tile count outside hard bounds 2..40"
 ],
 "E-L2-HIDDEN-LIMIT": [
  "error",
  "Hidden words exceed settings.level2.maxHiddenWords"
 ],
 "E-L2-TARGET-SENT": [
  "error",
  "Blank target belongs to another sentence"
 ],
 "E-L3-HARD-LEN": [
  "error",
  "Level 3 word count outside hard bounds 2..60"
 ],
 "E-L4-BREAK": [
  "error",
  "Level 4 span crosses a section break not confirmed continuous"
 ],
 "E-L4-CONTIG": [
  "error",
  "Level 4 sentenceIds are not adjacent in audio order"
 ],
 "E-L4-HARD-SIZE": [
  "error",
  "Level 4 outside hard bounds (2..8 sentences, at most 300 words)"
 ],
 "E-L4-MULTISPEAKER": [
  "error",
  "Multiple speakers without multiSpeaker = true, or multiSpeaker not allowed"
 ],
 "E-LIMIT": [
  "error",
  "Configured import limit exceeded"
 ],
 "E-MODE-FIELDS": [
  "error",
  "Field not allowed for this importMode"
 ],
 "E-OFFICIAL-RIGHTS": [
  "error",
  "Official question text or claim without teacherAttestsAuthorizedUse"
 ],
 "E-ORD-RAW": [
  "error",
  "Sentence rawSpans are not in strictly increasing raw order"
 ],
 "E-ORD-SENT": [
  "error",
  "sentences[].order is not 1..n"
 ],
 "E-ORD-TURN": [
  "error",
  "turns[].order is not 1..n"
 ],
 "E-QMARKER-OFFSET": [
  "error",
  "cleanTextOffset differs from the offset recomputed from raw text"
 ],
 "E-QMARKER-ORDER": [
  "error",
  "Marker numbers are not strictly increasing in audio order"
 ],
 "E-QMARKER-REF": [
  "error",
  "qMarker and sentence.qMarkerIds disagree or sentence missing"
 ],
 "E-QMARKER-SPAN": [
  "error",
  "qMarker rawSpan does not slice to (Qn) inside its sentence"
 ],
 "E-RAW-HASH": [
  "error",
  "rawTranscript.sha256 does not match UTF-8 bytes of text"
 ],
 "E-RAW-SPAN": [
  "error",
  "rawSpan outside text or rawText differs from the raw slice"
 ],
 "E-REF-BLOCKED": [
  "error",
  "Exercise references a pending_verification or blocked sentence"
 ],
 "E-REF-DISABLED": [
  "error",
  "Exercise references a disabled sentence"
 ],
 "E-REF-MISSING": [
  "error",
  "Reference to a missing sentence, target or item"
 ],
 "E-REF-ORDER": [
  "error",
  "Items are not in audio order"
 ],
 "E-RIGHTS-REDISTRIBUTION": [
  "error",
  "Cambridge source with publicRedistributionAllowed = true"
 ],
 "E-SELECTION-STATE": [
  "error",
  "selection.disabledReasons names an enabled or missing sentence"
 ],
 "E-SENT-TURN-MISMATCH": [
  "error",
  "Sentence rawSpan lies outside its turn rawSpan"
 ],
 "E-SETTINGS-RANGE": [
  "error",
  "settings min greater than max"
 ],
 "E-SPEAKER": [
  "error",
  "Turn references a missing speaker"
 ],
 "E-TARGET-OCC": [
  "error",
  "Target occurrence differs from recomputed whole-token rank"
 ],
 "E-TARGET-OPEN-ISSUE": [
  "error",
  "Target overlaps an open issue span"
 ],
 "E-TARGET-PROPERN": [
  "error",
  "proper_noun_spelling target on a sentence with unresolved proper-noun issue"
 ],
 "E-TARGET-SPAN": [
  "error",
  "Target surface differs from cleanText slice"
 ],
 "E-TIMESTAMP": [
  "error",
  "Invalid timestamp or timestamps present while timestampsAvailable is false"
 ],
 "E-TURN-REF": [
  "error",
  "Sentence references a missing turn"
 ],
 "E-TURN-SPAN": [
  "error",
  "Turn rawSpan invalid or does not start with its speaker label"
 ],
 "E-UNICODE-INVALID": [
  "error",
  "String is not valid Unicode text (lone surrogate or unencodable)"
 ],
 "I-LENGTH-EXCEPTION-APPROVED": [
  "info",
  "Advisory threshold crossed with a recorded teacher exception"
 ],
 "W-EXCEPTION-UNUSED": [
  "warning",
  "lengthException present but no advisory threshold is crossed"
 ],
 "W-FORMS-UNAPPROVED": [
  "warning",
  "Answer alternatives still proposed, not teacher_approved"
 ],
 "W-L1-DISTRACTOR-COUNT": [
  "warning",
  "More distractors than settings.level1.maxDistractorsPerItem"
 ],
 "W-L1-LEN": [
  "warning",
  "Level 1 tile count outside advisory range without approved exception"
 ],
 "W-L3-LEN": [
  "warning",
  "Level 3 word count outside advisory range without approved exception"
 ],
 "W-L4-LEN": [
  "warning",
  "Level 4 size outside advisory range without approved exception"
 ],
 "W-MARKUP-LIKE-TEXT": [
  "info",
  "Text contains angle brackets; legal data, must be rendered inert"
 ],
 "W-NO-TIMESTAMPS": [
  "info",
  "No timestamps: UI must not imply an exact audio position"
 ],
 "W-NOT-AUDITED": [
  "warning",
  "auditState is not_audited"
 ],
 "W-NOT-NFC": [
  "warning",
  "Text is not NFC-normalised (offsets refer to the stored form)"
 ],
 "W-NUMERIC-NO-ALLOWED-FORMS": [
  "warning",
  "Numeric or currency target has no explicit answer set"
 ],
 "W-QMARKER-ANSWER-DISTANCE": [
  "warning",
  "Marker cue is in a different sentence than the practice answer (location cue only)"
 ],
 "W-QUOTA-LOW": [
  "warning",
  "Fewer explicit items than the suggested minimum (guideline, not a quota)"
 ],
 "W-RESERVED-TYPE": [
  "warning",
  "independent_answer_hunt is reserved; engine ignores it in the MVP"
 ],
 "W-REUSE": [
  "warning",
  "Sentence reused across levels (guided practice, not independent assessment)"
 ],
 "W-RIGHTS-UNATTESTED": [
  "warning",
  "teacherAttestsAuthorizedUse is false"
 ],
 "W-SYNTAX-DET": [
  "warning",
  "Blank target flagged syntax_determinable"
 ]
};
export const DEFAULT_LIMITS = {"file_bytes": 2000000, "raw_chars": 60000, "raw_utf8_bytes": 240000, "sentences": 600, "turns": 300, "issues": 200, "decisions": 200, "targets": 600, "level1": 20, "level2": 25, "level3": 20, "level4": 8, "answerSpotter": 25};
export const GUIDE_MIN = {"level1": 8, "level2": 10, "level3": 8, "level4": 3, "answerSpotter": 8};
