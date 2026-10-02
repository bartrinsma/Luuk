import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { between, intBetween, seededRandom } from "@/lib/seed";

export interface SeoCheck {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface SeoReport {
  url: string;
  hostname: string;
  loadTimeMs: number;
  pageSizeKb: number;
  httpStatus: number | null;
  https: boolean;
  mobileScore: number;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  imagesWithoutAlt: number;
  imageCount: number;
  checks: SeoCheck[];
}

export interface SeoResult {
  report: SeoReport;
  /** "live" = zelf opgehaald, "pagespeed" = + Google PSI, "demo" = gesimuleerd */
  source: "live" | "pagespeed" | "demo";
}

const MAX_BYTES = 3_000_000;

/**
 * 1. Haal de pagina zelf op (echte laadtijd, echte meta-tags).
 * 2. Optioneel: Google PageSpeed Insights voor de mobiele score (PAGESPEED_API_KEY).
 * 3. Lukt niets: geloofwaardige demo-data. Luuk roast hoe dan ook.
 */
export async function analyzeWebsite(url: URL): Promise<SeoResult> {
  try {
    await assertPublicHost(url.hostname);
    const live = await fetchAndAnalyze(url);
    const psi = await fetchPageSpeedScore(live.url).catch(() => null);
    if (psi !== null) return { report: { ...live, mobileScore: psi }, source: "pagespeed" };
    return { report: live, source: "live" };
  } catch (err) {
    console.warn(`[seo] fallback naar demo voor ${url.hostname}:`, (err as Error).message);
    return { report: mockReport(url), source: "demo" };
  }
}

/** Basale SSRF-bescherming: geen localhost, geen interne netwerken. */
async function assertPublicHost(hostname: string): Promise<void> {
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(hostname)) throw new Error("niet-publieke host");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) throw new Error("niet-publiek adres");
  }
}

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

async function fetchAndAnalyze(url: URL): Promise<SeoReport> {
  const start = performance.now();
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LuukBot/1.0; +https://luuk.si)", Accept: "text/html" },
    cache: "no-store",
  });
  const finalUrl = new URL(res.url || url.href);
  await assertPublicHost(finalUrl.hostname);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!/html/i.test(res.headers.get("content-type") ?? "html")) throw new Error("geen HTML");

  const html = await readLimited(res);
  const loadTimeMs = Math.round(performance.now() - start);
  const pageSizeKb = Math.round(new TextEncoder().encode(html).length / 1024);

  const title = matchText(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = metaContent(html, "name", "description");
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesWithoutAlt = imgs.filter((t) => !/\balt\s*=\s*["'][^"']+["']/i.test(t)).length;
  const viewport = metaContent(html, "name", "viewport");
  const ogTitle = metaContent(html, "property", "og:title");
  const canonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  const lang = /<html[^>]*\blang=["'][^"']+["']/i.test(html);
  const https = finalUrl.protocol === "https:";

  const report: Omit<SeoReport, "checks" | "mobileScore"> = {
    url: finalUrl.href,
    hostname: finalUrl.hostname,
    loadTimeMs,
    pageSizeKb,
    httpStatus: res.status,
    https,
    title,
    metaDescription,
    h1Count,
    imagesWithoutAlt,
    imageCount: imgs.length,
  };

  const checks = buildChecks({ ...report, viewport: !!viewport, ogTitle: !!ogTitle, canonical, lang });
  return { ...report, checks, mobileScore: estimateMobileScore(loadTimeMs, pageSizeKb, checks) };
}

async function readLimited(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function matchText(html: string, re: RegExp): string | null {
  const m = re.exec(html);
  const text = m?.[1]?.replace(/\s+/g, " ").trim();
  return text ? decodeEntities(text) : null;
}

function metaContent(html: string, attr: string, value: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find((t) => new RegExp(`${attr}\\s*=\\s*["']${value}["']`, "i").test(t));
  const content = tag && /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1]?.trim();
  return content ? decodeEntities(content) : null;
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

interface CheckInput {
  https: boolean;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  imagesWithoutAlt: number;
  imageCount: number;
  loadTimeMs: number;
  pageSizeKb: number;
  viewport: boolean;
  ogTitle: boolean;
  canonical: boolean;
  lang: boolean;
}

function buildChecks(i: CheckInput): SeoCheck[] {
  const titleLen = i.title?.length ?? 0;
  const descLen = i.metaDescription?.length ?? 0;
  return [
    { id: "speed", label: "Laadtijd", pass: i.loadTimeMs < 2500, detail: `${(i.loadTimeMs / 1000).toFixed(1).replace(".", ",")} s` },
    { id: "https", label: "HTTPS", pass: i.https, detail: i.https ? "Versleuteld" : "Onversleuteld verkeer" },
    { id: "title", label: "Title-tag", pass: titleLen >= 10 && titleLen <= 65, detail: i.title ? `${titleLen} tekens` : "Ontbreekt" },
    { id: "description", label: "Meta description", pass: descLen >= 50 && descLen <= 165, detail: i.metaDescription ? `${descLen} tekens` : "Ontbreekt" },
    { id: "h1", label: "H1-tag", pass: i.h1Count === 1, detail: i.h1Count === 0 ? "Geen H1" : `${i.h1Count}× H1` },
    { id: "viewport", label: "Mobiele viewport", pass: i.viewport, detail: i.viewport ? "Aanwezig" : "Ontbreekt" },
    { id: "alt", label: "Alt-teksten", pass: i.imagesWithoutAlt === 0, detail: i.imageCount ? `${i.imagesWithoutAlt}/${i.imageCount} zonder alt` : "Geen afbeeldingen" },
    { id: "og", label: "Open Graph", pass: i.ogTitle, detail: i.ogTitle ? "og:title aanwezig" : "Geen social preview" },
    { id: "canonical", label: "Canonical", pass: i.canonical, detail: i.canonical ? "Ingesteld" : "Ontbreekt" },
    { id: "lang", label: "Taal-attribuut", pass: i.lang, detail: i.lang ? "Ingesteld" : "Ontbreekt" },
    { id: "weight", label: "HTML-gewicht", pass: i.pageSizeKb < 500, detail: `${i.pageSizeKb} KB` },
  ];
}

function estimateMobileScore(loadTimeMs: number, pageSizeKb: number, checks: SeoCheck[]): number {
  const speed = Math.max(0, 100 - Math.max(0, loadTimeMs - 800) / 45);
  const weight = Math.max(0, 100 - pageSizeKb / 15);
  const hygiene = (checks.filter((c) => c.pass).length / checks.length) * 100;
  return Math.round(speed * 0.5 + weight * 0.15 + hygiene * 0.35);
}

async function fetchPageSpeedScore(url: string): Promise<number | null> {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) return null;
  const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${key}`;
  const res = await fetch(api, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { lighthouseResult?: { categories?: { performance?: { score?: number } } } };
  const score = data.lighthouseResult?.categories?.performance?.score;
  return typeof score === "number" ? Math.round(score * 100) : null;
}

// ---------- Demo-fallback ----------

export function mockReport(url: URL): SeoReport {
  const rand = seededRandom(`seo:${url.hostname}`);
  const loadTimeMs = intBetween(rand, 900, 5200);
  const pageSizeKb = intBetween(rand, 60, 900);
  const h1Count = rand() < 0.3 ? 0 : rand() < 0.75 ? 1 : intBetween(rand, 2, 4);
  const imageCount = intBetween(rand, 4, 40);
  const imagesWithoutAlt = rand() < 0.3 ? 0 : intBetween(rand, 1, imageCount);
  const brand = url.hostname.replace(/^www\./, "").split(".")[0];
  const title = rand() < 0.15 ? null : rand() < 0.5 ? `Home` : `${capitalize(brand)} | Welkom op onze website`;
  const metaDescription = rand() < 0.4 ? null : `Welkom bij ${capitalize(brand)}. Wij zijn uw partner voor kwaliteit en service.`;

  const checks = buildChecks({
    https: rand() < 0.9,
    title,
    metaDescription,
    h1Count,
    imagesWithoutAlt,
    imageCount,
    loadTimeMs,
    pageSizeKb,
    viewport: rand() < 0.85,
    ogTitle: rand() < 0.5,
    canonical: rand() < 0.45,
    lang: rand() < 0.7,
  });

  return {
    url: url.href,
    hostname: url.hostname,
    loadTimeMs,
    pageSizeKb,
    httpStatus: 200,
    https: checks.find((c) => c.id === "https")!.pass,
    mobileScore: Math.round(clamp(estimateMobileScore(loadTimeMs, pageSizeKb, checks) + between(rand, -8, 8), 5, 99)),
    title,
    metaDescription,
    h1Count,
    imagesWithoutAlt,
    imageCount,
    checks,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
