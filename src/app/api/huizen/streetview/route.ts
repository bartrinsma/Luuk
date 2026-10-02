import { clientIp, rateLimit } from "@/lib/rateLimit";
import { streetViewImageUrl } from "@/lib/services/housePhotos";

/**
 * GET /api/huizen/streetview?location=52.09,5.12
 * Proxy naar Google Street View Static, zodat GOOGLE_MAPS_API_KEY nooit in de browser belandt.
 */
export async function GET(request: Request) {
  const location = new URL(request.url).searchParams.get("location")?.trim() ?? "";
  const valid = /^-?\d{1,3}\.\d+,-?\d{1,3}\.\d+$/.test(location) || /^[\p{L}\d\s.,'’\-/]{5,160}$/u.test(location);

  if (!process.env.GOOGLE_MAPS_API_KEY || !valid) return new Response(null, { status: 404 });
  if (!rateLimit(`sv:${clientIp(request)}`, 60)) return new Response(null, { status: 429 });

  try {
    const res = await fetch(streetViewImageUrl(location), { signal: AbortSignal.timeout(6000) });
    if (!res.ok || !res.body) return new Response(null, { status: 404 });
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
