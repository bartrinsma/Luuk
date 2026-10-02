import "server-only";
import { getDb } from "@/lib/db";
import { POPULATION, PROVINCES, type Province } from "@/lib/provinces";

/**
 * Alle leesqueries voor het admin-dashboard. Aantallen worden in SQL naar int/float gecast,
 * zodat Postgres (strings voor bigint/numeric) en PGlite hetzelfde teruggeven.
 */

export const SEARCH_MODULES = ["huizen", "autos", "roast", "chat"] as const;
export type SearchModule = (typeof SEARCH_MODULES)[number];

export interface Filters {
  days: number; // 0 = alles
  module?: string | null;
  status?: string | null;
  province?: string | null;
  q?: string | null;
}

const TZ = "Europe/Amsterdam";

function where(f: Filters, extra: string[] = []) {
  const clauses: string[] = [...extra];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    clauses.push(sql.replace("?", `$${params.length}`));
  };
  if (f.days > 0) add("created_at >= now() - make_interval(days => ?)", f.days);
  if (f.module) add("module = ?", f.module);
  if (f.status) add("status = ?", f.status);
  if (f.province) {
    params.push(f.province);
    clauses.push(`(province = $${params.length} OR visitor_region = $${params.length})`);
  }
  if (f.q) {
    params.push(`%${f.q}%`);
    clauses.push(`(input ILIKE $${params.length} OR subject ILIKE $${params.length} OR city ILIKE $${params.length})`);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

// ---------- Overzicht ----------

export interface Overview {
  total: number;
  previousTotal: number;
  visitors: number;
  invalid: number;
  perModule: Record<string, number>;
  shares: { pdf: number; email: number; whatsapp: number };
  photos: number;
  storage: { kind: string; persistent: boolean };
}

export async function getOverview(days: number): Promise<Overview> {
  const db = await getDb();
  const w = where({ days });
  const [totals] = await db.query<{ total: number; visitors: number; invalid: number; photos: number }>(
    `SELECT COUNT(*) FILTER (WHERE action = 'search')::int AS total,
            COUNT(DISTINCT (visitor_hash, (created_at AT TIME ZONE '${TZ}')::date))::int AS visitors,
            COUNT(*) FILTER (WHERE status = 'invalid')::int AS invalid,
            COUNT(*) FILTER (WHERE action = 'photos')::int AS photos
       FROM luuk_events ${w.sql}`,
    w.params,
  );
  const modules = await db.query<{ module: string; n: number }>(
    `SELECT module, COUNT(*)::int AS n FROM luuk_events ${where({ days }, ["action = 'search'"]).sql} GROUP BY module`,
    w.params,
  );
  const shares = await db.query<{ action: string; n: number }>(
    `SELECT action, COUNT(*)::int AS n FROM luuk_events ${where({ days }, ["module = 'share'"]).sql} GROUP BY action`,
    w.params,
  );

  let previousTotal = 0;
  if (days > 0) {
    const [prev] = await db.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM luuk_events
        WHERE action = 'search' AND created_at < now() - make_interval(days => $1) AND created_at >= now() - make_interval(days => $2)`,
      [days, days * 2],
    );
    previousTotal = prev?.n ?? 0;
  }

  const s = Object.fromEntries(shares.map((r) => [r.action, r.n]));
  return {
    total: totals?.total ?? 0,
    previousTotal,
    visitors: totals?.visitors ?? 0,
    invalid: totals?.invalid ?? 0,
    perModule: Object.fromEntries(modules.map((r) => [r.module, r.n])),
    shares: { pdf: s.pdf ?? 0, email: s.email ?? 0, whatsapp: s.whatsapp ?? 0 },
    photos: totals?.photos ?? 0,
    storage: { kind: db.kind, persistent: db.persistent },
  };
}

// ---------- Tijdreeks ----------

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  counts: Record<SearchModule, number>;
}

export async function getDaily(days: number): Promise<DailyPoint[]> {
  const db = await getDb();
  const span = days > 0 ? days : 90;
  const rows = await db.query<{ day: string; module: SearchModule; n: number }>(
    `SELECT to_char((created_at AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS day, module, COUNT(*)::int AS n
       FROM luuk_events
      WHERE action = 'search' AND created_at >= now() - make_interval(days => $1)
      GROUP BY 1, 2`,
    [span],
  );

  const map = new Map<string, DailyPoint>();
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    map.set(key, { day: key, counts: { huizen: 0, autos: 0, roast: 0, chat: 0 } });
  }
  for (const r of rows) {
    const point = map.get(r.day);
    if (point && r.module in point.counts) point.counts[r.module] = r.n;
  }
  return [...map.values()];
}

// ---------- Provincies ----------

export interface ProvinceRow {
  province: Province;
  population: number;
  visitorRequests: number; // aanvragen dóór bezoekers uit deze provincie
  visitors: number;
  houseSearches: number; // gezochte huizen ín deze provincie
  avgWoz: number | null;
  miskoopShare: number | null; // aandeel "miskoop" van de gezochte huizen
  curiosityIndex: number; // aanvragen per 100.000 inwoners
}

export async function getProvinces(days: number): Promise<ProvinceRow[]> {
  const db = await getDb();
  const w = where({ days }, ["action = 'search'"]);
  const visitors = await db.query<{ region: string; n: number; v: number }>(
    `SELECT visitor_region AS region, COUNT(*)::int AS n,
            COUNT(DISTINCT (visitor_hash, (created_at AT TIME ZONE '${TZ}')::date))::int AS v
       FROM luuk_events ${w.sql} AND visitor_region IS NOT NULL GROUP BY 1`,
    w.params,
  );
  const houses = await db.query<{ province: string; n: number; avg: number | null; miskoop: number }>(
    `SELECT province, COUNT(*)::int AS n, AVG(value)::float8 AS avg,
            COUNT(*) FILTER (WHERE meta->>'verdict' = 'miskoop')::int AS miskoop
       FROM luuk_events ${where({ days }, ["module = 'huizen'", "status = 'ok'", "province IS NOT NULL"]).sql} GROUP BY 1`,
    w.params,
  );

  const v = new Map(visitors.map((r) => [r.region, r]));
  const h = new Map(houses.map((r) => [r.province, r]));
  return PROVINCES.map((province) => {
    const vr = v.get(province);
    const hr = h.get(province);
    const visitorRequests = vr?.n ?? 0;
    return {
      province,
      population: POPULATION[province],
      visitorRequests,
      visitors: vr?.v ?? 0,
      houseSearches: hr?.n ?? 0,
      avgWoz: hr?.avg ?? null,
      miskoopShare: hr && hr.n > 0 ? hr.miskoop / hr.n : null,
      curiosityIndex: (visitorRequests / POPULATION[province]) * 100_000,
    };
  });
}

/** Aantal aanvragen waarvan de bezoekersregio onbekend is (lokaal, VPN, buitenland). */
export async function getUnknownRegionCount(days: number): Promise<{ unknown: number; abroad: number }> {
  const db = await getDb();
  const w = where({ days }, ["action = 'search'"]);
  const [r] = await db.query<{ unknown: number; abroad: number }>(
    `SELECT COUNT(*) FILTER (WHERE visitor_region IS NULL AND (visitor_country IS NULL OR visitor_country = 'NL'))::int AS unknown,
            COUNT(*) FILTER (WHERE visitor_country IS NOT NULL AND visitor_country <> 'NL')::int AS abroad
       FROM luuk_events ${w.sql}`,
    w.params,
  );
  return r ?? { unknown: 0, abroad: 0 };
}

// ---------- Toplijsten ----------

export interface TopRow {
  label: string;
  n: number;
  avg: number | null;
}

async function top(sqlLabel: string, extra: string[], days: number, valueExpr = "AVG(value)::float8", limit = 10): Promise<TopRow[]> {
  const db = await getDb();
  const w = where({ days }, extra);
  return db.query<TopRow>(
    `SELECT ${sqlLabel} AS label, COUNT(*)::int AS n, ${valueExpr} AS avg
       FROM luuk_events ${w.sql} AND ${sqlLabel} IS NOT NULL AND ${sqlLabel} <> ''
      GROUP BY 1 ORDER BY n DESC, label ASC LIMIT ${limit}`,
    w.params,
  );
}

export const getTopCities = (days: number) => top("city", ["module = 'huizen'", "status = 'ok'"], days);
export const getTopAddresses = (days: number) => top("subject", ["module = 'huizen'", "status = 'ok'"], days);
export const getTopBrands = (days: number) => top("initcap(meta->>'merk')", ["module = 'autos'", "status = 'ok'"], days);
export const getTopPlates = (days: number) => top("subject", ["module = 'autos'", "status = 'ok'"], days);
export const getTopFuels = (days: number) => top("meta->>'brandstof'", ["module = 'autos'", "status = 'ok'"], days);
export const getTopDomains = (days: number) => top("subject", ["module = 'roast'", "status = 'ok'"], days);
export const getTopTlds = (days: number) => top("'.' || (meta->>'tld')", ["module = 'roast'", "status = 'ok'"], days);
export const getTopInvalid = (days: number) => top("module", ["status = 'invalid'"], days, "NULL::float8");

export async function getVerdicts(days: number): Promise<Record<string, number>> {
  const db = await getDb();
  const w = where({ days }, ["module = 'huizen'", "status = 'ok'"]);
  const rows = await db.query<{ verdict: string; n: number }>(
    `SELECT meta->>'verdict' AS verdict, COUNT(*)::int AS n FROM luuk_events ${w.sql} GROUP BY 1`,
    w.params,
  );
  return Object.fromEntries(rows.filter((r) => r.verdict).map((r) => [r.verdict, r.n]));
}

export async function getHourly(days: number): Promise<number[]> {
  const db = await getDb();
  const w = where({ days }, ["action = 'search'"]);
  const rows = await db.query<{ h: number; n: number }>(
    `SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE '${TZ}')::int AS h, COUNT(*)::int AS n FROM luuk_events ${w.sql} GROUP BY 1`,
    w.params,
  );
  const out = Array.from({ length: 24 }, () => 0);
  for (const r of rows) out[r.h] = r.n;
  return out;
}

export async function getWeekdays(days: number): Promise<number[]> {
  const db = await getDb();
  const w = where({ days }, ["action = 'search'"]);
  const rows = await db.query<{ d: number; n: number }>(
    `SELECT EXTRACT(ISODOW FROM created_at AT TIME ZONE '${TZ}')::int AS d, COUNT(*)::int AS n FROM luuk_events ${w.sql} GROUP BY 1`,
    w.params,
  );
  const out = Array.from({ length: 7 }, () => 0);
  for (const r of rows) out[r.d - 1] = r.n;
  return out;
}

// ---------- Aanvragen (ruwe lijst) ----------

export interface EventRow {
  id: string;
  created_at: string;
  module: string;
  action: string;
  status: string;
  input: string | null;
  subject: string | null;
  province: string | null;
  city: string | null;
  value: number | null;
  visitor_region: string | null;
  visitor_city: string | null;
  visitor_country: string | null;
  meta: Record<string, unknown>;
}

const EVENT_COLUMNS = `id::text, to_char(created_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD HH24:MI:SS') AS created_at, module, action, status,
  input, subject, province, city, value::float8 AS value, visitor_region, visitor_city, visitor_country, meta`;

export async function getEvents(f: Filters, page: number, pageSize = 50): Promise<{ rows: EventRow[]; total: number }> {
  const db = await getDb();
  const w = where(f);
  const [{ n }] = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM luuk_events ${w.sql}`, w.params);
  const rows = await db.query<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM luuk_events ${w.sql} ORDER BY created_at DESC, id DESC LIMIT ${pageSize} OFFSET ${Math.max(0, (page - 1) * pageSize)}`,
    w.params,
  );
  return { rows: rows.map(normalizeMeta), total: n };
}

export async function getEventsForExport(f: Filters, limit = 50_000): Promise<EventRow[]> {
  const db = await getDb();
  const w = where(f);
  const rows = await db.query<EventRow>(`SELECT ${EVENT_COLUMNS} FROM luuk_events ${w.sql} ORDER BY created_at DESC LIMIT ${limit}`, w.params);
  return rows.map(normalizeMeta);
}

/** postgres.js geeft jsonb soms als string terug (zonder type-parsers bij unsafe-queries). */
function normalizeMeta(r: EventRow): EventRow {
  if (typeof r.meta === "string") {
    try {
      return { ...r, meta: JSON.parse(r.meta) };
    } catch {
      return { ...r, meta: {} };
    }
  }
  return r;
}
