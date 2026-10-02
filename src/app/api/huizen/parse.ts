import { parseHouseInput, type HouseInput } from "@/lib/houseInput";
import type { ParseResult } from "@/lib/validation";

/**
 * Accepteert:
 *  { query: "1012 AB 1" | "Damrak 1, Amsterdam" | "https://www.funda.nl/…" } — vrije tekst, slimme detectie
 *  { postcode, huisnummer, toevoeging? }                                       — optie A
 *  { straat, huisnummer, toevoeging?, woonplaats }                             — optie B
 *  { funda: "https://www.funda.nl/…" }                                         — optie C
 */
export function parseAddressBody(body: Record<string, unknown> | null): ParseResult<HouseInput> {
  if (!body) return parseHouseInput("");
  const s = (k: string) => (typeof body[k] === "string" || typeof body[k] === "number" ? String(body[k]).trim() : "");
  const mode = body.mode === "postcode" || body.mode === "adres" || body.mode === "funda" ? body.mode : undefined;

  if (s("funda")) return parseHouseInput(s("funda"), "funda");
  if (s("query")) return parseHouseInput(s("query"), mode);

  const toevoeging = s("toevoeging") ? `-${s("toevoeging")}` : "";
  if (s("postcode")) return parseHouseInput(`${s("postcode")} ${s("huisnummer")}${toevoeging}`, "postcode");
  if (s("straat")) return parseHouseInput(`${s("straat")} ${s("huisnummer")}${toevoeging}, ${s("woonplaats")}`, "adres");
  return parseHouseInput("");
}
