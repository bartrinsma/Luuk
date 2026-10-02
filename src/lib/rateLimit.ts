/**
 * Simpele in-memory rate limit (sliding window, per serverinstantie).
 * Genoeg tegen een op hol geslagen script; voor zware productie hoort hier Redis/Upstash.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return true;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-nf-client-connection-ip") || "local";
}
