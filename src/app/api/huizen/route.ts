import { parseAddressBody } from "./parse";
import { analyzeHouseRequest } from "@/lib/analyses";
import { luukError, OOPS, readJson } from "@/lib/api";

/** POST /api/huizen → WOZ-data + maandlasten + Luuk's verdict */
export async function POST(request: Request) {
  const parsed = parseAddressBody(await readJson(request));
  if (!parsed.ok) return luukError(parsed.error);

  try {
    return Response.json(await analyzeHouseRequest(parsed.value));
  } catch (err) {
    console.error("[api/huizen]", err);
    return luukError(OOPS, 500);
  }
}
