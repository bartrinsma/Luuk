import { parseAddressBody } from "./parse";
import { analyzeHouse } from "@/lib/analysis";
import { generateLuuk } from "@/lib/ai/llm";
import { mockHouseVerdict } from "@/lib/ai/mockLuuk";
import { houseVerdictPrompt } from "@/lib/ai/prompts";
import { luukError, OOPS, readJson } from "@/lib/api";
import { fetchProperty } from "@/lib/services/kadaster";
import type { HouseResponse } from "@/lib/types";
import { calculateMortgage, DEFAULT_INTEREST_RATE, DEFAULT_TERM_YEARS } from "@/utils/calculateMortgage";

/** POST /api/huizen → WOZ-data + maandlasten + Luuk's verdict */
export async function POST(request: Request) {
  const parsed = parseAddressBody(await readJson(request));
  if (!parsed.ok) return luukError(parsed.error);

  try {
    const { property, source } = await fetchProperty(parsed.value);
    const mortgage = calculateMortgage(property.wozWaarde, DEFAULT_INTEREST_RATE, DEFAULT_TERM_YEARS);
    const analysis = analyzeHouse(property);

    const verdict = await generateLuuk({
      system: houseVerdictPrompt({ property, mortgage, analysis }),
      user: "Koopje of miskoop?",
      fallback: () => mockHouseVerdict(property, mortgage, analysis),
      maxTokens: 500,
    });

    return Response.json({
      property,
      dataSource: source,
      mortgage,
      analysis,
      verdict: verdict.text,
      verdictSource: verdict.source,
    } satisfies HouseResponse);
  } catch (err) {
    console.error("[api/huizen]", err);
    return luukError(OOPS, 500);
  }
}
