/**
 * Exponentiële afschrijving: V = P × (1 − r)^t
 *  P = originele catalogusprijs
 *  r = afschrijving per jaar (0.15 = 15%)
 *  t = leeftijd in jaren (fractioneel)
 */
export const DEFAULT_DEPRECIATION_RATE = 0.15;

/** Een auto is nooit minder waard dan de sloper ervoor betaalt. */
export const MINIMUM_CAR_VALUE = 500;

export interface CarValuation {
  originalPrice: number;
  currentValue: number;
  ageYears: number;
  depreciationRate: number;
  totalDepreciation: number;
  retainedPercentage: number;
}

/** Leeftijd in jaren op basis van een RDW-datum (YYYYMMDD) of Date. */
export function calculateAgeInYears(firstRegistration: string | Date, now: Date = new Date()): number {
  const date = typeof firstRegistration === "string" ? parseRdwDate(firstRegistration) : firstRegistration;
  if (!date) return 0;
  const ms = now.getTime() - date.getTime();
  return Math.max(0, ms / (365.25 * 24 * 60 * 60 * 1000));
}

/** RDW levert datums als "20180315". */
export function parseRdwDate(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function calculateCarValue(
  originalPrice: number,
  ageYears: number,
  depreciationRate: number = DEFAULT_DEPRECIATION_RATE,
): CarValuation {
  const t = Math.max(0, ageYears);
  const raw = originalPrice * Math.pow(1 - depreciationRate, t);
  const currentValue = Math.max(MINIMUM_CAR_VALUE, roundTo(raw, 50));

  return {
    originalPrice,
    currentValue,
    ageYears: t,
    depreciationRate,
    totalDepreciation: Math.max(0, originalPrice - currentValue),
    retainedPercentage: originalPrice > 0 ? (currentValue / originalPrice) * 100 : 0,
  };
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Heuristische nieuwprijs als de RDW geen catalogusprijs kent (oldtimers, imports).
 * Wordt gebruikt als anker voor de LLM-schatting en als fallback in demo-modus.
 */
const BRAND_BASE_PRICE: Record<string, number> = {
  "PORSCHE": 110000, "BENTLEY": 220000, "FERRARI": 260000, "LAMBORGHINI": 280000, "ROLLS ROYCE": 380000,
  "MASERATI": 95000, "TESLA": 55000, "LAND ROVER": 80000, "JAGUAR": 65000, "MERCEDES-BENZ": 60000,
  "BMW": 55000, "AUDI": 52000, "VOLVO": 52000, "LEXUS": 55000, "POLESTAR": 58000, "GENESIS": 60000,
  "VOLKSWAGEN": 34000, "MINI": 32000, "CUPRA": 40000, "SKODA": 32000, "SEAT": 28000, "PEUGEOT": 30000,
  "RENAULT": 27000, "CITROEN": 26000, "OPEL": 27000, "FORD": 30000, "TOYOTA": 32000, "HONDA": 32000,
  "MAZDA": 32000, "NISSAN": 30000, "HYUNDAI": 31000, "KIA": 31000, "FIAT": 21000, "DACIA": 18000,
  "SUZUKI": 21000, "MITSUBISHI": 29000, "ALFA ROMEO": 42000, "DS": 42000, "SMART": 22000, "BYD": 40000,
  "MG": 30000, "LYNK & CO": 42000,
};

export function estimateCatalogPrice(brand: string, firstRegistrationYear: number): number {
  const base = BRAND_BASE_PRICE[brand.toUpperCase().trim()] ?? 32000;
  // Ruwe inflatiecorrectie: nieuwprijzen stijgen ~2.5% per jaar.
  const yearsAgo = Math.max(0, new Date().getFullYear() - firstRegistrationYear);
  const inflationFactor = Math.pow(1 / 1.025, Math.min(yearsAgo, 40));
  return Math.round((base * inflationFactor) / 500) * 500;
}
