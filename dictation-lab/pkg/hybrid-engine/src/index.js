// Dictation Lab hybrid engine, public API (contract v1.1: no hint, no reveal; homework scored on the server). Deterministic, dependency-free, no DOM, no network, no AI.
export { tokenize, tokenizeOffsets, displayTokens, stripEnds, sanitize, prepareAnswer, stripSpeakerLabels, MAX_ANSWER_CHARS, cpLength } from "./normalize.js";
export { align, scoreVariants, CRITICAL } from "./align.js";
export { Lesson, scoreAnswerSpotter, validateAnswerSpotterItem, provenanceLabel, reviewUnlock, claimOk } from "./scoring.js";
export { reduceAttempts, deriveExposure, aggregateScores, PASS_PERCENT, createSessionState, applySessionEvent, sessionFinal, sessionItems, runSession, Session } from "./session.js";
export { WordBuilder, runL1Events } from "./wordbuilder.js";
export { shuffle, mulberry32, hashSeed } from "./prng.js";
export { buildExerciseSet, eligibleSentences, blockedSentenceIds, defaultTarget, DEFAULTS } from "./content.js";
export { Frac, frac } from "./fraction.js";
export { DictationRun, createRun, assertRunnable, LEVELS } from "./run.js";
export { studentItem, blankSegments, itemSeed } from "./payload.js";
export { HomeworkClient, homeworkPayload, releasePhase, phaseItemIds, phaseLockIds, checkResponse, validateSubmission, scoreHomework, storageRecord, createMemoryServer, PAYLOAD_SCHEMA, SUBMISSION_SCHEMA, LIMITS } from "./homework.js";
