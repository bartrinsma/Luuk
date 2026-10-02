import { isFundaUrl, parseFundaUrl, type ParsedFundaUrl } from "@/lib/services/funda";
import { parseAddressQuery, type AddressQuery, type ParseResult } from "@/lib/validation";

/** Alles wat de Huizen-module accepteert: postcode, straat + plaats, of een Funda-link. */
export type HouseInput = { kind: "address"; query: AddressQuery } | { kind: "funda"; funda: ParsedFundaUrl };

export type HouseMode = "postcode" | "adres" | "funda";

export function detectHouseMode(input: string): HouseMode {
  if (isFundaUrl(input)) return "funda";
  return /^\s*[1-9]\d{3}(\s?[a-z]{2}\b|\s*$)/i.test(input) ? "postcode" : "adres";
}

/** Isomorf: dezelfde validatie in de browser (direct feedback) en op de server. */
export function parseHouseInput(input: string, forcedMode?: HouseMode): ParseResult<HouseInput> {
  const mode = isFundaUrl(input) ? "funda" : forcedMode;
  if (mode === "funda") {
    if (!isFundaUrl(input))
      return { ok: false, error: "Dat is geen Funda-link. Plak de volledige URL van de advertentie, die begint met funda.nl/… Sí." };
    const parsed = parseFundaUrl(input);
    return parsed.ok ? { ok: true, value: { kind: "funda", funda: parsed.value } } : parsed;
  }
  const parsed = parseAddressQuery(input, mode);
  return parsed.ok ? { ok: true, value: { kind: "address", query: parsed.value } } : parsed;
}
