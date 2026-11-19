// Cross-language parity: JS validator vs the recorded results of the Python reference validator + jsonschema, over test/corpus (533 files).
// Documented divergences are listed in DIVERGENCES below; any other difference fails the test. Writes parity/js-parity-report.json.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compileSchema, validateSemantic } from "../src/index.js";
const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, "..");
const schema = JSON.parse(readFileSync(join(root, "schema", "dictation-schema-v1.json"), "utf8")); const check = compileSchema(schema);
const ref = JSON.parse(readFileSync(join(root, "parity", "python-reference-results.json"), "utf8"));
const strip = (rep) => { const { validatorVersion, disclaimer, fatal, ...rest } = rep; return rest; };
const DIVERGENCES = {
  "date-time": "Python jsonschema ignores format date-time (no RFC 3339 package installed); the JS evaluator enforces RFC 3339.",
};
test("parity with the Python reference over the whole corpus", () => {
  const summary = { files: 0, schemaAgree: 0, schemaDivergent: [], semanticAgree: 0, semanticMismatch: [], fatalBothAgree: 0, byFolder: {} };
  for (const r of ref.results) {
    const text = readFileSync(join(here, "corpus", r.file), "utf8"); const doc = JSON.parse(text); const folder = r.file.split("/")[0];
    summary.files++; summary.byFolder[folder] = (summary.byFolder[folder] ?? 0) + 1;
    const sc = check(doc);
    if (sc.valid === r.schemaValid) summary.schemaAgree++;
    else { const onlyFormat = !sc.valid && r.schemaValid && sc.errors.every((e) => e.keyword === "format"); summary.schemaDivergent.push({ file: r.file, js: sc.valid, python: r.schemaValid, explained: onlyFormat ? "date-time" : null }); }
    const js = validateSemantic(doc, null, Buffer.byteLength(text, "utf8"));
    if (r.semantic.fatal) { if (js.errorCodes.includes("FATAL-STRUCTURE")) summary.fatalBothAgree++; else summary.semanticMismatch.push({ file: r.file, why: "python fatal, js not" }); continue; }
    const a = JSON.stringify(strip(js)), b = JSON.stringify(strip(r.semantic));
    if (a === b) summary.semanticAgree++; else {
      const diff = []; for (const k of Object.keys(strip(r.semantic))) if (JSON.stringify(strip(js)[k]) !== JSON.stringify(r.semantic[k])) diff.push(k);
      summary.semanticMismatch.push({ file: r.file, keys: diff, js: strip(js)[diff[0]], python: r.semantic[diff[0]] });
    }
  }
  writeFileSync(join(root, "parity", "js-parity-report.json"), JSON.stringify({ divergencesDocumented: DIVERGENCES, ...summary }, null, 1));
  console.log(`# parity: files=${summary.files} schemaAgree=${summary.schemaAgree} schemaDivergent=${summary.schemaDivergent.length} semanticAgree=${summary.semanticAgree} semanticMismatch=${summary.semanticMismatch.length}`);
  const unexplained = summary.schemaDivergent.filter((d) => !d.explained);
  assert.deepEqual(unexplained, [], "unexplained schema divergences");
  assert.deepEqual(summary.semanticMismatch.slice(0, 5), [], "semantic mismatches (first 5 shown)");
});
