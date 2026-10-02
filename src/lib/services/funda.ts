import type { AddressQuery, ParseResult } from "@/lib/validation";

/**
 * Funda-links → adres + (waar mogelijk) advertentiegegevens.
 *
 * Stap 1 werkt altijd en zonder netwerk: het adres staat in de URL zelf, bijv.
 *   https://www.funda.nl/detail/koop/amsterdam/appartement-damrak-1-h/43123456/   (nieuw formaat)
 *   https://www.funda.nl/koop/utrecht/huis-42123456-eikenlaan-12/                  (oud formaat)
 * Stap 2 is best effort: één keer de advertentiepagina ophalen en vraagprijs, m², bouwjaar en
 * de hoofdfoto uit de metadata lezen. Funda blokkeert geautomatiseerde verzoeken vaak; dan valt
 * Luuk terug op stap 1 en vult de rest aan met het eigen waardemodel.
 */

export interface FundaListing {
  url: string;
  fundaId: string | null;
  woningtype: string | null;
  vraagprijs: number | null;
  woonoppervlakte: number | null;
  bouwjaar: number | null;
  foto: string | null;
  titel: string | null;
  /** true als de pagina zelf gelezen kon worden, false als alleen de URL is gebruikt. */
  pageRead: boolean;
}

export interface ParsedFundaUrl {
  url: string;
  fundaId: string | null;
  woningtype: string | null;
  address: Extract<AddressQuery, { mode: "adres" }>;
}

const TYPE_PREFIXES = ["appartement", "huis", "woonhuis", "parkeergelegenheid", "bouwgrond", "woonboot", "object"];

export function isFundaUrl(input: string): boolean {
  return /^\s*(https?:\/\/)?(www\.)?funda\.nl\//i.test(input);
}

export function parseFundaUrl(input: string): ParseResult<ParsedFundaUrl> {
  const fail = {
    ok: false as const,
    error: "Dat is wel Funda, maar geen woningpagina. Plak de link van de advertentie zelf, bijv. funda.nl/detail/koop/utrecht/huis-eikenlaan-12/… Sí.",
  };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return fail;
  }
  if (!/(^|\.)funda\.nl$/i.test(url.hostname)) return fail;

  const parts = url.pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p).toLowerCase());
  const dealIdx = parts.findIndex((p) => p === "koop" || p === "huur");
  if (dealIdx === -1 || !parts[dealIdx + 1] || !parts[dealIdx + 2]) return fail;

  const city = parts[dealIdx + 1];
  const slug = parts[dealIdx + 2];
  const idFromPath = parts.slice(dealIdx + 3).find((p) => /^\d{6,}$/.test(p)) ?? null;

  let tokens = slug.split("-").filter(Boolean);
  const type = TYPE_PREFIXES.includes(tokens[0]) ? tokens.shift()! : null;
  // Oud formaat: huis-42123456-straat-12 → id staat in de slug.
  let fundaId = idFromPath;
  if (tokens[0] && /^\d{6,}$/.test(tokens[0])) fundaId = tokens.shift()!;
  tokens = tokens.filter((t) => !/^\d{6,}$/.test(t));

  const numIdx = findLastIndex(tokens, (t) => /^\d{1,5}[a-z]?$/.test(t));
  if (numIdx <= 0) return fail;
  const numMatch = /^(\d{1,5})([a-z]?)$/.exec(tokens[numIdx])!;
  const toevoeging = [numMatch[2], ...tokens.slice(numIdx + 1)].filter(Boolean).join("").toUpperCase() || undefined;

  return {
    ok: true,
    value: {
      url: `https://www.funda.nl${url.pathname}`,
      fundaId,
      woningtype: type ? capitalize(type) : null,
      address: {
        mode: "adres",
        straat: titleCase(tokens.slice(0, numIdx).join(" ")),
        huisnummer: Number(numMatch[1]),
        toevoeging,
        woonplaats: cityName(city),
      },
    },
  };
}

/** Haalt de advertentie op (best effort, kort time-out). Faalt stil. */
export async function fetchFundaListing(parsed: ParsedFundaUrl): Promise<FundaListing> {
  const base: FundaListing = {
    url: parsed.url,
    fundaId: parsed.fundaId,
    woningtype: parsed.woningtype,
    vraagprijs: null,
    woonoppervlakte: null,
    bouwjaar: null,
    foto: null,
    titel: null,
    pageRead: false,
  };

  try {
    const res = await fetch(parsed.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LuukBot/1.0; +https://luuk.si)",
        Accept: "text/html",
        "Accept-Language": "nl-NL,nl;q=0.9",
      },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok || !/(^|\.)funda\.nl$/i.test(new URL(res.url || parsed.url).hostname)) return base;
    const html = (await res.text()).slice(0, 2_000_000);
    return { ...base, ...extractListing(html), pageRead: true };
  } catch (err) {
    console.warn("[funda] pagina niet leesbaar, alleen URL gebruikt:", (err as Error).message);
    return base;
  }
}

export function extractListing(html: string): Partial<FundaListing> {
  const meta = (prop: string) => {
    const tag = (html.match(/<meta\b[^>]*>/gi) ?? []).find((t) => new RegExp(`(property|name)=["']${prop}["']`, "i").test(t));
    return tag ? (/content=["']([^"']*)["']/i.exec(tag)?.[1] ?? null) : null;
  };

  // JSON-LD (schema.org) heeft de voorkeur boven losse tekst.
  let ldPrice: number | null = null;
  let ldArea: number | null = null;
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const nodes = [JSON.parse(m[1])].flat();
      for (const n of nodes) {
        const offers = n?.offers ?? n?.Offers;
        const price = Number([offers].flat()[0]?.price);
        if (!ldPrice && price > 10_000) ldPrice = price;
        const area = Number(n?.floorSize?.value);
        if (!ldArea && area > 10) ldArea = area;
      }
    } catch {
      /* ongeldige JSON-LD negeren */
    }
  }

  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
  const priceText = /€\s?([\d.]{5,11})\s*(k\.k\.|v\.o\.n\.)/i.exec(text)?.[1];
  const areaText = /wonen\s*(?:oppervlakte)?\s*:?\s*(\d{2,4})\s*m²/i.exec(text)?.[1] ?? /(\d{2,4})\s*m²\s*wonen/i.exec(text)?.[1];
  const yearText = /bouwjaar\s*:?\s*(1[89]\d{2}|20\d{2})/i.exec(text)?.[1];

  const vraagprijs = ldPrice ?? (priceText ? Number(priceText.replace(/\./g, "")) : null);
  const woonoppervlakte = ldArea ?? (areaText ? Number(areaText) : null);
  const foto = meta("og:image");

  return {
    vraagprijs: vraagprijs && vraagprijs > 10_000 ? vraagprijs : null,
    woonoppervlakte: woonoppervlakte && woonoppervlakte > 10 ? woonoppervlakte : null,
    bouwjaar: yearText ? Number(yearText) : null,
    foto: foto && /^https:\/\//.test(foto) ? foto : null,
    titel: meta("og:title"),
  };
}

function findLastIndex<T>(arr: T[], fn: (v: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return i;
  return -1;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : capitalize(w)))
    .join(" ");
}

const CITY_FIXES: Record<string, string> = {
  "s-gravenhage": "'s-Gravenhage",
  "s-hertogenbosch": "'s-Hertogenbosch",
  "den-haag": "Den Haag",
  "den-bosch": "Den Bosch",
  "den-helder": "Den Helder",
};

const SMALL_WORDS = new Set(["aan", "den", "de", "der", "op", "van", "in", "bij", "en"]);

function cityName(slug: string): string {
  if (CITY_FIXES[slug]) return CITY_FIXES[slug];
  return slug
    .split("-")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : capitalize(w)))
    .join(" ");
}
