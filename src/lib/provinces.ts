/**
 * Provincies: koppeling vanuit postcode, plaatsnaam en geo-IP-codes, plus inwonertallen
 * (CBS, afgerond, 1 jan 2024) voor de "nieuwsgierigheidsindex" (aanvragen per 100.000 inwoners).
 */

export const PROVINCES = [
  "Groningen", "Friesland", "Drenthe", "Overijssel", "Flevoland", "Gelderland",
  "Utrecht", "Noord-Holland", "Zuid-Holland", "Zeeland", "Noord-Brabant", "Limburg",
] as const;

export type Province = (typeof PROVINCES)[number];

export const POPULATION: Record<Province, number> = {
  Groningen: 596_000,
  Friesland: 659_000,
  Drenthe: 502_000,
  Overijssel: 1_181_000,
  Flevoland: 444_000,
  Gelderland: 2_133_000,
  Utrecht: 1_389_000,
  "Noord-Holland": 2_952_000,
  "Zuid-Holland": 3_804_000,
  Zeeland: 391_000,
  "Noord-Brabant": 2_626_000,
  Limburg: 1_118_000,
};

/** Bijvoeglijk naamwoord / inwonersnaam voor de blog-teksten. */
export const DEMONYM: Record<Province, string> = {
  Groningen: "Groningers",
  Friesland: "Friezen",
  Drenthe: "Drenten",
  Overijssel: "Overijsselaars",
  Flevoland: "Flevolanders",
  Gelderland: "Gelderlanders",
  Utrecht: "Utrechters",
  "Noord-Holland": "Noord-Hollanders",
  "Zuid-Holland": "Zuid-Hollanders",
  Zeeland: "Zeeuwen",
  "Noord-Brabant": "Brabanders",
  Limburg: "Limburgers",
};

/** Postcodegebieden (eerste 4 cijfers). Indicatief: grensgebieden kunnen afwijken. */
const POSTCODE_RANGES: [number, number, Province][] = [
  [1000, 1299, "Noord-Holland"],
  [1300, 1379, "Flevoland"],
  [1380, 2199, "Noord-Holland"],
  [2200, 3399, "Zuid-Holland"],
  [3400, 3889, "Utrecht"],
  [3890, 3899, "Flevoland"],
  [3900, 3999, "Utrecht"],
  [4000, 4199, "Gelderland"],
  [4200, 4249, "Zuid-Holland"],
  [4250, 4299, "Noord-Brabant"],
  [4300, 4599, "Zeeland"],
  [4600, 5299, "Noord-Brabant"],
  [5300, 5335, "Gelderland"],
  [5336, 5765, "Noord-Brabant"],
  [5766, 6499, "Limburg"],
  [6500, 7399, "Gelderland"],
  [7400, 7799, "Overijssel"],
  [7800, 7999, "Drenthe"],
  [8000, 8199, "Overijssel"],
  [8200, 8259, "Flevoland"],
  [8260, 8299, "Overijssel"],
  [8300, 8329, "Flevoland"],
  [8330, 8399, "Overijssel"],
  [8400, 9299, "Friesland"],
  [9300, 9349, "Drenthe"],
  [9350, 9399, "Groningen"],
  [9400, 9499, "Drenthe"],
  [9500, 9999, "Groningen"],
];

export function provinceFromPostcode(postcode: string | null | undefined): Province | null {
  const n = postcode ? Number(postcode.slice(0, 4)) : NaN;
  if (!Number.isFinite(n)) return null;
  return POSTCODE_RANGES.find(([a, b]) => n >= a && n <= b)?.[2] ?? null;
}

const CITY_PROVINCE: Record<string, Province> = {
  amsterdam: "Noord-Holland", haarlem: "Noord-Holland", hilversum: "Noord-Holland", zaandam: "Noord-Holland", alkmaar: "Noord-Holland",
  almere: "Flevoland", lelystad: "Flevoland",
  rotterdam: "Zuid-Holland", "den haag": "Zuid-Holland", "'s-gravenhage": "Zuid-Holland", leiden: "Zuid-Holland", delft: "Zuid-Holland",
  dordrecht: "Zuid-Holland", gouda: "Zuid-Holland", zoetermeer: "Zuid-Holland",
  utrecht: "Utrecht", amersfoort: "Utrecht", zeist: "Utrecht", nieuwegein: "Utrecht",
  breda: "Noord-Brabant", tilburg: "Noord-Brabant", eindhoven: "Noord-Brabant", "'s-hertogenbosch": "Noord-Brabant", "den bosch": "Noord-Brabant", helmond: "Noord-Brabant",
  maastricht: "Limburg", venlo: "Limburg", heerlen: "Limburg", sittard: "Limburg", roermond: "Limburg",
  nijmegen: "Gelderland", arnhem: "Gelderland", apeldoorn: "Gelderland", ede: "Gelderland",
  zwolle: "Overijssel", enschede: "Overijssel", deventer: "Overijssel", hengelo: "Overijssel",
  leeuwarden: "Friesland", heerenveen: "Friesland", sneek: "Friesland",
  groningen: "Groningen",
  assen: "Drenthe", emmen: "Drenthe",
  middelburg: "Zeeland", vlissingen: "Zeeland", goes: "Zeeland",
};

export function provinceFromCity(city: string | null | undefined): Province | null {
  return city ? (CITY_PROVINCE[city.trim().toLowerCase()] ?? null) : null;
}

/** Normaliseert een provincienaam uit PDOK ("Fryslân") of geo-IP. */
export function normalizeProvince(name: string | null | undefined): Province | null {
  if (!name) return null;
  const n = name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n === "fryslan" || n === "friesland") return "Friesland";
  return PROVINCES.find((p) => p.toLowerCase() === n) ?? null;
}

/** ISO 3166-2:NL-subdivisiecodes zoals hosts (Netlify, Vercel, Cloudflare) die meegeven. */
const ISO_CODES: Record<string, Province> = {
  DR: "Drenthe", FL: "Flevoland", FR: "Friesland", GE: "Gelderland", GR: "Groningen", LI: "Limburg",
  NB: "Noord-Brabant", NH: "Noord-Holland", OV: "Overijssel", UT: "Utrecht", ZE: "Zeeland", ZH: "Zuid-Holland",
};

export function provinceFromIsoCode(code: string | null | undefined): Province | null {
  if (!code) return null;
  return ISO_CODES[code.toUpperCase().replace(/^NL-/, "")] ?? null;
}
