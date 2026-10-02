import { generateLuuk } from "@/lib/ai/llm";
import { mockSeoVerdict } from "@/lib/ai/mockLuuk";
import { seoVerdictPrompt } from "@/lib/ai/prompts";
import { luukError, OOPS, readJson } from "@/lib/api";
import { analyzeWebsite } from "@/lib/services/seo";
import type { SeoResponse } from "@/lib/types";
import { normalizeUrl } from "@/lib/validation";

/** POST /api/seo { url } → laadtijd, mobiele score, meta-checks + Luuk's roast */
export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = normalizeUrl(typeof body?.url === "string" ? body.url : "");
  if (!parsed.ok) return luukError(parsed.error);

  try {
    const { report, source } = await analyzeWebsite(parsed.value);
    const verdict = await generateLuuk({
      system: seoVerdictPrompt(report),
      user: "Roast deze site.",
      fallback: () => mockSeoVerdict(report),
      maxTokens: 500,
    });
    return Response.json({ report, dataSource: source, verdict: verdict.text, verdictSource: verdict.source } satisfies SeoResponse);
  } catch (err) {
    console.error("[api/seo]", err);
    return luukError(OOPS, 500);
  }
}
