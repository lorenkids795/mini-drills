// DEV-ONLY independent cross-check (NOT part of the shipped validator, which has zero dependencies).
// Compares schema validity of the JS evaluator, the Python reference and AJV (Draft 2020-12, ajv-formats) over test/corpus.
// Setup (once, in any scratch folder):  npm install ajv@8.17.1 ajv-formats@3.0.1      Run:  node tools/ajv-crosscheck.mjs /path/to/scratch/node_modules
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compileSchema } from "../src/schema-subset.js";
const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, "..");
const nm = process.argv[2]; if (!nm) { console.error("usage: node tools/ajv-crosscheck.mjs /path/to/node_modules"); process.exit(2); }
const require = createRequire(join(nm, "x.js")); const Ajv2020 = require("ajv/dist/2020").default; const addFormats = require("ajv-formats");
const schema = JSON.parse(readFileSync(join(root, "schema", "dictation-schema-v1.json"), "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true }); addFormats(ajv); const validate = ajv.compile(schema); const mine = compileSchema(schema);
const ref = JSON.parse(readFileSync(join(root, "parity", "python-reference-results.json"), "utf8"));
const rows = { files: 0, jsEqAjv: 0, jsNeAjv: [], pyEqAjv: 0, pyNeAjv: [] };
for (const r of ref.results) {
  const doc = JSON.parse(readFileSync(join(root, "test", "corpus", r.file), "utf8")); rows.files++;
  const a = validate(doc); const j = mine(doc).valid;
  if (a === j) rows.jsEqAjv++; else rows.jsNeAjv.push({ file: r.file, js: j, ajv: a, ajvErrors: (validate.errors ?? []).slice(0, 2).map((e) => `${e.instancePath} ${e.keyword}`) });
  if (a === r.schemaValid) rows.pyEqAjv++; else rows.pyNeAjv.push({ file: r.file, python: r.schemaValid, ajv: a, ajvErrors: (validate.errors ?? []).slice(0, 2).map((e) => `${e.instancePath} ${e.keyword}`) });
}
writeFileSync(join(root, "parity", "ajv-crosscheck-report.json"), JSON.stringify({ ajv: "8.17.1", ajvFormats: "3.0.1", ...rows }, null, 1));
console.log(`files=${rows.files} js==ajv:${rows.jsEqAjv} js!=ajv:${rows.jsNeAjv.length} python==ajv:${rows.pyEqAjv} python!=ajv:${rows.pyNeAjv.length}`);
for (const x of rows.jsNeAjv.slice(0, 8)) console.log("JS vs AJV", JSON.stringify(x));
for (const x of rows.pyNeAjv.slice(0, 8)) console.log("PY vs AJV", JSON.stringify(x));
