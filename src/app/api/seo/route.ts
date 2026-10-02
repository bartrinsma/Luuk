import { analyzeSeoRequest } from "@/lib/analyses";
import { track } from "@/lib/analytics/track";
import { luukError, OOPS, readJson } from "@/lib/api";
import { normalizeUrl } from "@/lib/validation";

/** POST /api/seo { url } → laadtijd, mobiele score, meta-checks + Luuk's roast */
export async function POST(request: Request) {
  const body = await readJson(request);
  const raw = typeof body?.url === "string" ? body.url : "";
  const parsed = normalizeUrl(raw);
  if (!parsed.ok) {
    track(request, { module: "roast", status: "invalid", input: raw });
    return luukError(parsed.error);
  }

  try {
    const result = await analyzeSeoRequest(parsed.value);
    const r = result.report;
    track(request, {
      module: "roast",
      input: raw,
      subject: r.hostname.replace(/^www\./, ""),
      value: r.mobileScore,
      meta: {
        tld: r.hostname.split(".").pop(),
        loadTimeMs: r.loadTimeMs,
        checksPassed: r.checks.filter((c) => c.pass).length,
        checksTotal: r.checks.length,
        dataSource: result.dataSource,
      },
    });
    return Response.json(result);
  } catch (err) {
    console.error("[api/seo]", err);
    track(request, { module: "roast", status: "error", input: raw });
    return luukError(OOPS, 500);
  }
}
