import { analyzeCarRequest } from "@/lib/analyses";
import { track } from "@/lib/analytics/track";
import { luukError, OOPS, readJson } from "@/lib/api";
import { isValidKenteken, kentekenError, normalizeKenteken } from "@/lib/validation";

/** POST /api/autos { kenteken } → RDW-data + dagwaarde + Luuk's commentaar */
export async function POST(request: Request) {
  const body = await readJson(request);
  const kenteken = typeof body?.kenteken === "string" ? body.kenteken : "";
  if (!isValidKenteken(kenteken)) {
    track(request, { module: "autos", status: "invalid", input: kenteken });
    return luukError(kentekenError(kenteken));
  }

  try {
    const result = await analyzeCarRequest(kenteken);
    if (!result) {
      track(request, { module: "autos", status: "not_found", input: kenteken, subject: normalizeKenteken(kenteken) });
      return luukError("Dit kenteken komt in het hele RDW-register niet voor. Spookauto, of een typefout. Check het nog even. Sí.", 404);
    }
    const v = result.vehicle;
    track(request, {
      module: "autos",
      input: kenteken,
      subject: v.kentekenFormatted,
      value: result.valuation.currentValue,
      meta: {
        merk: v.merk,
        model: v.handelsbenaming,
        bouwjaar: v.bouwjaar,
        brandstof: v.brandstof,
        originalPrice: result.valuation.originalPrice,
        priceSource: result.priceSource,
        dataSource: result.dataSource,
      },
    });
    return Response.json(result);
  } catch (err) {
    console.error("[api/autos]", err);
    track(request, { module: "autos", status: "error", input: kenteken });
    return luukError(OOPS, 500);
  }
}
