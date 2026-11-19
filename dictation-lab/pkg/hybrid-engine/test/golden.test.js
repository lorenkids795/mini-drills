// Runs every golden vector of the contract v1.1 suite (golden-tests-v1.1/vectors) through the real engine, in process. requires:engine_ui vectors are reported as NOT RUN, never as passed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dispatch, subset } from "./golden-dispatch.js";
const here = dirname(fileURLToPath(import.meta.url)); const gt = join(here, "..", "..", "golden-tests-v1.1");
test("golden vectors against the JavaScript engine", () => {
  const rows = { total: 0, passed: 0, failed: [], notRun: [] };
  for (const f of readdirSync(join(gt, "vectors")).sort()) {
    const doc = JSON.parse(readFileSync(join(gt, "vectors", f), "utf8"));
    for (const v of doc.vectors) {
      rows.total++;
      if (v.requires !== "oracle") { rows.notRun.push(v.id); continue; }
      const got = dispatch(v.kind, v.input, join(gt, doc.baseline));
      if (got !== null && subset(v.expected, got)) rows.passed++; else rows.failed.push({ id: v.id, expected: v.expected, got });
    }
  }
  writeFileSync(join(here, "..", "golden-engine-report.json"), JSON.stringify(rows, null, 1));
  console.log(`# golden: total=${rows.total} passed=${rows.passed} failed=${rows.failed.length} notRun(engine_ui)=${rows.notRun.length}`);
  assert.deepEqual(rows.failed.slice(0, 3), []);
});
