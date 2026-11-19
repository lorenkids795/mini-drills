// Deterministic seeded randomness (mulberry32) and the Level 1 tile shuffle. Same seed and input give the same result on every platform.
export function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hashSeed(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
/** Fisher-Yates with a seeded generator. Never returns the original order when there is more than one element and at least two distinct values (a rotation by one is applied if needed). */
export function shuffle(list, seed) {
  const a = list.slice(), rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
  if (a.length > 1 && same(a, list) && new Set(list).size > 1) a.push(a.shift());
  if (a.length > 1 && same(a, list) && new Set(list).size > 1) { const t = a[0]; a[0] = a[1]; a[1] = t; }
  return a;
}
