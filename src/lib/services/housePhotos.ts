import type { Property } from "@/lib/services/kadaster";
import type { FundaListing } from "@/lib/services/funda";

/**
 * Een foto van de woning, in volgorde van voorkeur:
 *  1. Google Street View (gevel)      — vereist GOOGLE_MAPS_API_KEY; key blijft op de server via /api/huizen/streetview
 *  2. Hoofdfoto van de Funda-advertentie
 *  3. Luchtfoto van PDOK              — gratis, zonder key, op basis van de PDOK-coördinaten
 */

export type HousePhotoSource = "streetview" | "funda" | "luchtfoto";

export interface HousePhoto {
  url: string;
  source: HousePhotoSource;
  label: string;
  attribution: string;
}

export async function resolveHousePhotos(property: Property, funda: FundaListing | null): Promise<HousePhoto[]> {
  const photos: HousePhoto[] = [];
  const location = streetViewLocation(property);

  if (process.env.GOOGLE_MAPS_API_KEY && (await streetViewAvailable(location))) {
    photos.push({
      url: `/api/huizen/streetview?location=${encodeURIComponent(location)}`,
      source: "streetview",
      label: "Voorgevel",
      attribution: "Beeld: Google Street View",
    });
  }
  if (funda?.foto) {
    photos.push({ url: funda.foto, source: "funda", label: "Funda-foto", attribution: "Foto: Funda" });
  }
  if (property.coords) {
    photos.push({ url: pdokAerialUrl(property.coords), source: "luchtfoto", label: "Luchtfoto", attribution: "Luchtfoto: PDOK / Beeldmateriaal Nederland" });
  }
  return photos;
}

/** Coördinaten zijn het nauwkeurigst; anders het adres als tekst. */
export function streetViewLocation(p: Property): string {
  if (p.coords) return `${p.coords.lat.toFixed(6)},${p.coords.lon.toFixed(6)}`;
  return `${p.straat} ${p.huisnummer}, ${p.postcode ? `${p.postcode} ` : ""}${p.woonplaats}, Nederland`;
}

/** De metadata-endpoint is gratis en vertelt of er beeld is, zonder een (betaalde) afbeelding op te halen. */
async function streetViewAvailable(location: string): Promise<boolean> {
  try {
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${encodeURIComponent(location)}&source=outdoor&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500), next: { revalidate: 86400 } });
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string };
    return data.status === "OK";
  } catch {
    return false;
  }
}

export function streetViewImageUrl(location: string): string {
  const params = new URLSearchParams({
    size: "960x600",
    location,
    fov: "80",
    pitch: "8",
    source: "outdoor",
    return_error_code: "true",
    key: process.env.GOOGLE_MAPS_API_KEY ?? "",
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params}`;
}

/** PDOK WMS (Actueel_orthoHR), ~60×40 m rond het adres. WMS 1.3.0 + EPSG:4326 = as-volgorde lat,lon. */
function pdokAerialUrl({ lat, lon }: { lat: number; lon: number }): string {
  const dLat = 0.00018;
  const dLon = 0.00044;
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: "Actueel_orthoHR",
    STYLES: "",
    CRS: "EPSG:4326",
    BBOX: [lat - dLat, lon - dLon, lat + dLat, lon + dLon].map((n) => n.toFixed(6)).join(","),
    WIDTH: "960",
    HEIGHT: "600",
    FORMAT: "image/jpeg",
  });
  return `https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0?${params}`;
}
