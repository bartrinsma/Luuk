/**
 * Validatie "The Luuk Way": geen "Invalid input", maar een antwoord met karakter.
 */

// Nederlandse kenteken-sidecodes 1 t/m 14 (L = letter, 9 = cijfer).
const SIDECODES: { pattern: RegExp; groups: number[] }[] = [
  { pattern: /^[A-Z]{2}\d{2}\d{2}$/, groups: [2, 2, 2] }, // 1  XX-99-99
  { pattern: /^\d{2}\d{2}[A-Z]{2}$/, groups: [2, 2, 2] }, // 2  99-99-XX
  { pattern: /^\d{2}[A-Z]{2}\d{2}$/, groups: [2, 2, 2] }, // 3  99-XX-99
  { pattern: /^[A-Z]{2}\d{2}[A-Z]{2}$/, groups: [2, 2, 2] }, // 4  XX-99-XX
  { pattern: /^[A-Z]{2}[A-Z]{2}\d{2}$/, groups: [2, 2, 2] }, // 5  XX-XX-99
  { pattern: /^\d{2}[A-Z]{2}[A-Z]{2}$/, groups: [2, 2, 2] }, // 6  99-XX-XX
  { pattern: /^\d{2}[A-Z]{3}\d$/, groups: [2, 3, 1] }, // 7  99-XXX-9
  { pattern: /^\d[A-Z]{3}\d{2}$/, groups: [1, 3, 2] }, // 8  9-XXX-99
  { pattern: /^[A-Z]{2}\d{3}[A-Z]$/, groups: [2, 3, 1] }, // 9  XX-999-X
  { pattern: /^[A-Z]\d{3}[A-Z]{2}$/, groups: [1, 3, 2] }, // 10 X-999-XX
  { pattern: /^[A-Z]{3}\d{2}[A-Z]$/, groups: [3, 2, 1] }, // 11 XXX-99-X
  { pattern: /^[A-Z]\d{2}[A-Z]{3}$/, groups: [1, 2, 3] }, // 12 X-99-XXX
  { pattern: /^\d[A-Z]{2}\d{3}$/, groups: [1, 2, 3] }, // 13 9-XX-999
  { pattern: /^\d{3}[A-Z]{2}\d$/, groups: [3, 2, 1] }, // 14 999-XX-9
];

export function normalizeKenteken(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidKenteken(input: string): boolean {
  const k = normalizeKenteken(input);
  return k.length === 6 && SIDECODES.some((s) => s.pattern.test(k));
}

/** Formatteert live tijdens het typen: streepjes op letter/cijfer-overgangen, sidecode bij 6 tekens. */
export function formatKenteken(input: string): string {
  const k = normalizeKenteken(input).slice(0, 6);
  if (k.length === 6) {
    const match = SIDECODES.find((s) => s.pattern.test(k));
    if (match) {
      const [a, b] = match.groups;
      return [k.slice(0, a), k.slice(a, a + b), k.slice(a + b)].join("-");
    }
  }
  let out = "";
  for (let i = 0; i < k.length; i++) {
    const prev = k[i - 1];
    const cur = k[i];
    if (prev && isDigit(prev) !== isDigit(cur)) out += "-";
    out += cur;
  }
  return out;
}

function isDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}

export function kentekenError(input: string): string {
  const k = normalizeKenteken(input);
  if (!k) return "Een leeg kenteken. Ambitieus, maar zelfs ik kan niets taxeren dat niet bestaat. Typ er eentje in. Sí.";
  if (/^\d+$/.test(k))
    return "Dat is geen kenteken, dat is een postcode in een land waar we niet zijn. Geef me een écht Nederlands kenteken. Sí.";
  if (/^[A-Z]+$/.test(k))
    return "Alleen letters? Dat is een woordzoeker, geen kenteken. Nederlandse platen mixen letters en cijfers. Probeer het opnieuw. Sí.";
  if (k.length < 6) return `${k.length} tekens. Een Nederlands kenteken heeft er zes. Ik reken, ik gok niet. Sí.`;
  if (k.length > 6) return "Te lang. Dit is een kenteken, geen wachtwoord. Zes tekens, meer heb ik niet nodig. Sí.";
  return "Zes tekens, maar geen enkele Nederlandse sidecode die dit goedkeurt. Check je plaat nog eens. Sí.";
}

// ---------- Postcodes & adressen ----------

const POSTCODE_RE = /^([1-9]\d{3})\s?(?!SA|SD|SS)([A-Z]{2})$/;

export function normalizePostcode(input: string): string | null {
  const m = POSTCODE_RE.exec(input.toUpperCase().trim());
  return m ? `${m[1]}${m[2]}` : null;
}

export function formatPostcode(pc: string): string {
  return `${pc.slice(0, 4)} ${pc.slice(4)}`;
}

export type AddressQuery =
  | { mode: "postcode"; postcode: string; huisnummer: number; toevoeging?: string }
  | { mode: "adres"; straat: string; huisnummer: number; toevoeging?: string; woonplaats: string };

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Slimme detectie: "1012 AB 12-3" of "Damrak 1A, Amsterdam". */
export function detectAddressMode(input: string): "postcode" | "adres" {
  return /^\s*[1-9]\d{3}(\s?[a-z]{2}\b|\s*$)/i.test(input) ? "postcode" : "adres";
}

export function parseAddressQuery(input: string, forcedMode?: "postcode" | "adres"): ParseResult<AddressQuery> {
  const text = input.trim();
  if (!text)
    return { ok: false, error: "Een leeg adres taxeren? Dan is de waarde nul en het advies: niet kopen. Geef me een postcode of straat. Sí." };

  const mode = forcedMode ?? detectAddressMode(text);

  if (mode === "postcode") {
    const m = /^([1-9]\d{3})\s?([a-z]{2})[\s,]+(\d{1,5})(?:\s*[-\s]\s*|)([a-z0-9]{1,4})?$/i.exec(text);
    if (!m) {
      if (/^\d{4}$/.test(text.replace(/\s/g, "")))
        return { ok: false, error: "Vier cijfers is een halve postcode. Ik wil de letters erbij én een huisnummer. Bijv. 1012 AB 1. Sí." };
      if (/^[1-9]\d{3}\s?[a-z]{2}$/i.test(text))
        return { ok: false, error: "Mooie postcode. Alleen woont er een hele straat. Welk huisnummer? Sí." };
      return { ok: false, error: "Dat is geen Nederlandse postcode. Vier cijfers, twee letters, één huisnummer. Zo moeilijk is het niet. Sí." };
    }
    const postcode = normalizePostcode(`${m[1]}${m[2]}`);
    if (!postcode)
      return { ok: false, error: "SA, SD en SS gebruiken we in Nederland niet in postcodes. Om historische redenen. Probeer een echte. Sí." };
    return { ok: true, value: { mode, postcode, huisnummer: Number(m[3]), toevoeging: m[4]?.toUpperCase() } };
  }

  const m = /^(.+?)\s+(\d{1,5})([a-z]{1,2}|\s*-\s*[a-z0-9]{1,4})?\s*,?\s+([^\d,][^\d]*)$/i.exec(text);
  if (!m) {
    if (!/\d/.test(text))
      return { ok: false, error: "Een straat zonder huisnummer is een wandeling, geen woning. Straat, huisnummer en plaats graag. Sí." };
    return { ok: false, error: "Ik mis iets. Formaat: straatnaam, huisnummer, woonplaats — bijv. Damrak 1, Amsterdam. Sí." };
  }
  return {
    ok: true,
    value: {
      mode,
      straat: titleCase(m[1].replace(/,$/, "").trim()),
      huisnummer: Number(m[2]),
      toevoeging: m[3]?.replace(/[\s-]/g, "").toUpperCase() || undefined,
      woonplaats: titleCase(m[4].trim()),
    },
  };
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

// ---------- URL's ----------

export function normalizeUrl(input: string): ParseResult<URL> {
  const text = input.trim();
  if (!text) return { ok: false, error: "Geen URL, geen roast. Geef me een domein, bijvoorbeeld jouwconcurrent.nl. Sí." };
  if (/\s/.test(text)) return { ok: false, error: "Er zitten spaties in je URL. Dat is al de eerste SEO-fout. Eén domein graag. Sí." };
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!/^https?:$/.test(url.protocol)) throw new Error("protocol");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)) throw new Error("host");
    return { ok: true, value: url };
  } catch {
    return { ok: false, error: "Dat is geen website, dat is een typefout met ambitie. Probeer iets als bedrijf.nl. Sí." };
  }
}

/** Gebruikt op Home om je naar de juiste module te sturen. */
export function detectIntent(query: string): "autos" | "huizen" | "roast" | null {
  const q = query.trim();
  if (/^[a-z0-9\s-]{6,8}$/i.test(q) && isValidKenteken(q)) return "autos";
  if (/^[1-9]\d{3}\s?[a-z]{2}[\s,]+\d+/i.test(q)) return "huizen";
  if (/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(q)) return "roast";
  return null;
}
