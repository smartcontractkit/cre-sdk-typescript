// Full TypeScript port of Go's math/rand
// Complete API: Int63, Uint64, Uint32, Int31, Int, Float64, Float32, Int63n, Int31n, Intn, Perm, Seed
// See: https://cs.opensource.google/go/go/+/refs/tags/go1.22.0:src/math/rand/rand.go

export class Source {
  private s0: bigint = 0n;
  private s1: bigint = 0n;

  constructor(seed: bigint) {
    this.Seed(seed);
  }

  Seed(seed: bigint) {
    seed = BigInt.asUintN(64, seed);
    this.s0 = this.splitMix64(seed);
    this.s1 = this.splitMix64(this.s0);
  }

  private splitMix64(seed: bigint): bigint {
    seed = (seed + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    let z = seed;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    return z ^ (z >> 31n);
  }

  private next(): bigint {
    const s1 = this.s0;
    let s0 = this.s1;
    this.s0 = s0;
    s0 ^= s0 << 23n;
    this.s1 = s0 ^ s1 ^ (s0 >> 17n) ^ (s1 >> 26n);
    return BigInt.asUintN(64, this.s1 + s1);
  }

  Int63(): bigint {
    return this.next() & 0x7fffffffffffffffn;
  }

  Uint32(): number {
    return Number(this.next() >> 32n) >>> 0;
  }

  Uint64(): bigint {
    return this.next();
  }

  Int31(): number {
    return Number(this.Int63() >> 32n);
  }

  Float64(): number {
    // Use top 53 bits like Go's implementation: Int63() >> 11
    return Number(this.Int63() >> 11n) * (1.0 / 9007199254740992.0); // 1.0 / (1 << 53)
  }

  Int63n(n: bigint): bigint {
    if (n <= 0n) throw new Error("invalid argument to Int63n");
    const max = (1n << 63n) - ((1n << 63n) % n);
    let v: bigint;
    do {
      v = this.Int63();
    } while (v >= max);
    return v % n;
  }

  Int31n(n: number): number {
    if (n <= 0) throw new Error("invalid argument to Int31n");
    return Number(this.Int63n(BigInt(n)));
  }

  Intn(n: number): number {
    return this.Int31n(n);
  }

  Int(): number {
    return Number(this.Int63() >> 32n);
  }

  Float32(): number {
    // Use top 24 bits for float32 precision
    return Number(this.Int63() >> 40n) * (1.0 / 8388608.0); // 1.0 / (1 << 23)
  }

  Perm(n: number): number[] {
    const m = new Array(n);
    for (let i = 0; i < n; i++) m[i] = i;
    for (let i = 1; i < n; i++) {
      const j = Number(this.Int63n(BigInt(i + 1)));
      [m[i], m[j]] = [m[j], m[i]];
    }
    return m;
  }
}

export class Rand {
  private src: Source;

  constructor(seed: bigint) {
    this.src = new Source(seed);
  }

  Float64() {
    return this.src.Float64();
  }
  Float32() {
    return this.src.Float32();
  }
  Int63() {
    return this.src.Int63();
  }
  Int63n(n: bigint) {
    return this.src.Int63n(n);
  }
  Int31() {
    return this.src.Int31();
  }
  Int31n(n: number) {
    return this.src.Int31n(n);
  }
  Int() {
    return this.src.Int();
  }
  Intn(n: number) {
    return this.src.Intn(n);
  }
  Uint32() {
    return this.src.Uint32();
  }
  Uint64() {
    return this.src.Uint64();
  }
  Perm(n: number) {
    return this.src.Perm(n);
  }
  Seed(seed: bigint) {
    this.src.Seed(seed);
  }
}
