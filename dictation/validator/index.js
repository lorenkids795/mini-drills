// Public API of the Dictation Lab validator. Runs in browsers (ES modules) and Node 18+. No dependencies.
// Stage 1 JSON Schema (own evaluator, schema-subset.js)  +  stage 2 semantic validator (semantic.js). Stage 3 (teacher/audio verification) is never automatic.
import { compileSchema } from "./schema-subset.js";
import { validateSemantic, fatalReport, VERSION } from "./semantic.js";
import { CODES } from "./codes.js";
import { utf8Length } from "./text.js";
export { compileSchema, validateSemantic, CODES, VERSION };
export { sha256Utf8 } from "./sha256.js";

export const DEFAULT_PARSE_LIMITS = { maxBytes: 2_000_000, maxDepth: 64 };
function depthOf(o, d = 0, max = 64) { if (d > max) return d; if (o && typeof o === "object") { let m = d; for (const k of Object.keys(o)) { m = Math.max(m, depthOf(o[k], d + 1, max)); if (m > max) return m; } return m; } return d; }

/** Parse untrusted JSON text defensively. Never throws. Returns {ok, doc?, diagnostics[]}. */
export function parseDictationJson(text, limits = {}) {
  const L = { ...DEFAULT_PARSE_LIMITS, ...limits };
  if (typeof text !== "string") return { ok: false, diagnostics: [{ code: "E-JSON-PARSE", path: "$", message: "input is not a string" }] };
  const bytes = utf8Length(text);
  if (bytes > L.maxBytes) return { ok: false, diagnostics: [{ code: "E-JSON-PARSE", path: "$", message: `input has ${bytes} bytes, limit ${L.maxBytes}` }] };
  let doc; try { doc = JSON.parse(text); } catch (e) { return { ok: false, diagnostics: [{ code: "E-JSON-PARSE", path: "$", message: String(e.message).slice(0, 200) }] }; }
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) return { ok: false, diagnostics: [{ code: "E-JSON-PARSE", path: "$", message: "top level must be an object" }] };
  if (depthOf(doc, 0, L.maxDepth) > L.maxDepth) return { ok: false, diagnostics: [{ code: "E-JSON-PARSE", path: "$", message: `nesting deeper than ${L.maxDepth}` }] };
  return { ok: true, doc, bytes, diagnostics: [] };
}

/**
 * Validate a parsed document. options: { schema (required object), limits, bytes, semanticWhenSchemaInvalid (default true) }.
 * Result: { schemaValid, schemaErrors[], semantic (same shape as the Python reference report), valid }.
 * valid === true only when schemaValid and there are no semantic errors. It is NOT publication approval.
 */
export function validateDictationDocument(doc, options = {}) {
  if (!options.schema) throw new Error("validateDictationDocument: options.schema is required (pass the parsed dictation-schema-v1.json)");
  const check = options.compiled ?? compileSchema(options.schema);
  const { valid: schemaValid, errors: schemaErrors } = check(doc);
  let semantic;
  if (schemaValid || options.semanticWhenSchemaInvalid !== false) semantic = validateSemantic(doc, options.limits ?? null, options.bytes ?? null);
  else semantic = { skipped: true, errorCodes: [], warningCodes: [], infoCodes: [], errors: [], warnings: [], info: [], publicationEligibility: "invalid" };
  return { schemaValid, schemaErrors, semantic, valid: schemaValid && semantic.errorCodes.length === 0 };
}
/** Convenience: text in, full report out. Never throws on bad input. */
export function validateDictationJson(text, options = {}) {
  const parsed = parseDictationJson(text, options.parseLimits);
  if (!parsed.ok) return { schemaValid: false, schemaErrors: [], semantic: fatalReport(new TypeError("unparseable input")), parse: parsed.diagnostics, valid: false };
  return validateDictationDocument(parsed.doc, { ...options, bytes: parsed.bytes });
}
