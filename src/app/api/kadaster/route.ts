import { luukError, readJson } from "@/lib/api";
import { fetchProperty } from "@/lib/services/kadaster";
import { parseAddressBody } from "@/app/api/huizen/parse";

/** Ruwe (of gesimuleerde) Kadaster/WOZ-data. POST /api/kadaster { postcode, huisnummer } | { straat, huisnummer, woonplaats } */
export async function POST(request: Request) {
  const parsed = parseAddressBody(await readJson(request));
  if (!parsed.ok) return luukError(parsed.error);
  const result = await fetchProperty(parsed.value);
  return Response.json(result);
}
