import { parseAddressQuery, type AddressQuery, type ParseResult } from "@/lib/validation";

/**
 * Accepteert:
 *  { query: "1012 AB 1" }                                  — vrije tekst, slimme detectie
 *  { postcode, huisnummer, toevoeging? }                   — optie A
 *  { straat, huisnummer, toevoeging?, woonplaats }         — optie B
 */
export function parseAddressBody(body: Record<string, unknown> | null): ParseResult<AddressQuery> {
  if (!body) return parseAddressQuery("");
  const s = (k: string) => (typeof body[k] === "string" || typeof body[k] === "number" ? String(body[k]).trim() : "");
  const mode = body.mode === "postcode" || body.mode === "adres" ? body.mode : undefined;

  if (s("query")) return parseAddressQuery(s("query"), mode);

  const toevoeging = s("toevoeging") ? `-${s("toevoeging")}` : "";
  if (s("postcode")) return parseAddressQuery(`${s("postcode")} ${s("huisnummer")}${toevoeging}`, "postcode");
  if (s("straat")) return parseAddressQuery(`${s("straat")} ${s("huisnummer")}${toevoeging}, ${s("woonplaats")}`, "adres");
  return parseAddressQuery("");
}
