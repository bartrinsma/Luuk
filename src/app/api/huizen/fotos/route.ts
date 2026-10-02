import { assessHousePhotos, type PhotoImage } from "@/lib/ai/photoAssessment";
import { track } from "@/lib/analytics/track";
import { buildHouseData } from "@/lib/analyses";
import { luukError, OOPS, readJson } from "@/lib/api";
import { parseHouseInput } from "@/lib/houseInput";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/huizen/fotos { query, images: [{ mediaType, data }] }
 * De woningdata wordt op de server opnieuw opgebouwd uit de zoekopdracht; de foto's worden
 * alleen in het geheugen verwerkt en nergens opgeslagen.
 */

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 1_500_000; // na verkleinen in de browser zit een foto rond de 200–400 KB
const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const body = await readJson(request);
  const query = typeof body?.query === "string" ? body.query : "";
  const rawImages = Array.isArray(body?.images) ? body.images : [];

  const parsed = parseHouseInput(query);
  if (!parsed.ok) return luukError(parsed.error);
  if (rawImages.length === 0) return luukError("Geen foto's, geen fotoanalyse. Sleep er een paar in. Sí.");
  if (rawImages.length > MAX_IMAGES) return luukError(`Maximaal ${MAX_IMAGES} foto's. Kies je beste shots, ik ben geen fotoalbum. Sí.`);

  const images: PhotoImage[] = [];
  for (const img of rawImages) {
    const mediaType = (img as Record<string, unknown>)?.mediaType;
    const data = (img as Record<string, unknown>)?.data;
    if (typeof mediaType !== "string" || !MEDIA_TYPES.has(mediaType) || typeof data !== "string" || !/^[A-Za-z0-9+/]+=*$/.test(data))
      return luukError("Daar zit iets tussen dat geen foto is. JPG, PNG of WebP graag. Sí.");
    if ((data.length * 3) / 4 > MAX_IMAGE_BYTES) return luukError("Eén van je foto's is te zwaar. Maximaal 1,5 MB per stuk. Sí.");
    images.push({ mediaType: mediaType as PhotoImage["mediaType"], data });
  }

  if (!rateLimit(`fotos:${clientIp(request)}`, 10)) return luukError("Rustig aan met de foto's. Over tien minuten kijk ik weer. Sí.", 429);

  try {
    const { property, analysis } = await buildHouseData(parsed.value);
    const assessment = await assessHousePhotos(images, property, analysis);
    track(request, {
      module: "fotos",
      action: "photos",
      input: query,
      subject: property.adres,
      province: property.provincie,
      city: property.woonplaats,
      value: assessment.aangepastePrijs,
      meta: { fotoCount: images.length, conditieScore: assessment.conditieScore, correctie: assessment.correctiePercentage, source: assessment.source },
    });
    return Response.json(assessment);
  } catch (err) {
    console.error("[api/huizen/fotos]", err);
    return luukError(OOPS, 500);
  }
}
