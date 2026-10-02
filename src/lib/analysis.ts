import type { Property } from "@/lib/services/kadaster";

/** Labels die geld kosten: elk label onder C kost je ~2,5% bij verkoop. */
const LABEL_FACTOR: Record<string, number> = {
  "A++++": 1.06, "A+++": 1.05, "A++": 1.04, "A+": 1.03, A: 1.02, B: 1.0, C: 0.99, D: 0.97, E: 0.95, F: 0.93, G: 0.9,
};

export type HouseVerdictKind = "koopje" | "eerlijk" | "miskoop";

export interface HouseAnalysis {
  fairPrice: number;
  verdict: HouseVerdictKind;
  /** Prijs waarmee Luuk de eerlijke prijs vergelijkt: de Funda-vraagprijs als die bekend is, anders de WOZ. */
  comparedTo: "vraagprijs" | "woz";
  comparedPrice: number;
  deltaPercentage: number; // vergeleken prijs t.o.v. eerlijke prijs
  m2VsRegionPercentage: number;
  eraLabel: string;
}

export function analyzeHouse(p: Property, vraagprijs: number | null = null): HouseAnalysis {
  const era = eraOf(p.bouwjaar);
  const fairRaw = p.woonoppervlakte * p.regioPrijsPerM2 * era.factor * (LABEL_FACTOR[p.energielabel] ?? 1);
  const fairPrice = Math.round(fairRaw / 5000) * 5000;
  const comparedPrice = vraagprijs ?? p.wozWaarde;
  const deltaPercentage = ((comparedPrice - fairPrice) / fairPrice) * 100;

  return {
    fairPrice,
    comparedTo: vraagprijs ? "vraagprijs" : "woz",
    comparedPrice,
    verdict: deltaPercentage <= -4 ? "koopje" : deltaPercentage <= 5 ? "eerlijk" : "miskoop",
    deltaPercentage,
    m2VsRegionPercentage: ((p.prijsPerM2 - p.regioPrijsPerM2) / p.regioPrijsPerM2) * 100,
    eraLabel: era.label,
  };
}

function eraOf(bouwjaar: number): { label: string; factor: number } {
  if (bouwjaar < 1930) return { label: "vooroorlogs monument", factor: 1.02 };
  if (bouwjaar < 1940) return { label: "jaren '30 woning", factor: 1.05 };
  if (bouwjaar < 1970) return { label: "wederopbouwwoning", factor: 0.94 };
  if (bouwjaar < 1990) return { label: "jaren '70/'80 doos", factor: 0.9 };
  if (bouwjaar < 2010) return { label: "Vinex-woning", factor: 0.98 };
  return { label: "nieuwbouw", factor: 1.08 };
}

/** Advies voor het maximale bod op een auto: dagwaarde min ~3%, afgerond op €250. */
export function maxCarBid(value: number): number {
  return Math.max(250, Math.floor((value * 0.97) / 250) * 250);
}
