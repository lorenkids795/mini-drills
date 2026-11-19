// Every one of the 82 registered codes must be produced by at least one corpus document (so none is untested).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateSemantic, CODES } from "../src/index.js";
const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, "..");
test("code coverage over the corpus", () => {
  const seen = new Map();
  for (const sub of readdirSync(join(here, "corpus"))) for (const f of readdirSync(join(here, "corpus", sub))) {
    const text = readFileSync(join(here, "corpus", sub, f), "utf8"); const rep = validateSemantic(JSON.parse(text), null, text.length);
    for (const c of [...rep.errorCodes, ...rep.warningCodes, ...rep.infoCodes]) if (!seen.has(c)) seen.set(c, `${sub}/${f}`);
  }
  { const text = readFileSync(join(here, "corpus", "rev1-fixtures", "p01_base_ai_eligible.json"), "utf8"); const rep = validateSemantic(JSON.parse(text), { sentences: 3 }, text.length); for (const c of rep.errorCodes) if (!seen.has(c)) seen.set(c, "p01 with limits override {sentences: 3}"); }
  const missing = Object.keys(CODES).filter((c) => !seen.has(c));
  writeFileSync(join(root, "parity", "code-coverage.json"), JSON.stringify({ registered: Object.keys(CODES).length, produced: seen.size, missing, firstSeenIn: Object.fromEntries([...seen].sort()) }, null, 1));
  console.log(`# coverage: ${seen.size}/${Object.keys(CODES).length} codes produced by the corpus; missing: ${JSON.stringify(missing)}`);
  assert.deepEqual(missing, []);
});
