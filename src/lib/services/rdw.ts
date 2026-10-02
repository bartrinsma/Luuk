import { between, intBetween, pick, seededRandom } from "@/lib/seed";
import { formatKenteken, normalizeKenteken } from "@/lib/validation";
import { parseRdwDate } from "@/utils/calculateCarValue";

const RDW_VOERTUIGEN = "https://opendata.rdw.nl/resource/m9d7-ebf2.json";
const RDW_BRANDSTOF = "https://opendata.rdw.nl/resource/8ys7-d773.json";

export interface Vehicle {
  kenteken: string;
  kentekenFormatted: string;
  merk: string;
  handelsbenaming: string;
  voertuigsoort: string | null;
  inrichting: string | null;
  kleur: string | null;
  datumEersteToelating: string | null; // ISO
  bouwjaar: number | null;
  brandstof: string | null;
  catalogusprijs: number | null;
  vermogenKw: number | null;
  cilinderinhoud: number | null;
  massaRijklaar: number | null;
  zitplaatsen: number | null;
  apkVervaldatum: string | null; // ISO
}

export type RdwResult =
  | { status: "found"; vehicle: Vehicle; source: "rdw" | "demo" }
  | { status: "not_found" };

type RdwRow = Record<string, string | undefined>;

/**
 * Haalt voertuigdata op bij de RDW Open Data (Socrata) API.
 * Lukt de verbinding niet, dan genereert Luuk een geloofwaardig demovoertuig —
 * de gebruiker ziet nooit "Error fetching data".
 */
export async function fetchVehicle(input: string): Promise<RdwResult> {
  const kenteken = normalizeKenteken(input);

  try {
    const [voertuig, brandstof] = await Promise.all([
      rdwGet(RDW_VOERTUIGEN, kenteken),
      rdwGet(RDW_BRANDSTOF, kenteken).catch(() => [] as RdwRow[]),
    ]);
    if (voertuig.length === 0) return { status: "not_found" };
    return { status: "found", vehicle: toVehicle(kenteken, voertuig[0], brandstof), source: "rdw" };
  } catch (err) {
    console.warn(`[rdw] fallback naar demo-data voor ${kenteken}:`, (err as Error).message);
    return { status: "found", vehicle: mockVehicle(kenteken), source: "demo" };
  }
}

async function rdwGet(endpoint: string, kenteken: string): Promise<RdwRow[]> {
  const url = `${endpoint}?kenteken=${encodeURIComponent(kenteken)}`;
  const headers: HeadersInit = { Accept: "application/json" };
  if (process.env.RDW_APP_TOKEN) headers["X-App-Token"] = process.env.RDW_APP_TOKEN;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`RDW ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("RDW: onverwacht antwoord");
  return data as RdwRow[];
}

function toVehicle(kenteken: string, row: RdwRow, brandstofRows: RdwRow[]): Vehicle {
  const toelating = row.datum_eerste_toelating ? parseRdwDate(row.datum_eerste_toelating) : null;
  const apk = row.vervaldatum_apk ? parseRdwDate(row.vervaldatum_apk) : null;
  const brandstoffen = [...new Set(brandstofRows.map((b) => b.brandstof_omschrijving).filter(Boolean))] as string[];
  const vermogen = brandstofRows.map((b) => toNumber(b.nettomaximumvermogen)).find((v) => v !== null) ?? null;

  return {
    kenteken,
    kentekenFormatted: formatKenteken(kenteken),
    merk: clean(row.merk) ?? "Onbekend",
    handelsbenaming: clean(row.handelsbenaming) ?? "",
    voertuigsoort: clean(row.voertuigsoort),
    inrichting: clean(row.inrichting),
    kleur: clean(row.eerste_kleur),
    datumEersteToelating: toelating?.toISOString() ?? null,
    bouwjaar: toelating?.getUTCFullYear() ?? null,
    brandstof: brandstoffen.length ? brandstoffen.join(" / ") : null,
    catalogusprijs: toNumber(row.catalogusprijs),
    vermogenKw: vermogen,
    cilinderinhoud: toNumber(row.cilinderinhoud),
    massaRijklaar: toNumber(row.massa_rijklaar),
    zitplaatsen: toNumber(row.aantal_zitplaatsen),
    apkVervaldatum: apk?.toISOString() ?? null,
  };
}

function clean(v: string | undefined): string | null {
  if (!v || v.trim() === "" || v === "Niet geregistreerd") return null;
  return v.trim();
}

function toNumber(v: string | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------- Demo-fallback ----------

const DEMO_MODELS: { merk: string; model: string; prijs: number; kw: number; brandstof: string }[] = [
  { merk: "VOLKSWAGEN", model: "GOLF", prijs: 32000, kw: 110, brandstof: "Benzine" },
  { merk: "VOLKSWAGEN", model: "POLO", prijs: 24500, kw: 70, brandstof: "Benzine" },
  { merk: "TOYOTA", model: "YARIS", prijs: 23900, kw: 85, brandstof: "Benzine / Elektriciteit" },
  { merk: "KIA", model: "NIRO", prijs: 38500, kw: 150, brandstof: "Elektriciteit" },
  { merk: "TESLA", model: "MODEL 3", prijs: 49990, kw: 208, brandstof: "Elektriciteit" },
  { merk: "BMW", model: "3ER REIHE", prijs: 52000, kw: 135, brandstof: "Benzine" },
  { merk: "VOLVO", model: "XC40", prijs: 47500, kw: 145, brandstof: "Benzine" },
  { merk: "PEUGEOT", model: "208", prijs: 25500, kw: 74, brandstof: "Benzine" },
  { merk: "SKODA", model: "OCTAVIA", prijs: 34500, kw: 110, brandstof: "Diesel" },
  { merk: "AUDI", model: "A4", prijs: 51000, kw: 140, brandstof: "Diesel" },
];

const COLORS = ["ZWART", "GRIJS", "WIT", "BLAUW", "ROOD", "GRIJS", "ZWART"];

export function mockVehicle(kenteken: string): Vehicle {
  const rand = seededRandom(`rdw:${kenteken}`);
  const m = pick(rand, DEMO_MODELS);
  const year = intBetween(rand, 2009, new Date().getFullYear() - 1);
  const month = intBetween(rand, 0, 11);
  const toelating = new Date(Date.UTC(year, month, intBetween(rand, 1, 28)));
  const prijs = Math.round((m.prijs * Math.pow(1 / 1.025, new Date().getFullYear() - year) * between(rand, 0.92, 1.15)) / 100) * 100;
  const apk = new Date(Date.UTC(new Date().getFullYear() + intBetween(rand, 0, 1), intBetween(rand, 0, 11), 15));

  return {
    kenteken,
    kentekenFormatted: formatKenteken(kenteken),
    merk: m.merk,
    handelsbenaming: m.model,
    voertuigsoort: "Personenauto",
    inrichting: pick(rand, ["hatchback", "stationwagen", "sedan", "MPV"]),
    kleur: pick(rand, COLORS),
    datumEersteToelating: toelating.toISOString(),
    bouwjaar: year,
    brandstof: m.brandstof,
    catalogusprijs: rand() < 0.85 ? prijs : null,
    vermogenKw: m.kw,
    cilinderinhoud: m.brandstof === "Elektriciteit" ? null : intBetween(rand, 999, 1998),
    massaRijklaar: intBetween(rand, 1050, 1750),
    zitplaatsen: 5,
    apkVervaldatum: apk.toISOString(),
  };
}
