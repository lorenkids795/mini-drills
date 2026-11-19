// Dictation Lab: build a schemaVersion 1.1 "transcript_only" import document from a plain transcript the teacher pasted.
// Deterministic, no AI, no network. The result is NOT teacher-audited (audit.auditState = not_audited): it can only be used for
// Free Practice labelled "Unverified transcript" until a teacher audits it (contract v1.1 §14, owner rule 6).
// Input format (same as the R3 fixtures): turns separated by blank lines; an optional speaker label "NAME:" at the start of a turn;
// a line made only of dashes is a section break; markers like (Q1) are removed from cleanText and kept as qMarkers.
import { sha256Utf8 } from "./validator/index.js";

const LABEL = /^([A-Za-z][A-Za-z .'-]{0,30}):[ \t]*/;
const QM = /[ \t]*\(Q(\d{1,3})\)/g;
const DASHES = /^-{3,}$/;

function sentencesOf(text, base) {
  // split after . ! ? (optionally followed by a closing quote or bracket) when whitespace follows; keeps offsets
  const out = []; let start = 0; const re = /[.!?]["'”’)]*(?=\s+\S)/g; let m;
  while ((m = re.exec(text)) !== null) { const end = m.index + m[0].length; out.push([start, end]); start = end; while (start < text.length && /\s/.test(text[start])) start++; re.lastIndex = start; }
  if (start < text.length) out.push([start, text.length]);
  return out.map(([a, b]) => ({ a: base + a, b: base + b, text: text.slice(a, b) })).filter((s) => s.text.trim());
}

/** @returns {{doc, notes: string[]}} */
export function buildTranscriptDoc({ title, text, attest = false, language = "en-GB", now = "2026-01-01T00:00:00Z" }) {
  let raw = String(text ?? "").replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").replace(/^\n+|\n+$/g, "");
  const notes = [];
  // the schema needs a speaker label at the start of every turn: unlabelled paragraphs get "SPEAKER:" (the teacher is told)
  let added = 0; raw = raw.split(/(\n[ \t]*\n)/).map((part) => { if (/^\n/.test(part) || !part.trim() || DASHES.test(part.trim()) || LABEL.test(part)) return part; added++; return "SPEAKER: " + part; }).join("");
  if (added) notes.push('Added "SPEAKER:" to ' + added + " paragraph(s) without a speaker label."); const speakers = new Map(); const turns = [], sentences = [], qMarkers = [], sectionBreaks = [];
  const blocks = []; const re = /[^\n]+(?:\n[^\n]+)*/g; let m; while ((m = re.exec(raw)) !== null) blocks.push({ text: m[0], start: m.index });
  for (const b of blocks) {
    if (DASHES.test(b.text.trim())) { if (sentences.length) sectionBreaks.push({ id: "sb-" + String(sectionBreaks.length + 1).padStart(2, "0"), afterSentenceId: sentences[sentences.length - 1].id, rawSpan: { start: b.start, end: b.start + b.text.length }, continuityAcrossBreak: "unknown" }); continue; }
    const lm = LABEL.exec(b.text); let spId = null, bodyStart = b.start, body = b.text;
    if (lm) {
      const label = lm[1].trim(); const key = label.toUpperCase();
      if (!speakers.has(key)) speakers.set(key, { id: "sp-" + (speakers.size + 1), rawLabel: label, displayName: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase() });
      spId = speakers.get(key).id; bodyStart = b.start + lm[0].length; body = b.text.slice(lm[0].length);
    }
    const tId = "t" + String(turns.length + 1).padStart(3, "0"); turns.push({ id: tId, order: turns.length + 1, speakerId: spId, rawSpan: { start: b.start, end: b.start + b.text.length } });
    for (const s of sentencesOf(body.replace(/\n/g, " "), bodyStart)) {
      const sId = "s" + String(sentences.length + 1).padStart(3, "0"); const ids = []; let clean = "", last = 0; QM.lastIndex = 0; let q;
      while ((q = QM.exec(s.text)) !== null) { clean += s.text.slice(last, q.index); const id = "qm-" + String(qMarkers.length + 1).padStart(2, "0"); const mk = q[0].indexOf("(");
        qMarkers.push({ id, number: Number(q[1]), sentenceId: sId, rawSpan: { start: s.a + q.index + mk, end: s.a + q.index + q[0].length }, cleanTextOffset: clean.length, role: "location_cue" }); ids.push(id); last = q.index + q[0].length; }
      clean = (clean + s.text.slice(last)).replace(/\s+/g, " ").trim();
      if (!clean) continue;
      sentences.push({ id: sId, turnId: tId, order: sentences.length + 1, rawText: raw.slice(s.a, s.b), rawSpan: { start: s.a, end: s.b }, cleanText: clean, enabled: true, textStatus: "verbatim_cleaned", qMarkerIds: ids, provenance: { segmentation: "rule_based", cleanTextBasis: "raw_plus_safe_cleanup" } });
    }
  }
  if (!sentences.length) notes.push("No sentence was found. Paste the transcript text.");
  const doc = {
    $schema: "urn:minidrills:dictation-lab:schema:1.1", schemaVersion: "1.1", importMode: "transcript_only",
    metadata: { title: String(title || "Untitled dictation").slice(0, 200), language, source: { type: "teacher_upload", label: "teacher paste" }, audio: { availability: "none_attached", timestampsAvailable: false }, generatedBy: { kind: "transcript_only_tool", toolName: "Mini Drills transcript builder", generatedAt: now } },
    rights: { usage: "private_class_use", rightsHolder: "Teacher", teacherAttestsAuthorizedUse: attest === true, publicRedistributionAllowed: false },
    rawTranscript: { immutable: true, encoding: "utf-8", newline: "LF", capturedFrom: "teacher_paste", sha256: sha256Utf8(raw), text: raw },
    audit: { auditState: "not_audited", audioAvailableToAuditor: false, audioVerificationPerformed: false, issues: [], decisions: [] },
    transcript: { speakers: [...speakers.values()], turns, sentences, sectionBreaks, qMarkers },
  };
  return { doc, notes };
}
