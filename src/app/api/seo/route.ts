import { analyzeSeoRequest } from "@/lib/analyses";
import { luukError, OOPS, readJson } from "@/lib/api";
import { normalizeUrl } from "@/lib/validation";

/** POST /api/seo { url } → laadtijd, mobiele score, meta-checks + Luuk's roast */
export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = normalizeUrl(typeof body?.url === "string" ? body.url : "");
  if (!parsed.ok) return luukError(parsed.error);

  try {
    return Response.json(await analyzeSeoRequest(parsed.value));
  } catch (err) {
    console.error("[api/seo]", err);
    return luukError(OOPS, 500);
  }
}
