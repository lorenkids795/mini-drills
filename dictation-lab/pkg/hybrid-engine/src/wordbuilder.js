// Level 1 tile interaction model (contract C4). Tiles keep stable ids; the display order is a seeded shuffle that is never the correct order.
import { tokenize, displayTokens } from "./normalize.js";
import { align } from "./align.js";
import { shuffle } from "./prng.js";
export class WordBuilder {
  /** tiles: [{id, text}] in DISPLAY (pool) order. */
  constructor(tiles, expectedText) { this.order = tiles.map((t) => t.id); this.text = new Map(tiles.map((t) => [t.id, t.text])); this.placed = []; this.expectedText = expectedText; }
  /** Build from a sentence with a seeded shuffle. distractors: extra single-word tiles. */
  static fromSentence(cleanText, seed, distractors = []) {
    const toks = displayTokens(cleanText); // display texts keep case and meaningful symbols (£35, 20%, -5, .5); tokenize(tile) is the scoring token
    const all = [...toks.map((t, i) => ({ id: "w" + (i + 1), text: t })), ...distractors.map((t, i) => ({ id: "d" + (i + 1), text: t }))];
    const ids = shuffle(all.map((t) => t.id), seed); const byId = new Map(all.map((t) => [t.id, t]));
    return new WordBuilder(ids.map((i) => byId.get(i)), cleanText);
  }
  get pool() { return this.order.filter((i) => !this.placed.includes(i)); }
  place(id) { if (this.order.includes(id) && !this.placed.includes(id)) { this.placed.push(id); return true; } return false; } // a second click on the same tile is ignored
  remove(id) { const i = this.placed.indexOf(id); if (i < 0) return false; this.placed.splice(i, 1); return true; }
  move(id, to) { const i = this.placed.indexOf(id); if (i < 0) return false; this.placed.splice(i, 1); this.placed.splice(Math.max(0, Math.min(to, this.placed.length)), 0, id); return true; }
  reset() { this.placed = []; }
  texts() { return this.placed.map((i) => this.text.get(i)); }
  check() { const a = this.texts().flatMap(tokenize); if (!a.length) return { rejected: "empty_answer" }; const e = tokenize(this.expectedText); const { lcs } = align(e, a); return { lcs, den: Math.max(e.length, a.length), exact: e.length === a.length && e.every((x, i) => x === a[i]) }; }
}
export function runL1Events(inp) {
  const wb = new WordBuilder(inp.tiles, inp.expectedText); let chk;
  for (const ev of inp.events) { if (ev.op === "place") wb.place(ev.tile); else if (ev.op === "remove") wb.remove(ev.tile); else if (ev.op === "move") wb.move(ev.tile, ev.to); else if (ev.op === "check") chk = wb.check(); }
  const res = { pool: wb.pool, placed: [...wb.placed] }; if (chk !== undefined) res.check = chk; return res;
}
