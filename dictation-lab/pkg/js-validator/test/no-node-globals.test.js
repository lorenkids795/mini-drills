// The shipped validator (everything except src/cli.js) must run with Node-only globals removed, as in a browser.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, "..");
test("validator runs with process, Buffer, require and module removed", () => {
  const sp = join(root, "schema", "dictation-schema-v1.json"), dp = join(root, "test", "corpus", "demos", "baseline-harbour-museum.rev1.json"); // read in the child BEFORE the globals go (Windows limits command-line length)
  const code = `import { readFileSync } from "node:fs"; const schema = readFileSync(${JSON.stringify(sp)}, "utf8"), doc = readFileSync(${JSON.stringify(dp)}, "utf8"); const keep = process.exit.bind(process); const w = process.stdout.write.bind(process.stdout);
    for (const g of ["Buffer", "require", "module", "__dirname", "__filename", "global", "setImmediate"]) { try { Object.defineProperty(globalThis, g, { value: undefined, configurable: true }); } catch {} }
    Object.defineProperty(globalThis, "process", { value: undefined, configurable: true });
    const m = await import(${JSON.stringify(pathToFileURL(join(root, "src", "index.js")).href)});
    const r = m.validateDictationJson(doc, { schema: JSON.parse(schema) }); const bad = m.validateDictationJson("{", { schema: {} });
    const ok = r.valid === true && r.semantic.gate === "GATE_PASS" && bad.valid === false && m.sha256Utf8("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    w(JSON.stringify(ok)); keep(ok ? 0 : 3);`;
  const res = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8" }); assert.equal(res.status, 0, res.stderr); assert.equal(res.stdout, "true");
});
