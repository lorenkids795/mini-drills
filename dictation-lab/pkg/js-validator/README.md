# Dictation Lab import validator (JavaScript)

Zero-dependency ES-module validator for the Mini Drills Dictation Lab import contract (`schemaVersion` 1.1, Rev1).
It runs in browsers and in Node 18+, and gives the same results as the Python reference validator
(`../rev1-reference/dictation-semantic-validator.py` + `jsonschema`) on the 533-file parity corpus.

A clean result means "the file is internally consistent". It is **not** audio verification and **not** publication approval:
stage 3 (a teacher checks the transcript against the audio and approves) is never automatic.

## Files

| Path | What it is |
|---|---|
| `src/index.js` | Public API (below) |
| `src/schema-subset.js` | Own JSON Schema 2020-12 evaluator for exactly the keywords the schema uses; **fails closed** on any other keyword |
| `src/semantic.js` | Stage 2 semantic rules (port of the Python reference) |
| `src/codes.js` | The 82 diagnostic codes with severity and meaning |
| `src/text.js`, `src/sha256.js`, `src/rules.js` | UTF-16 / code-point helpers, synchronous SHA-256, shared rule helpers |
| `src/cli.js` | Node-only command line (the only file that imports `node:*`) |
| `schema/dictation-schema-v1.json` | The schema (byte-identical to `rev1-reference/dictation-schema-v1.json`, sha256 `b0509432…b8deb`) |
| `browser-example.html` | Browser page: paste or open a file, see the report. Has a headless self-test (`?selftest=1`) |
| `test/` | `node --test` suites and the parity corpus |
| `parity/` | Recorded Python results, the last JS parity report, the Ajv cross-check report, code coverage |
| `tools/` | Dev-only: corpus generator (Python), Ajv cross-check, code-table generator, perf document generator |

## Public API

```js
import { parseDictationJson, validateDictationDocument, validateDictationJson, compileSchema, validateSemantic, CODES, VERSION, sha256Utf8, DEFAULT_PARSE_LIMITS } from "./src/index.js";
```

| Function | Input | Output |
|---|---|---|
| `parseDictationJson(text, limits?)` | untrusted string; `limits = {maxBytes = 2 000 000, maxDepth = 64}` | `{ok, doc?, bytes?, diagnostics[]}`. Never throws |
| `validateDictationDocument(doc, {schema, limits?, bytes?, compiled?, semanticWhenSchemaInvalid = true})` | parsed object + the parsed schema (required) | `{schemaValid, schemaErrors[], semantic, valid}` |
| `validateDictationJson(text, {schema, limits?, parseLimits?})` | string | same as above, plus `parse[]` when the text did not parse. Never throws |
| `compileSchema(schema)` | schema object | `(doc) => {valid, errors[{path, keyword, message, schemaPath}]}`; reuse it for many documents (`options.compiled`) |
| `validateSemantic(doc, limits, fileBytes)` | parsed object | the semantic report alone |
| `CODES` | | `{code: [severity, meaning]}` for all 82 codes |
| `sha256Utf8(string)` | | lowercase hex SHA-256 of the UTF-8 bytes |

`valid === true` only when the schema passes **and** there is no semantic error. Warnings and info never make a file invalid.

### Semantic report (`result.semantic`)

Same shape as the Python reference report: `errorCodes[]`, `warningCodes[]`, `infoCodes[]`, `errors[]`, `warnings[]`, `info[]`
(each `{code, path, message}`), `gate`, `publicationEligibility`, `eligibilityReasons[]`, `counts{}`, `validatorVersion`, `disclaimer`.
A structure too malformed for stage 2 gives `fatal` and `errorCodes: ["FATAL-STRUCTURE"]` instead of throwing.

| `gate` | Meaning | Hybrid engine (`createRun`) |
|---|---|---|
| `GATE_PASS` | consistent, no open audit issue | runnable |
| `GATE_PASS_WITH_EXCLUSIONS` | consistent; some sentences blocked by open issues are excluded | runnable (blocked sentences never become items) |
| `GATE_NOT_AUDITED` | consistent but never audited (Transcript Only); `publicationEligibility: requires_teacher_action` | runnable for practice; publishing still needs the teacher (decision P-04) |
| `GATE_BLOCKED` | errors | refused |

## Use in a browser

```html
<script type="module">
  import { validateDictationJson } from "./js-validator/src/index.js";
  const schema = await (await fetch("./js-validator/schema/dictation-schema-v1.json")).json();
  const report = validateDictationJson(textFromTextareaOrFile, { schema });
  // Render report strings with textContent only. They contain text copied from the imported file.
</script>
```

ES modules do not load from `file://`. To try `browser-example.html`, serve this folder: `python -m http.server` and open
`http://localhost:8000/browser-example.html`. Nothing leaves the browser.

Browser features used: ES2020 modules, `??` / `?.`, no BigInt, Unicode property escapes (`\p{L}`), RegExp lookbehind
(in `hasLoneSurrogate`), `TextEncoder`, `String.prototype.normalize`. Minimum: Chrome/Edge 80, Firefox 78, **Safari 16.4**
(lookbehind). Verified in this package: headless Chrome 157 and Edge 157 (`node ../tools/browser-selftest.mjs <browser>`).

## Use in Node

```bash
node src/cli.js FILE.json            # human summary, exit 0 when valid, 1 when not, 2 on I/O error
node src/cli.js FILE.json --json     # full report
node src/cli.js --list-codes
npm test                             # all suites (no install needed)
```

## Tests

| Suite | What it proves |
|---|---|
| `test/parity.test.js` | Over all 533 corpus files: semantic report byte-identical to the recorded Python report (533/533); schema validity equal to Python except the 7 documented `date-time` files |
| `test/coverage.test.js` | Every one of the 82 codes is produced by at least one corpus file |
| `test/unit.test.js` | SHA-256 vs `node:crypto`, Rev1 JS parity vectors, schema evaluator fails closed, hostile input never throws or pollutes prototypes, determinism, limits, browser-safe source, performance (~600 sentences in well under a second) |
| `test/no-node-globals.test.js` | The validator runs with `process`, `Buffer`, `require`, `module`, `global` removed |
| `tools/ajv-crosscheck.mjs` (manual) | Schema validity of the JS evaluator vs Ajv 8.17.1 + ajv-formats 3.0.1: 533/533 equal; Python vs Ajv 526/533 (the same 7 `date-time` files) |

`parity/python-reference-results.json` is a **recording**. It was regenerated independently on 2026-11-17 from the
corpus with Python 3.12.7 + jsonschema 4.26.0 and matched the recording for 533/533 files (see `../../qa-results.md`).

## Known differences between the Python reference and this validator

| # | Area | Python reference | JavaScript | Effect | Evidence |
|---|---|---|---|---|---|
| 1 | `format: date-time` | ignored (jsonschema has no RFC 3339 checker unless an optional package is installed) | enforced (RFC 3339) | 7 corpus files are schema-valid in Python, invalid in JS; Ajv agrees with JS | `parity/js-parity-report.json`, `parity/ajv-crosscheck-report.json` |
| 2 | `str.isdigit()` | Unicode 15.0 (Python 3.12) `Numeric_Type = Digit or Decimal` | `isDigitChar`: `\p{Nd}` plus a fixed list of superscript / circled digits, evaluated with the engine's Unicode tables (Node 24: Unicode 17) | r2 (2026-11-17): the 43 code points Python counted and JS missed (Ethiopic U+1369–1371, New Tai Lue U+19DA, Kharoshthi U+10A40–10A43, Rumi U+10E60–10E68, Brahmi U+11052–1105A, U+1F100–1F10A) were **added** to `isDigitChar`. JS now accepts every Python digit; it still accepts some extra code points that only newer Unicode (Node) knows. Used only for "does this surface contain a digit" hints; no corpus file is affected | `test/unit.test.js` ("isDigitChar covers every Python str.isdigit() code point"), fixture `test/vectors/python-isdigit.json` (808 code points from Python 3.12) |
| 3 | Regex `\s` | Python `\s` also matches U+001C–U+001F and U+0085 | JS `\s` also matches U+FEFF | only in the speaker-label leak check of `cleanText` (`E-CLEAN-METADATA-LEAK`); `cleanText` with those characters is already flagged elsewhere | measured |
| 4 | Lower-casing | `str.lower()` | `String.prototype.toLowerCase()` (locale-independent) | identical on the Unicode corpus (Turkish `İ` → `i̇`, final sigma, `ß` checked in `test/corpus/unicode`). Not proven for every script | parity corpus |
| 5 | String indexing | code points, converted with explicit UTF-16 helpers | UTF-16 natively | none: all offsets in the contract are UTF-16; length limits count code points on both sides | `u01`–`u16` corpus files |
| 6 | Lone surrogates | `surrogatepass` encoding | detected by regex | same code (`E-UNICODE-INVALID`) | `u16`, `n42` |
| 7 | Schema `pattern` and a final newline | `re.search`: `$` also matches just before a final `
`, so `metadata.language = "en-GB
"` is schema-valid | ECMAScript `$` matches only at the end: schema-invalid (`pattern`). Ajv 8.17.1 agrees with JS | JS is stricter. No corpus file is affected (no corpus string ends in a newline in a patterned field). The Python reference is not changed (it is a recording of the reference behaviour) | `test/unit.test.js` ("schema pattern: a trailing newline…"); checked with Ajv on 2026-11-17 |

The earlier handoff also listed "ECMA `$` does not match before a final newline". Reviewed on 2026-11-17: the only anchored
pattern on raw text (`E-BREAK-SPAN`) uses `re.fullmatch` in Python and `^…$` without the `m` flag in JS, which are equivalent.
No divergence was found there. It **does** exist for the JSON Schema `pattern` keyword: see row 7 (found in r2).

## Parity checks that are not possible in this package

The two real Cambridge example lessons (`cam19-t1-s1`, referenced in `src-rev1-checksums.txt`) are **not** in this package,
by design (copyright). Their parity run could not be repeated here. To run it privately: put the two files in a folder outside
the package, run the Python reference and `node src/cli.js FILE --json` on each, and compare `semantic` after removing
`validatorVersion` and `disclaimer`.
