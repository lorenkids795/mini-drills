// Minimal JSON Schema (Draft 2020-12) evaluator covering EXACTLY the keywords used by dictation-schema-v1.json (schemaVersion 1.1).
// Zero dependencies. Fails closed: compileSchema() throws if the schema uses any keyword this evaluator does not implement,
// so a future schema change cannot be silently under-validated. It is NOT a general-purpose JSON Schema library.
import { cpLength } from "./text.js";

const ANNOTATIONS = new Set(["$schema", "$id", "$comment", "title", "description", "default", "examples", "$defs"]);
const SUPPORTED = new Set([...ANNOTATIONS, "type", "enum", "const", "pattern", "minLength", "maxLength", "format", "minimum", "maximum", "exclusiveMinimum", "minItems", "maxItems", "uniqueItems",
  "items", "contains", "minContains", "maxContains", "properties", "required", "additionalProperties", "dependentRequired", "allOf", "anyOf", "not", "if", "then", "else", "$ref"]);

export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}
const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const typeOf = (x) => (x === null ? "null" : Array.isArray(x) ? "array" : typeof x === "number" ? (Number.isInteger(x) ? "integer" : "number") : typeof x);
const typeOk = (t, x) => { const ty = typeOf(x); return t === ty || (t === "number" && ty === "integer"); };

// RFC 3339 date-time (strict: 'T' separator, numeric offset or Z, real calendar date, leap second allowed)
export function isRfc3339DateTime(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-](\d{2}):(\d{2}))$/.exec(s); if (!m) return false;
  const [y, mo, d, h, mi, se] = [1, 2, 3, 4, 5, 6].map((i) => Number(m[i]));
  if (mo < 1 || mo > 12 || h > 23 || mi > 59 || se > 60) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (d < 1 || d > dim) return false;
  if (m[9] !== undefined && (Number(m[9]) > 23 || Number(m[10]) > 59)) return false;
  return true;
}

export function checkSchemaKeywords(schema) {
  const bad = new Set();
  const walk = (s, where) => {
    if (!isObj(s)) return;
    for (const [k, v] of Object.entries(s)) {
      if (!SUPPORTED.has(k)) bad.add(`${where}/${k}`);
      if (k === "properties" || k === "$defs") { for (const [kk, vv] of Object.entries(v)) walk(vv, `${where}/${k}/${kk}`); }
      else if (k === "dependentRequired") continue;
      else if (["allOf", "anyOf"].includes(k)) v.forEach((x, i) => walk(x, `${where}/${k}/${i}`));
      else if (["items", "contains", "not", "if", "then", "else", "additionalProperties"].includes(k)) walk(v, `${where}/${k}`);
    }
  };
  walk(schema, "#"); return [...bad];
}

export function compileSchema(schema) {
  const unsupported = checkSchemaKeywords(schema);
  if (unsupported.length) throw new Error("schema-subset: unsupported keyword(s): " + unsupported.join(", "));
  const resolve = (ref) => {
    if (ref === "#") return schema;
    if (!ref.startsWith("#/")) throw new Error("schema-subset: only local $ref supported: " + ref);
    let o = schema; for (const part of ref.slice(2).split("/")) { o = o[part.replace(/~1/g, "/").replace(/~0/g, "~")]; if (o === undefined) throw new Error("unresolved $ref " + ref); } return o;
  };
  const regexCache = new Map(); const re = (p) => { if (!regexCache.has(p)) regexCache.set(p, new RegExp(p, "u")); return regexCache.get(p); };
  // returns true/false; pushes errors when `errs` provided
  function ev(s, x, path, errs, sp) {
    if (s === true || s === undefined) return true; if (s === false) { errs?.push({ path, keyword: "false", message: "schema is false", schemaPath: sp }); return false; }
    let ok = true; const fail = (keyword, message) => { ok = false; errs?.push({ path, keyword, message, schemaPath: `${sp}/${keyword}` }); };
    if (s.$ref !== undefined) { if (!ev(resolve(s.$ref), x, path, errs, `${sp}/$ref`)) ok = false; }
    if (s.type !== undefined) { const ts = Array.isArray(s.type) ? s.type : [s.type]; if (!ts.some((t) => typeOk(t, x))) { fail("type", `expected ${ts.join("|")} but got ${typeOf(x)}`); return false; } }
    if (s.enum !== undefined && !s.enum.some((v) => deepEqual(v, x))) fail("enum", "value not in enum");
    if (s.const !== undefined && !deepEqual(s.const, x)) fail("const", "value differs from const");
    if (typeof x === "string") {
      if (s.minLength !== undefined && cpLength(x) < s.minLength) fail("minLength", `shorter than ${s.minLength}`);
      if (s.maxLength !== undefined && cpLength(x) > s.maxLength) fail("maxLength", `longer than ${s.maxLength}`);
      if (s.pattern !== undefined && !re(s.pattern).test(x)) fail("pattern", "does not match pattern");
      if (s.format === "date-time" && !isRfc3339DateTime(x)) fail("format", "not an RFC 3339 date-time");
    }
    if (typeof x === "number") {
      if (s.minimum !== undefined && x < s.minimum) fail("minimum", `below ${s.minimum}`);
      if (s.maximum !== undefined && x > s.maximum) fail("maximum", `above ${s.maximum}`);
      if (s.exclusiveMinimum !== undefined && !(x > s.exclusiveMinimum)) fail("exclusiveMinimum", `not above ${s.exclusiveMinimum}`);
    }
    if (Array.isArray(x)) {
      if (s.minItems !== undefined && x.length < s.minItems) fail("minItems", `fewer than ${s.minItems} items`);
      if (s.maxItems !== undefined && x.length > s.maxItems) fail("maxItems", `more than ${s.maxItems} items`);
      if (s.uniqueItems) { outer: for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) if (deepEqual(x[i], x[j])) { fail("uniqueItems", "items not unique"); break outer; } }
      if (s.items !== undefined) x.forEach((it, i) => { if (!ev(s.items, it, `${path}[${i}]`, errs, `${sp}/items`)) ok = false; });
      if (s.contains !== undefined) {
        const n = x.filter((it) => ev(s.contains, it, path, null, sp)).length; const mn = s.minContains ?? 1;
        if (n < mn) fail("contains", `fewer than ${mn} matching items`); if (s.maxContains !== undefined && n > s.maxContains) fail("maxContains", `more than ${s.maxContains} matching items`);
      }
    }
    if (isObj(x)) {
      for (const k of s.required ?? []) if (!Object.prototype.hasOwnProperty.call(x, k)) fail("required", `missing property ${k}`);
      for (const [k, sub] of Object.entries(s.properties ?? {})) if (Object.prototype.hasOwnProperty.call(x, k) && !ev(sub, x[k], `${path}.${k}`, errs, `${sp}/properties/${k}`)) ok = false;
      if (s.additionalProperties === false) for (const k of Object.keys(x)) if (!Object.prototype.hasOwnProperty.call(s.properties ?? {}, k)) { ok = false; errs?.push({ path: `${path}.${k}`, keyword: "additionalProperties", message: `unknown property ${k}`, schemaPath: `${sp}/additionalProperties` }); }
      for (const [k, deps] of Object.entries(s.dependentRequired ?? {})) if (Object.prototype.hasOwnProperty.call(x, k)) for (const d of deps) if (!Object.prototype.hasOwnProperty.call(x, d)) fail("dependentRequired", `${k} requires ${d}`);
    }
    if (s.allOf) s.allOf.forEach((sub, i) => { if (!ev(sub, x, path, errs, `${sp}/allOf/${i}`)) ok = false; });
    if (s.anyOf && !s.anyOf.some((sub) => ev(sub, x, path, null, sp))) fail("anyOf", "no alternative matched");
    if (s.not !== undefined && ev(s.not, x, path, null, sp)) fail("not", "value must not match the subschema");
    if (s.if !== undefined) {
      if (ev(s.if, x, path, null, sp)) { if (s.then !== undefined && !ev(s.then, x, path, errs, `${sp}/then`)) ok = false; }
      else if (s.else !== undefined && !ev(s.else, x, path, errs, `${sp}/else`)) ok = false;
    }
    return ok;
  }
  return (instance) => { const errors = []; const valid = ev(schema, instance, "$", errors, "#"); return { valid, errors }; };
}
