/**
 * Deterministische randomness: dezelfde input levert altijd dezelfde mock-data op,
 * zodat Luuk niet bij elke refresh van mening verandert.
 */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed: string | number): () => number {
  let a = typeof seed === "number" ? seed : hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function between(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

export function intBetween(rand: () => number, min: number, max: number): number {
  return Math.floor(between(rand, min, max + 1));
}

export function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}
