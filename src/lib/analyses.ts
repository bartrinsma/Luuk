import { analyzeHouse, maxCarBid } from "@/lib/analysis";
import { aiEnabled, generateLuuk } from "@/lib/ai/llm";
import { mockCarVerdict, mockHouseVerdict, mockSeoVerdict } from "@/lib/ai/mockLuuk";
import { carPriceEstimatePrompt, carVerdictPrompt, houseVerdictPrompt, seoVerdictPrompt } from "@/lib/ai/prompts";
import type { HouseInput } from "@/lib/houseInput";
import { fetchFundaListing, type FundaListing } from "@/lib/services/funda";
import { resolveHousePhotos } from "@/lib/services/housePhotos";
import { fetchProperty, type Property } from "@/lib/services/kadaster";
import { fetchVehicle, type Vehicle } from "@/lib/services/rdw";
import { analyzeWebsite } from "@/lib/services/seo";
import type { CarResponse, HouseResponse, SeoResponse } from "@/lib/types";
import { calculateAgeInYears, calculateCarValue, DEFAULT_DEPRECIATION_RATE, estimateCatalogPrice } from "@/utils/calculateCarValue";
import { calculateMortgage, DEFAULT_INTEREST_RATE, DEFAULT_TERM_YEARS } from "@/utils/calculateMortgage";

/**
 * De drie volledige analyses (data ophalen → rekenen → Luuk's oordeel).
 * Gedeeld door de module-routes én de deel-functies, zodat een gedeeld rapport
 * altijd op de server wordt opgebouwd en nooit op door de client aangeleverde cijfers.
 */

// ---------- Huizen ----------

/** Data + berekeningen, zonder LLM. Gebruikt door de hoofdanalyse én de foto-analyse. */
export async function buildHouseData(input: HouseInput) {
  const query = input.kind === "funda" ? input.funda.address : input.query;
  const [{ property: base, source }, funda] = await Promise.all([
    fetchProperty(query),
    input.kind === "funda" ? fetchFundaListing(input.funda) : Promise.resolve(null),
  ]);

  // Wat de advertentie zegt over m² en bouwjaar is betrouwbaarder dan het model.
  const property = funda ? applyFunda(base, funda) : base;
  const mortgage = calculateMortgage(property.wozWaarde, DEFAULT_INTEREST_RATE, DEFAULT_TERM_YEARS);
  const analysis = analyzeHouse(property, funda?.vraagprijs ?? null);
  return { property, source, funda, mortgage, analysis };
}

export async function analyzeHouseRequest(input: HouseInput): Promise<HouseResponse> {
  const { property, source, funda, mortgage, analysis } = await buildHouseData(input);

  const [verdict, photos] = await Promise.all([
    generateLuuk({
      system: houseVerdictPrompt({ property, mortgage, analysis, funda }),
      user: "Koopje of miskoop?",
      fallback: () => mockHouseVerdict(property, mortgage, analysis),
      maxTokens: 500,
    }),
    resolveHousePhotos(property, funda),
  ]);

  return { property, dataSource: source, mortgage, analysis, funda, photos, verdict: verdict.text, verdictSource: verdict.source };
}

function applyFunda(p: Property, f: FundaListing): Property {
  const woonoppervlakte = f.woonoppervlakte ?? p.woonoppervlakte;
  return {
    ...p,
    woonoppervlakte,
    bouwjaar: f.bouwjaar ?? p.bouwjaar,
    woningtype: f.woningtype ?? p.woningtype,
    prijsPerM2: Math.round(p.wozWaarde / woonoppervlakte),
  };
}

// ---------- Auto's ----------

/** `null` = kenteken bestaat niet in het RDW-register. */
export async function analyzeCarRequest(kenteken: string): Promise<CarResponse | null> {
  const result = await fetchVehicle(kenteken);
  if (result.status === "not_found") return null;
  const vehicle = result.vehicle;

  const { price, source: priceSource } = await resolveOriginalPrice(vehicle);
  const age = vehicle.datumEersteToelating ? calculateAgeInYears(new Date(vehicle.datumEersteToelating)) : 0;
  const valuation = calculateCarValue(price, age, DEFAULT_DEPRECIATION_RATE);
  const maxBid = maxCarBid(valuation.currentValue);

  const verdict = await generateLuuk({
    system: carVerdictPrompt({ vehicle, valuation, maxBid, catalogusprijsGeschat: priceSource !== "rdw" }),
    user: "Geef je commentaar.",
    fallback: () => mockCarVerdict(vehicle, valuation, maxBid, priceSource !== "rdw"),
    maxTokens: 400,
  });

  return {
    vehicle,
    dataSource: result.source,
    valuation,
    priceSource,
    maxBid,
    verdict: verdict.text,
    verdictSource: verdict.source,
  };
}

/** Catalogusprijs van de RDW, anders een dwingende LLM-schatting, anders Luuk's eigen model. */
async function resolveOriginalPrice(v: Vehicle): Promise<{ price: number; source: CarResponse["priceSource"] }> {
  if (v.catalogusprijs) return { price: v.catalogusprijs, source: "rdw" };

  const heuristic = estimateCatalogPrice(v.merk, v.bouwjaar ?? new Date().getFullYear());
  if (!aiEnabled()) return { price: heuristic, source: "luuk-model" };

  const { text, source } = await generateLuuk({
    system: carPriceEstimatePrompt({
      merk: v.merk,
      model: v.handelsbenaming,
      bouwjaar: v.bouwjaar,
      brandstof: v.brandstof,
      vermogenKw: v.vermogenKw,
      inrichting: v.inrichting,
    }),
    user: "Nieuwprijs in euro's:",
    fallback: () => String(heuristic),
    maxTokens: 50,
  });
  const parsed = Number(text.replace(/[^\d]/g, ""));
  // Sanity-check: alles buiten €3k–€1,5 mln is een hallucinatie.
  if (source === "ai" && parsed >= 3000 && parsed <= 1_500_000) return { price: parsed, source: "luuk-ai" };
  return { price: heuristic, source: "luuk-model" };
}

// ---------- Websites ----------

export async function analyzeSeoRequest(url: URL): Promise<SeoResponse> {
  const { report, source } = await analyzeWebsite(url);
  const verdict = await generateLuuk({
    system: seoVerdictPrompt(report),
    user: "Roast deze site.",
    fallback: () => mockSeoVerdict(report),
    maxTokens: 500,
  });
  return { report, dataSource: source, verdict: verdict.text, verdictSource: verdict.source };
}
