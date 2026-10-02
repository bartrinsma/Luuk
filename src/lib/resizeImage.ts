"use client";

/**
 * Verkleint een foto in de browser (max 1280 px, JPEG) voordat hij naar de server gaat.
 * Scheelt uploadtijd, blijft ruim onder de request-limieten van serverless hosting,
 * en verwijdert als bijeffect EXIF-data zoals GPS-locatie.
 */
export async function resizeImage(file: File, maxSize = 1280, quality = 0.82): Promise<{ dataUrl: string; base64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas niet beschikbaar");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}
