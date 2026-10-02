import { parseAddressBody } from "./parse";
import { analyzeHouseRequest } from "@/lib/analyses";
import { track } from "@/lib/analytics/track";
import { luukError, OOPS, readJson } from "@/lib/api";

/** POST /api/huizen → WOZ-data + maandlasten + Luuk's verdict */
export async function POST(request: Request) {
  const body = await readJson(request);
  const rawInput = rawHouseInput(body);
  const parsed = parseAddressBody(body);
  if (!parsed.ok) {
    track(request, { module: "huizen", status: "invalid", input: rawInput });
    return luukError(parsed.error);
  }

  try {
    const result = await analyzeHouseRequest(parsed.value);
    const p = result.property;
    track(request, {
      module: "huizen",
      input: rawInput,
      subject: p.adres,
      province: p.provincie,
      city: p.woonplaats,
      value: p.wozWaarde,
      meta: {
        via: parsed.value.kind === "funda" ? "funda" : parsed.value.query.mode,
        verdict: result.analysis.verdict,
        fairPrice: result.analysis.fairPrice,
        vraagprijs: result.funda?.vraagprijs ?? null,
        bouwjaar: p.bouwjaar,
        woningtype: p.woningtype,
        m2: p.woonoppervlakte,
        dataSource: result.dataSource,
      },
    });
    return Response.json(result);
  } catch (err) {
    console.error("[api/huizen]", err);
    track(request, { module: "huizen", status: "error", input: rawInput });
    return luukError(OOPS, 500);
  }
}

function rawHouseInput(body: Record<string, unknown> | null): string | null {
  if (!body) return null;
  const parts = ["funda", "query", "postcode", "straat", "huisnummer", "toevoeging", "woonplaats"]
    .map((k) => (typeof body[k] === "string" || typeof body[k] === "number" ? String(body[k]) : ""))
    .filter(Boolean);
  return parts.join(" ") || null;
}
