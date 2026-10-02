import type { Filters } from "@/lib/analytics/queries";
import { PROVINCES } from "@/lib/provinces";

export const MODULE_OPTIONS = ["huizen", "autos", "roast", "chat", "fotos", "share"] as const;
export const STATUS_OPTIONS = ["ok", "invalid", "not_found", "error"] as const;

export const PERIODS = [
  { value: 7, label: "7 dagen" },
  { value: 30, label: "30 dagen" },
  { value: 90, label: "90 dagen" },
  { value: 365, label: "1 jaar" },
  { value: 0, label: "Alles" },
] as const;

export function parsePeriod(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return PERIODS.some((p) => p.value === n) ? n : 30;
}

export function periodLabel(days: number): string {
  return days === 0 ? "sinds de start" : `afgelopen ${days} dagen`;
}

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Leest filters uit de querystring en accepteert alleen bekende waarden. */
export function filtersFromParams(params: Params): Filters & { page: number } {
  const moduleParam = one(params.module);
  const status = one(params.status);
  const province = one(params.provincie);
  const q = one(params.q).trim().slice(0, 100);
  return {
    days: parsePeriod(params.periode),
    module: (MODULE_OPTIONS as readonly string[]).includes(moduleParam) ? moduleParam : null,
    status: (STATUS_OPTIONS as readonly string[]).includes(status) ? status : null,
    province: (PROVINCES as readonly string[]).includes(province) ? province : null,
    q: q || null,
    page: Math.max(1, Math.floor(Number(one(params.pagina)) || 1)),
  };
}

export function filtersToQuery(f: Filters & { page?: number }): URLSearchParams {
  const qs = new URLSearchParams({ periode: String(f.days) });
  if (f.module) qs.set("module", f.module);
  if (f.status) qs.set("status", f.status);
  if (f.province) qs.set("provincie", f.province);
  if (f.q) qs.set("q", f.q);
  if (f.page && f.page > 1) qs.set("pagina", String(f.page));
  return qs;
}
