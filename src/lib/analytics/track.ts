import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { getDb } from "@/lib/db";
import { provinceFromIsoCode } from "@/lib/provinces";

/**
 * Anonieme analytics. Er wordt GEEN IP-adres opgeslagen:
 *  - bezoekers worden geteld met een hash van (dagzout + IP + browser) die elke dag wisselt,
 *    zoals Plausible/Fathom dat doen — dezelfde bezoeker is morgen onherkenbaar;
 *  - de regio komt uit de geo-headers die de host (Netlify/Vercel) al meestuurt.
 * Wegschrijven gebeurt ná het antwoord (next/server `after`), dus de gebruiker wacht er nooit op.
 */

export type EventModule = "huizen" | "autos" | "roast" | "chat" | "fotos" | "share";
export type EventAction = "search" | "photos" | "pdf" | "email" | "whatsapp";
export type EventStatus = "ok" | "invalid" | "not_found" | "error";

export interface TrackInput {
  module: EventModule;
  action?: EventAction;
  status?: EventStatus;
  input?: string | null;
  subject?: string | null;
  province?: string | null;
  city?: string | null;
  value?: number | null;
  meta?: Record<string, unknown>;
}

const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor/i;

export function track(request: Request, event: TrackInput): void {
  if (process.env.LUUK_ANALYTICS === "off") return;
  const ua = request.headers.get("user-agent") ?? "";
  if (BOT_RE.test(ua)) return;

  const visitor = visitorInfo(request);
  after(async () => {
    try {
      const db = await getDb();
      await db.query(
        `INSERT INTO luuk_events
          (module, action, status, input, subject, province, city, value, visitor_hash, visitor_region, visitor_city, visitor_country, meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          event.module,
          event.action ?? "search",
          event.status ?? "ok",
          clip(event.input, 300),
          clip(event.subject, 200),
          event.province ?? null,
          clip(event.city, 80),
          event.value ?? null,
          visitor.hash,
          visitor.region,
          visitor.city,
          visitor.country,
          JSON.stringify(event.meta ?? {}),
        ],
      );
    } catch (err) {
      console.warn("[analytics] event niet opgeslagen:", (err as Error).message);
    }
  });
}

function visitorInfo(request: Request) {
  const h = request.headers;
  const ip = h.get("x-nf-client-connection-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ANALYTICS_SALT || process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "luuk.si";
  const hash = ip ? createHash("sha256").update(`${salt}|${day}|${ip}|${h.get("user-agent") ?? ""}`).digest("hex").slice(0, 16) : null;

  let country: string | null = null;
  let region: string | null = null;
  let city: string | null = null;

  // Netlify: x-nf-geo = base64(JSON)
  const nf = h.get("x-nf-geo");
  if (nf) {
    try {
      const geo = JSON.parse(Buffer.from(nf, "base64").toString("utf8")) as {
        city?: string;
        country?: { code?: string };
        subdivision?: { code?: string; name?: string };
      };
      country = geo.country?.code ?? null;
      city = geo.city ?? null;
      region = country === "NL" ? provinceFromIsoCode(geo.subdivision?.code) : (geo.subdivision?.name ?? null);
    } catch {
      /* onleesbare header negeren */
    }
  }
  // Vercel / Cloudflare als alternatief
  country ??= h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || null;
  if (!region) {
    const code = h.get("x-vercel-ip-country-region");
    region = country === "NL" ? provinceFromIsoCode(code) : code;
  }
  city ??= h.get("x-vercel-ip-city") ? decodeURIComponent(h.get("x-vercel-ip-city")!) : null;

  return { hash, country, region, city };
}

function clip(v: string | null | undefined, max: number): string | null {
  if (!v) return null;
  const t = v.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
