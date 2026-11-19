#!/usr/bin/env node
// Adapter for dictation-golden-test-runner.py:  python dictation-golden-test-runner.py --adapter "node ../hybrid-engine/test/golden-adapter.js [SUITE]"
// SUITE = folder name next to hybrid-engine (default golden-tests-v1.1; golden-tests = the unchanged v2 suite, used for the difference report).
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { dispatch } from "./golden-dispatch.js";
const here = dirname(fileURLToPath(import.meta.url)); const req = JSON.parse(readFileSync(0, "utf8").split("\n")[0]);
const res = dispatch(req.kind, req.input, join(here, "..", "..", process.argv[2] || "golden-tests-v1.1", req.baseline));
console.log(JSON.stringify(res === null ? { unsupported: true } : { result: res }));
