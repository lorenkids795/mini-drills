// Exact rational arithmetic on BigInt (no floating point in any score).
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
export class Frac {
  constructor(n, d = 1n) { n = BigInt(n); d = BigInt(d); if (d === 0n) throw new RangeError("zero denominator"); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; this.n = n / g; this.d = d / g; }
  add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  div(k) { return new Frac(this.n, this.d * BigInt(k)); }
  toJSON() { return { num: Number(this.n), den: Number(this.d) }; }
}
export const frac = (n, d) => new Frac(n, d).toJSON();
export const sumFrac = (list) => list.reduce((a, b) => a.add(b), new Frac(0n));
