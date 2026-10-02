import type { HouseAnalysis } from "@/lib/analysis";
import type { LuukSource } from "@/lib/ai/llm";
import type { Property, PropertyResult } from "@/lib/services/kadaster";
import type { SeoReport, SeoResult } from "@/lib/services/seo";
import type { Vehicle } from "@/lib/services/rdw";
import type { CarValuation } from "@/utils/calculateCarValue";
import type { MortgageResult } from "@/utils/calculateMortgage";

/** Elke route antwoordt óf met data, óf met een Luuk-achtige boodschap. Nooit met een kale error. */
export interface LuukErrorResponse {
  luukError: string;
}

export interface ChatResponse {
  answer: string;
  source: LuukSource;
  suggestion: "autos" | "huizen" | "roast" | null;
}

export interface HouseResponse {
  property: Property;
  dataSource: PropertyResult["source"];
  mortgage: MortgageResult;
  analysis: HouseAnalysis;
  verdict: string;
  verdictSource: LuukSource;
}

export interface CarResponse {
  vehicle: Vehicle;
  dataSource: "rdw" | "demo";
  valuation: CarValuation;
  priceSource: "rdw" | "luuk-ai" | "luuk-model";
  maxBid: number;
  verdict: string;
  verdictSource: LuukSource;
}

export interface SeoResponse {
  report: SeoReport;
  dataSource: SeoResult["source"];
  verdict: string;
  verdictSource: LuukSource;
}
