/** Datumhulpjes in lokale tijd op basis van "JJJJ-MM-DD"-strings (ook bruikbaar in de browser). */

export const MONTHS = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli",
  "Augustus", "September", "Oktober", "November", "December"];

const pad = (n: number) => String(n).padStart(2, "0");

export function parseDate(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 ? date : null;
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function nightsBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function nightsLabel(n: number): string {
  return `${n} ${n === 1 ? "nacht" : "nachten"}`;
}

export function niceDate(d: Date, withWeekday = true): string {
  return d.toLocaleDateString("nl-NL", {
    weekday: withWeekday ? "short" : undefined,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

/** Bezette periode: aankomst t/m vertrek (vertrekdag is weer vrij voor de volgende gast). */
export interface Range {
  van: string;
  tot: string;
}

/** Is de nacht die op dag `d` begint bezet? */
export function nightBooked(d: Date, ranges: Range[]): boolean {
  const iso = isoDate(d);
  return ranges.some((r) => iso >= r.van && iso < r.tot);
}

/** Zijn alle nachten van aankomst t/m de nacht vóór vertrek vrij? */
export function rangeFree(a: Date, b: Date, ranges: Range[]): boolean {
  const from = isoDate(a);
  const to = isoDate(b);
  return !ranges.some((r) => r.van < to && r.tot > from);
}
