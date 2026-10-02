import { luukError } from "@/lib/api";
import { fetchVehicle } from "@/lib/services/rdw";
import { isValidKenteken, kentekenError } from "@/lib/validation";

/** Ruwe, opgeschoonde RDW-data. GET /api/rdw?kenteken=XX-99-XX */
export async function GET(request: Request) {
  const kenteken = new URL(request.url).searchParams.get("kenteken") ?? "";
  if (!isValidKenteken(kenteken)) return luukError(kentekenError(kenteken));

  const result = await fetchVehicle(kenteken);
  if (result.status === "not_found")
    return luukError("Dit kenteken komt in het hele RDW-register niet voor. Spookauto, of een typefout. Check het nog even. Sí.", 404);

  return Response.json({ vehicle: result.vehicle, source: result.source });
}
