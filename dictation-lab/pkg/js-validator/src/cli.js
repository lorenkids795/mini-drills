#!/usr/bin/env node
// Node CLI:  node src/cli.js FILE.json [--schema PATH] [--json] [--limits FILE] [--list-codes]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateDictationJson, CODES } from "./index.js";
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (args.includes("--list-codes")) { for (const c of Object.keys(CODES).sort()) console.log(c.padEnd(30), CODES[c][0].padEnd(8), CODES[c][1]); process.exit(0); }
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--schema" && args[args.indexOf(a) - 1] !== "--limits");
if (!file) { console.error("usage: node src/cli.js FILE.json [--schema PATH] [--json] [--limits FILE] [--list-codes]"); process.exit(2); }
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
let text; try { text = readFileSync(file, "utf8"); } catch (e) { console.error("I/O error: " + e.message); process.exit(2); }
const schema = JSON.parse(readFileSync(opt("--schema") ?? join(here, "..", "schema", "dictation-schema-v1.json"), "utf8"));
const limits = opt("--limits") ? JSON.parse(readFileSync(opt("--limits"), "utf8")) : undefined;
const res = validateDictationJson(text, { schema, limits });
if (args.includes("--json")) console.log(JSON.stringify(res, null, 2));
else {
  console.log("file: " + file); console.log(`schema valid: ${res.schemaValid} (${res.schemaErrors.length} errors)`);
  const s = res.semantic; console.log("semantic errors:", JSON.stringify(s.errorCodes)); console.log("warnings:", JSON.stringify(s.warningCodes)); console.log("info:", JSON.stringify(s.infoCodes));
  console.log(`gate: ${s.gate}  eligibility: ${s.publicationEligibility} ${JSON.stringify(s.eligibilityReasons ?? [])}`);
  if (s.counts) console.log("counts:", JSON.stringify(s.counts));
  console.log("NOTE: a clean result is not audio verification and not publication approval.");
}
process.exit(res.valid ? 0 : 1);
