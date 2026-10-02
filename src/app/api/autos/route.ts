import { analyzeCarRequest } from "@/lib/analyses";
import { luukError, OOPS, readJson } from "@/lib/api";
import { isValidKenteken, kentekenError } from "@/lib/validation";

/** POST /api/autos { kenteken } → RDW-data + dagwaarde + Luuk's commentaar */
export async function POST(request: Request) {
  const body = await readJson(request);
  const kenteken = typeof body?.kenteken === "string" ? body.kenteken : "";
  if (!isValidKenteken(kenteken)) return luukError(kentekenError(kenteken));

  try {
    const result = await analyzeCarRequest(kenteken);
    if (!result)
      return luukError("Dit kenteken komt in het hele RDW-register niet voor. Spookauto, of een typefout. Check het nog even. Sí.", 404);
    return Response.json(result);
  } catch (err) {
    console.error("[api/autos]", err);
    return luukError(OOPS, 500);
  }
}
