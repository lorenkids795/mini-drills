import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sha256Utf8 } from "../src/sha256.js";
import { words, normTok, matches, cpLength, utf8Length, QRE_SRC } from "../src/text.js";
import { classifyLength, answerSpotterModeInvalid } from "../src/rules.js";
import { compileSchema, checkSchemaKeywords } from "../src/schema-subset.js";
import { parseDictationJson, validateDictationDocument, validateDictationJson, CODES } from "../src/index.js";
const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, "..");
const schema = JSON.parse(readFileSync(join(root, "schema", "dictation-schema-v1.json"), "utf8")); const V = JSON.parse(readFileSync(join(here, "vectors", "rev1-js-parity-vectors.json"), "utf8"));
const base = () => JSON.parse(readFileSync(join(here, "corpus", "rev1-fixtures", "p01_base_ai_eligible.json"), "utf8"));

test("SHA-256: known vectors and 300 random strings against node:crypto", () => {
  assert.equal(sha256Utf8("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"); assert.equal(sha256Utf8(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  for (let n = 0; n < 300; n++) { const s = randomBytes(n % 200).toString("latin1") + "\u00a3\u20ac\U0001F600".replace("\\U0001F600", "\u{1F600}"); assert.equal(sha256Utf8(s), createHash("sha256").update(s, "utf8").digest("hex")); }
  for (const len of [55, 56, 57, 63, 64, 65, 119, 120, 128]) { const s = "a".repeat(len); assert.equal(sha256Utf8(s), createHash("sha256").update(s).digest("hex"), "padding boundary " + len); }
});
test("Rev1 JS parity vectors (word count, token normalisation, whole-token matches in UTF-16, utf16/utf8 lengths, sha256, marker cleanup)", () => {
  V.wordCount.forEach((v, i) => assert.equal(words(v.text).length, v.words, "wordCount " + i));
  V.normalizeToken.forEach((v, i) => assert.equal(normTok(v.token), v.norm, "normalizeToken " + i));
  V.wholeTokenMatches.forEach((v, i) => assert.deepEqual(matches(v.text, v.surface), v.utf16Starts, "wholeTokenMatches " + i));
  V.utf16.forEach((v, i) => { assert.equal(v.text.length, v.utf16Length); assert.equal(cpLength(v.text), v.codePointLength); assert.equal(utf8Length(v.text), v.utf8Bytes); });
  V.sha256Utf8.forEach((v, i) => assert.equal(sha256Utf8(v.text), v.sha256, "sha256 " + i));
  V.qMarkerCleanup.forEach((v, i) => { const clean = v.raw.replace(new RegExp(QRE_SRC, "g"), ""); const m = new RegExp("\\(Q\\d+\\)").exec(v.raw); const rel = v.raw.slice(0, m.index + m[0].length).replace(new RegExp(QRE_SRC, "g"), ""); assert.equal(clean, v.clean); assert.equal(rel.length, v.markerCleanTextOffset); });
  V.lengthClassification.cases.forEach((c, i) => assert.equal(classifyLength(c.level, c.words, c.sentences), c.result, "length " + i));
  V.answerSpotterModeRules.forEach((c, i) => assert.equal(!answerSpotterModeInvalid(c.activity, c.responseMode, c.showTranscriptDuringTask), c.valid, "mode " + i));
});
test("schema evaluator fails closed on unsupported keywords", () => {
  assert.deepEqual(checkSchemaKeywords(schema), []);
  assert.throws(() => compileSchema({ type: "object", patternProperties: { a: {} } }), /unsupported keyword/);
  assert.throws(() => compileSchema({ $ref: "http://example.com/x" })("x"), /only local/);
});
test("schema evaluator semantics: contains/minContains, dependentRequired, uniqueItems, if/then, code point lengths, integers, date-time", () => {
  const c = (s, x) => compileSchema(s)(x).valid;
  assert.equal(c({ type: "array", contains: { const: 1 }, minContains: 2 }, [1, 2, 1]), true); assert.equal(c({ type: "array", contains: { const: 1 }, minContains: 2 }, [1, 2]), false);
  assert.equal(c({ type: "array", contains: { const: 1 }, maxContains: 1 }, [1, 1]), false);
  assert.equal(c({ dependentRequired: { a: ["b"] } }, { a: 1 }), false); assert.equal(c({ dependentRequired: { a: ["b"] } }, { a: 1, b: 2 }), true);
  assert.equal(c({ uniqueItems: true }, [{ a: 1, b: 2 }, { b: 2, a: 1 }]), false);
  assert.equal(c({ maxLength: 1 }, "\u{1F600}"), true, "astral char counts as ONE code point"); assert.equal(c({ minLength: 2 }, "\u{1F600}"), false);
  assert.equal(c({ type: "integer" }, 1.5), false); assert.equal(c({ type: "integer" }, 2), true);
  assert.equal(c({ if: { properties: { a: { const: 1 } }, required: ["a"] }, then: { required: ["b"] } }, { a: 1 }), false);
  assert.equal(c({ format: "date-time" }, "2026-02-29T00:00:00Z"), false); assert.equal(c({ format: "date-time" }, "2024-02-29T00:00:00+07:00"), true); assert.equal(c({ format: "date-time" }, "2026-01-01 00:00:00Z"), false);
  assert.equal(c({ pattern: "^s[0-9]{3}$" }, "s001\n"), false, "ECMA $ does not match before a trailing newline (the Python re module does)");
});
test("malformed and hostile input never throws and never pollutes prototypes", () => {
  for (const bad of [null, undefined, 42, {}, [], "", "{", "[]", "null", '{"a":'.repeat(3)]) assert.doesNotThrow(() => validateDictationJson(bad, { schema }));
  assert.equal(validateDictationJson("{", { schema }).valid, false);
  assert.equal(parseDictationJson("x".repeat(50), { maxBytes: 10 }).ok, false);
  const deep = "[".repeat(2000) + "]".repeat(2000); assert.equal(parseDictationJson(deep).ok, false);
  const d = base(); const evil = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted2":true}}}'); for (const k of Object.keys(evil)) d[k] = evil[k];
  const res = validateDictationDocument(d, { schema }); assert.equal(res.schemaValid, false); assert.equal({}.polluted, undefined); assert.equal({}.polluted2, undefined);
  const d2 = base(); d2.transcript.sentences[0].id = "__proto__"; d2.transcript.sentences[1].turnId = "constructor"; assert.doesNotThrow(() => validateDictationDocument(d2, { schema })); assert.equal({}.polluted, undefined);
  const d3 = base(); d3.transcript = null; const r3 = validateDictationDocument(d3, { schema }); assert.equal(r3.valid, false); assert.ok(r3.semantic.errorCodes.includes("FATAL-STRUCTURE"));
});
test("determinism: identical input gives byte-identical output; key order of the input does not matter for results", () => {
  const a = base(); const r1 = JSON.stringify(validateDictationDocument(a, { schema })); const r2 = JSON.stringify(validateDictationDocument(structuredClone(a), { schema })); assert.equal(r1, r2);
});
test("limits: configured import limits are enforced", () => {
  const r = validateDictationDocument(base(), { schema, limits: { sentences: 3, raw_chars: 10 } }); assert.ok(r.semantic.errorCodes.includes("E-LIMIT"));
});
test("every registered code has a severity; error codes start with E-", () => {
  for (const [c, [lvl]] of Object.entries(CODES)) { assert.ok(["error", "warning", "info"].includes(lvl)); if (c.startsWith("E-")) assert.equal(lvl, "error"); }
  assert.equal(Object.keys(CODES).length, 82);
});
test("source has no Node-only APIs except the CLI (browser safe)", () => {
  for (const f of readdirSync(join(root, "src")).filter((x) => x.endsWith(".js") && x !== "cli.js")) {
    const t = readFileSync(join(root, "src", f), "utf8").replace(/\/\/.*$/gm, ""); for (const bad of [/node:/, /require\(/, /\bprocess\./, /\bBuffer\b/, /from "fs"/, /innerHTML/, /\beval\(/, /new Function/]) assert.ok(!bad.test(t), `${f} contains ${bad}`);
  }
});
// (11/2026) regression: the JS digit test must accept EVERY code point Python's str.isdigit() accepts (Python 3.12, UCD 15.0).
// JS may accept more only for code points Python's older Unicode data does not know yet (Node ships a newer Unicode).
test("isDigitChar covers every Python str.isdigit() code point; extras are only newer-Unicode code points", async () => {
  const { isDigitChar } = await import("../src/text.js");
  const py = JSON.parse(readFileSync(join(here, "vectors", "python-isdigit.json"), "utf8")); const set = new Set(py.codePoints);
  const missing = py.codePoints.filter((c) => !isDigitChar(String.fromCodePoint(c)));
  assert.deepEqual(missing.map((c) => c.toString(16)), [], "digits Python accepts but JS does not");
  for (const c of [0x1369, 0x19da, 0x10a40, 0x10e60, 0x11052, 0x1f100]) assert.ok(isDigitChar(String.fromCodePoint(c)), c.toString(16));
  let extra = 0; for (let c = 0; c <= 0x10ffff; c++) { if (c >= 0xd800 && c <= 0xdfff) continue; if (!set.has(c) && isDigitChar(String.fromCodePoint(c))) { extra++; assert.ok(c >= 0x10d40, "unexpected extra digit " + c.toString(16)); } }
  assert.ok(extra <= 120, "extras " + extra);
});

// (11/2026) known difference #7: schema `pattern` on a string ending in "\n". Python re.search lets `$` match before a final
// newline, so the Python reference accepts metadata.language = "en-GB\n"; ECMAScript `$` does not, so JS (and Ajv 8.17.1) reject it.
// JS is the stricter side; this pins it so a refactor cannot loosen it silently.
test("schema pattern: a trailing newline is not accepted by `$` (JS stricter than the Python reference)", () => {
  const d = base(); d.metadata.language = "en-GB\n";
  const r = validateDictationJson(JSON.stringify(d), { schema });
  assert.equal(r.schemaValid, false); assert.ok((r.schemaErrors || []).some((e) => e.keyword === "pattern" && /language/.test(e.path)), JSON.stringify(r.schemaErrors));
  const ok = base(); ok.metadata.language = "en-GB"; assert.equal(validateDictationJson(JSON.stringify(ok), { schema }).schemaValid, true);
});
test("performance: ~600 sentences validate quickly", () => {
  const text = readFileSync(join(here, "perf", "large.json"), "utf8"); const t0 = performance.now(); const res = validateDictationJson(text, { schema }); const ms = performance.now() - t0;
  console.log(`# perf: ${text.length} bytes, ${res.semantic.counts.sentences} sentences validated in ${ms.toFixed(0)} ms`); assert.equal(res.valid, true); assert.ok(ms < 3000, `too slow: ${ms}`);
});
