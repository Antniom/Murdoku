/**
 * Deterministic Mulberry32 PRNG + string hashing so every daily seed
 * produces the exact same reproducible floorplan, cast, and clues.
 */
export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface PRNG {
  next: () => number;
  int: (min: number, maxInclusive: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  shuffle: <T>(arr: readonly T[]) => T[];
  chance: (prob: number) => boolean;
}

export function createPRNG(seed: string | number): PRNG {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  if (a === 0) a = 0x9e3779b9;

  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, maxInclusive: number): number => {
    if (maxInclusive <= min) return min;
    return min + Math.floor(next() * (maxInclusive - min + 1));
  };

  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)];

  const shuffle = <T>(arr: readonly T[]): T[] => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const chance = (prob: number): boolean => next() < prob;

  return { next, int, pick, shuffle, chance };
}
