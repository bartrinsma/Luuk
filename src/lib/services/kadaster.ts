import { between, intBetween, pick, seededRandom } from "@/lib/seed";
import { formatPostcode, type AddressQuery } from "@/lib/validation";

export interface HistoricalAskingPrice {
  jaar: number;
  vraagprijs: number;
}

export interface Property {
  adres: string;
  straat: string;
  huisnummer: string;
  postcode: string | null;
  woonplaats: string;
  wozWaarde: number;
  wozPeiljaar: number;
  bouwjaar: number;
  woonoppervlakte: number;
  perceeloppervlakte: number | null;
  woningtype: string;
  energielabel: string;
  prijsPerM2: number;
  regioPrijsPerM2: number;
  historischeVraagprijzen: HistoricalAskingPrice[];
  /** WGS84-coördinaten, als het adres via PDOK is gevonden. */
  coords: { lat: number; lon: number } | null;
}

export interface PropertyResult {
  property: Property;
  /** "kadaster" = externe API, "pdok+model" = echt adres + Luuk's model, "demo" = volledig gesimuleerd */
  source: "kadaster" | "pdok+model" | "demo";
}

/**
 * Architectuur:
 *  1. KADASTER_API_URL + KADASTER_API_KEY gezet → externe (WOZ/BAG) API.
 *  2. Anders: adres resolven via de gratis PDOK Locatieserver.
 *  3. Altijd: ontbrekende datapunten aanvullen met de Fallback Mocking Service.
 * Faalt alles, dan verzint Luuk geloofwaardige data. Nooit een foutmelding.
 */
export async function fetchProperty(query: AddressQuery): Promise<PropertyResult> {
  if (process.env.KADASTER_API_URL && process.env.KADASTER_API_KEY) {
    try {
      const external = await fetchFromKadaster(query);
      if (external) return { property: external, source: "kadaster" };
    } catch (err) {
      console.warn("[kadaster] externe API faalde, fallback:", (err as Error).message);
    }
  }

  const resolved = await resolveAddressViaPdok(query).catch(() => null);
  const property = mockProperty(query, resolved);
  return { property, source: resolved ? "pdok+model" : "demo" };
}

// ---------- Externe API (Kadaster / WOZ-provider) ----------

/**
 * Verwacht een JSON-endpoint dat (minimaal) WOZ, bouwjaar en oppervlakte teruggeeft.
 * De veldnamen hieronder volgen de gangbare WOZ/BAG-terminologie; pas aan op je provider.
 */
async function fetchFromKadaster(query: AddressQuery): Promise<Property | null> {
  const url = new URL(process.env.KADASTER_API_URL!);
  if (query.mode === "postcode") {
    url.searchParams.set("postcode", query.postcode);
  } else {
    url.searchParams.set("straat", query.straat);
    url.searchParams.set("woonplaats", query.woonplaats);
  }
  url.searchParams.set("huisnummer", String(query.huisnummer));
  if (query.toevoeging) url.searchParams.set("huisnummertoevoeging", query.toevoeging);

  const res = await fetch(url, {
    headers: { "X-Api-Key": process.env.KADASTER_API_KEY!, Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Kadaster ${res.status}`);
  const d = (await res.json()) as Record<string, unknown>;

  const woz = Number(d.wozWaarde ?? d.woz_waarde ?? d.vastgesteldeWaarde);
  const bouwjaar = Number(d.bouwjaar ?? d.oorspronkelijkBouwjaar);
  const m2 = Number(d.woonoppervlakte ?? d.oppervlakte);
  if (!woz || !bouwjaar || !m2) return null;

  const base = mockProperty(query, null);
  return {
    ...base,
    wozWaarde: woz,
    bouwjaar,
    woonoppervlakte: m2,
    prijsPerM2: Math.round(woz / m2),
    historischeVraagprijzen: Array.isArray(d.historischeVraagprijzen)
      ? (d.historischeVraagprijzen as HistoricalAskingPrice[])
      : base.historischeVraagprijzen,
  };
}

// ---------- PDOK Locatieserver (gratis, zonder key) ----------

interface ResolvedAddress {
  straat: string;
  huisnummer: string;
  postcode: string | null;
  woonplaats: string;
  coords: { lat: number; lon: number } | null;
}

async function resolveAddressViaPdok(query: AddressQuery): Promise<ResolvedAddress | null> {
  const q =
    query.mode === "postcode"
      ? `postcode:${query.postcode} and huisnummer:${query.huisnummer}`
      : `${query.straat} ${query.huisnummer} ${query.woonplaats}`;
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=1`;

  const res = await fetch(url, { signal: AbortSignal.timeout(3500), next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data = (await res.json()) as { response?: { docs?: Record<string, string>[] } };
  const doc = data.response?.docs?.[0];
  if (!doc?.straatnaam || !doc.woonplaatsnaam) return null;

  return {
    straat: doc.straatnaam,
    huisnummer: doc.huis_nlt ?? String(query.huisnummer),
    postcode: doc.postcode ?? null,
    woonplaats: doc.woonplaatsnaam,
    coords: parsePoint(doc.centroide_ll),
  };
}

/** PDOK levert "POINT(lon lat)". */
function parsePoint(wkt: string | undefined): { lat: number; lon: number } | null {
  const m = wkt && /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(wkt);
  return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null;
}

// ---------- Fallback Mocking Service ----------

/** Indicatieve m²-prijzen per postcodegebied (eerste twee cijfers). */
const REGIONS: { from: number; to: number; plaats: string; m2: number }[] = [
  { from: 10, to: 11, plaats: "Amsterdam", m2: 7600 },
  { from: 12, to: 12, plaats: "Hilversum", m2: 5600 },
  { from: 13, to: 13, plaats: "Almere", m2: 3900 },
  { from: 14, to: 15, plaats: "Zaandam", m2: 4300 },
  { from: 20, to: 21, plaats: "Haarlem", m2: 5900 },
  { from: 22, to: 23, plaats: "Leiden", m2: 4900 },
  { from: 24, to: 26, plaats: "Den Haag", m2: 4600 },
  { from: 27, to: 29, plaats: "Gouda", m2: 3900 },
  { from: 30, to: 31, plaats: "Rotterdam", m2: 4300 },
  { from: 32, to: 34, plaats: "Dordrecht", m2: 3300 },
  { from: 35, to: 35, plaats: "Utrecht", m2: 5700 },
  { from: 36, to: 39, plaats: "Amersfoort", m2: 4500 },
  { from: 40, to: 49, plaats: "Breda", m2: 3700 },
  { from: 50, to: 55, plaats: "Tilburg", m2: 3500 },
  { from: 56, to: 57, plaats: "Eindhoven", m2: 3900 },
  { from: 58, to: 64, plaats: "Maastricht", m2: 3300 },
  { from: 65, to: 66, plaats: "Nijmegen", m2: 3900 },
  { from: 67, to: 69, plaats: "Arnhem", m2: 3600 },
  { from: 70, to: 79, plaats: "Zwolle", m2: 3500 },
  { from: 80, to: 84, plaats: "Leeuwarden", m2: 3000 },
  { from: 85, to: 89, plaats: "Heerenveen", m2: 2900 },
  { from: 90, to: 99, plaats: "Groningen", m2: 3400 },
];

const CITY_M2: Record<string, number> = Object.fromEntries(REGIONS.map((r) => [r.plaats.toLowerCase(), r.m2]));

const STREETS = [
  "Kerkstraat", "Dorpsstraat", "Molenweg", "Julianalaan", "Wilhelminastraat", "Beatrixlaan", "Schoolstraat",
  "Stationsweg", "Prinses Irenestraat", "Lindelaan", "Eikenlaan", "Vondelstraat", "Spoorstraat", "Parallelweg",
  "Rembrandtlaan", "Van Goghstraat", "Oranjestraat", "Nieuwstraat", "Hoofdstraat", "Esdoornlaan",
];

const WONINGTYPES = [
  { type: "Tussenwoning", m2: [85, 130], perceel: [100, 180] },
  { type: "Hoekwoning", m2: [95, 140], perceel: [150, 260] },
  { type: "Twee-onder-een-kap", m2: [120, 175], perceel: [250, 450] },
  { type: "Vrijstaande woning", m2: [140, 230], perceel: [400, 900] },
  { type: "Appartement", m2: [55, 110], perceel: null },
  { type: "Bovenwoning", m2: [60, 105], perceel: null },
] as const;

const LABELS = ["A++++", "A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"];

function regionFor(postcode: string | null, woonplaats: string | null): { plaats: string; m2: number } {
  if (postcode) {
    const prefix = Number(postcode.slice(0, 2));
    const r = REGIONS.find((x) => prefix >= x.from && prefix <= x.to);
    if (r) return r;
  }
  if (woonplaats && CITY_M2[woonplaats.toLowerCase()]) return { plaats: woonplaats, m2: CITY_M2[woonplaats.toLowerCase()] };
  return { plaats: woonplaats ?? "Nederland", m2: 4000 };
}

export function mockProperty(query: AddressQuery, resolved: ResolvedAddress | null): Property {
  const key =
    query.mode === "postcode"
      ? `${query.postcode}-${query.huisnummer}${query.toevoeging ?? ""}`
      : `${query.straat}-${query.huisnummer}${query.toevoeging ?? ""}-${query.woonplaats}`.toLowerCase();
  const rand = seededRandom(`kadaster:${key}`);
  const now = new Date().getFullYear();

  const postcode = resolved?.postcode ?? (query.mode === "postcode" ? query.postcode : null);
  const region = regionFor(postcode, resolved?.woonplaats ?? (query.mode === "adres" ? query.woonplaats : null));
  const straat = resolved?.straat ?? (query.mode === "adres" ? query.straat : pick(rand, STREETS));
  const woonplaats = resolved?.woonplaats ?? region.plaats;
  const huisnummer = resolved?.huisnummer ?? `${query.huisnummer}${query.toevoeging ? `-${query.toevoeging}` : ""}`;

  const wt = pick(rand, WONINGTYPES);
  const bouwjaar = pickBouwjaar(rand);
  let woonoppervlakte = intBetween(rand, wt.m2[0], wt.m2[1]);
  const perceeloppervlakte = wt.perceel ? intBetween(rand, wt.perceel[0], wt.perceel[1]) : null;

  // Leeftijd & type beïnvloeden de m²-prijs: jaren '30 en nieuwbouw scoren, jaren '70 niet.
  const eraFactor = bouwjaar < 1940 ? 1.08 : bouwjaar < 1965 ? 0.95 : bouwjaar < 1990 ? 0.9 : bouwjaar < 2010 ? 1.0 : 1.12;
  const typeFactor = wt.type === "Vrijstaande woning" ? 1.1 : wt.type === "Appartement" ? 1.05 : 1;
  const m2Price = region.m2 * eraFactor * typeFactor * between(rand, 0.85, 1.15);
  // WOZ binnen €300k–€800k houden door de woning realistisch te schalen, niet door de prijs af te kappen:
  // zo blijven m²-prijs, WOZ en Luuk's eerlijke prijs onderling consistent.
  woonoppervlakte = clamp(woonoppervlakte, Math.ceil(300_000 / m2Price), Math.floor(800_000 / m2Price));
  const wozWaarde = clamp(Math.round((woonoppervlakte * m2Price) / 1000) * 1000, 300_000, 800_000);

  return {
    adres: `${straat} ${huisnummer}, ${postcode ? `${formatPostcode(postcode)} ` : ""}${woonplaats}`,
    straat,
    huisnummer,
    postcode,
    woonplaats,
    wozWaarde,
    wozPeiljaar: now - 1,
    bouwjaar,
    woonoppervlakte,
    perceeloppervlakte,
    woningtype: wt.type,
    energielabel: pickLabel(rand, bouwjaar),
    prijsPerM2: Math.round(wozWaarde / woonoppervlakte),
    regioPrijsPerM2: region.m2,
    historischeVraagprijzen: historicalPrices(rand, wozWaarde, bouwjaar, now),
    coords: resolved?.coords ?? null,
  };
}

function pickBouwjaar(rand: () => number): number {
  const eras = [
    [1900, 1929], [1930, 1939], [1945, 1969], [1970, 1989], [1990, 2009], [2010, 2023],
  ] as const;
  const [a, b] = pick(rand, eras);
  return intBetween(rand, a, b);
}

function pickLabel(rand: () => number, bouwjaar: number): string {
  const base = bouwjaar >= 2015 ? 1 : bouwjaar >= 2000 ? 4 : bouwjaar >= 1980 ? 6 : 7;
  const idx = clamp(base + intBetween(rand, -1, 2), 0, LABELS.length - 1);
  return LABELS[idx];
}

/** Vraagprijzen uit het verleden, teruggerekend met een ruwe prijsindex (~5,5% p/j). */
function historicalPrices(rand: () => number, woz: number, bouwjaar: number, now: number): HistoricalAskingPrice[] {
  const count = intBetween(rand, 0, 3);
  const years = new Set<number>();
  for (let i = 0; i < count; i++) years.add(intBetween(rand, Math.max(bouwjaar + 1, 2000), now - 1));
  return [...years]
    .sort((a, b) => a - b)
    .map((jaar) => ({
      jaar,
      vraagprijs: Math.round((woz * Math.pow(1 / 1.055, now - jaar) * between(rand, 0.95, 1.15)) / 1000) * 1000,
    }));
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
