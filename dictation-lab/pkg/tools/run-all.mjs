// Runs every check in the package and prints one summary line per check.
// Usage (from pkg/):  node tools/run-all.mjs [--mutation] [--browser "PATH_TO_CHROME_OR_EDGE"] [--python python3]
// Needs Node 18+ and Python 3 (stdlib; jsonschema only for the Python-reference check, which is skipped when it is missing).
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const pkg = join(dirname(fileURLToPath(import.meta.url)), ".."); const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const py = opt("--python") ?? (spawnSync("python3", ["--version"]).status === 0 ? "python3" : "python");
const steps = [
  ["validator: npm test", process.execPath, ["--test", "test/*.test.js"], join(pkg, "js-validator"), /^ℹ (pass|fail) \d+/gm],
  ["engine: npm test", process.execPath, ["--test", "test/*.test.js"], join(pkg, "hybrid-engine"), /^# golden:.*$|^ℹ (pass|fail) \d+/gm],
  ["golden v1.1 runner + JS adapter (contract v1.1)", py, ["-I", "dictation-golden-test-runner.py", "--adapter", `"${process.execPath}" ../hybrid-engine/test/golden-adapter.js`], join(pkg, "golden-tests-v1.1"), /^(oracle|mutation|integrity|baseline) .*$|^ADAPTER ENGINE.*$|^vectors: .*$|^RESULT.*$/gm],
  ["golden v2 suite, oracle only (contract v1, unchanged provenance)", py, ["-I", "dictation-golden-test-runner.py"], join(pkg, "golden-tests"), /^(oracle|mutation|integrity|baseline) .*$|^RESULT.*$/gm],
  ["v2 suite on the v1.1 engine: only intended differences", py, ["-I", "tools/check-v2-diff.py", process.execPath], join(pkg, "golden-tests-v1.1"), /^v2 suite on .*$/gm],
  ["python reference reproduced", py, ["-I", "js-validator/tools/check-python-reference.py", "."], pkg, /^recorded=.*$|No module named.*$/gm],
];
if (args.includes("--mutation")) steps.push(["engine mutation check", process.execPath, ["tools/mutation-check.mjs"], join(pkg, "hybrid-engine"), /^ENGINE MUTATION CHECK.*$/gm]);
if (opt("--browser")) steps.push(["browser self-test", process.execPath, ["tools/browser-selftest.mjs", opt("--browser")], pkg, /^(PASS|FAIL) +(homework network scan: [^,]+, \d+ answer leaks|\S+)|^browser: .*$/gm]);
let failed = 0;
for (const [name, cmd, a, cwd, pick] of steps) {
  const r = spawnSync(cmd, a, { cwd, encoding: "utf8", timeout: 900000, maxBuffer: 1 << 26, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  const out = (r.stdout ?? "") + (r.stderr ?? ""); const skipped = /No module named 'jsonschema'/.test(out);
  const ok = r.status === 0; if (!ok && !skipped) failed++;
  console.log(`${skipped ? "SKIP" : ok ? "PASS" : "FAIL"}  ${name}`); for (const m of out.match(pick) ?? []) console.log("      " + m.trim());
  if (!ok && !skipped && !(out.match(pick) ?? []).length) console.log(out.slice(-1500));
}
console.log(failed ? `OVERALL: FAIL (${failed})` : "OVERALL: PASS"); process.exit(failed ? 1 : 0);
