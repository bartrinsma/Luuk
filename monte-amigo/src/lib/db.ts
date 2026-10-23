import "server-only";
import { SEED_BOOKINGS, SEED_REVIEWS } from "./seed";

/**
 * Database-laag. Overal dezelfde SQL (Postgres):
 *  - DATABASE_URL / NETLIFY_DATABASE_URL gezet → echte Postgres (Netlify DB, Neon, Supabase, …)
 *  - anders → PGlite: Postgres in WASM, opgeslagen in .data/pglite (lokaal) of /tmp (serverless, NIET blijvend)
 */

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  kind: "postgres" | "pglite";
  persistent: boolean;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS ma_bookings (
  id          SERIAL PRIMARY KEY,
  arrival     DATE NOT NULL,
  departure   DATE NOT NULL CHECK (departure > arrival),
  status      TEXT NOT NULL DEFAULT 'bevestigd',   -- aanvraag | bevestigd | geblokkeerd | afgewezen
  guest_name  TEXT,
  email       TEXT,
  phone       TEXT,
  guests      INT,
  notes       TEXT,
  price       NUMERIC,                             -- prijsindicatie bij de aanvraag
  source      TEXT NOT NULL DEFAULT 'admin',       -- website | admin
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ma_bookings_dates_idx ON ma_bookings (arrival, departure);

CREATE TABLE IF NOT EXISTS ma_reviews (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  period      TEXT NOT NULL DEFAULT '',            -- bijv. "2024" of "juli 2024"
  body        TEXT NOT NULL,
  published   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ma_bugs (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  actual       TEXT NOT NULL,                      -- wat gaat er mis
  expected     TEXT,                               -- wat had je verwacht
  page_url     TEXT,
  priority     TEXT NOT NULL DEFAULT 'normaal',    -- laag | normaal | hoog
  reporter     TEXT,
  ticket_id    TEXT,                               -- id in tickets.onlinemetbart.nl
  ticket_error TEXT,
  synced_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ma_settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
`;

let dbPromise: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  dbPromise ??= createDb()
    .then(async (db) => {
      await seed(db);
      return db;
    })
    .catch((err) => {
      dbPromise = null; // volgende keer opnieuw proberen
      throw err;
    });
  return dbPromise;
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

  if (url) {
    const { default: postgres } = await import("postgres");
    // DATE als tekst teruggeven ("JJJJ-MM-DD"), zonder tijdzone-omrekening.
    const sql = postgres(url, {
      max: 3,
      idle_timeout: 20,
      prepare: false,
      onnotice: () => {},
      types: { date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v } },
    });
    await sql.unsafe(SCHEMA);
    return {
      kind: "postgres",
      persistent: true,
      query: async <T,>(text: string, params: unknown[] = []) => (await sql.unsafe(text, params as never[])) as unknown as T[],
    };
  }

  const { PGlite, types } = await import("@electric-sql/pglite");
  const serverless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
  const dir = process.env.MA_PGLITE_DIR || (serverless ? "/tmp/monte-amigo-pglite" : ".data/pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir, { parsers: { [types.DATE]: (v: string) => v } });
  await pg.exec(SCHEMA);
  return {
    kind: "pglite",
    persistent: !serverless,
    query: async <T,>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows,
  };
}

/** Eenmalig de gegevens van de oude site overnemen (ook als de eigenaar later alles verwijdert, niet opnieuw). */
async function seed(db: Db): Promise<void> {
  const claimed = await db.query(
    "INSERT INTO ma_settings (key, value) VALUES ('seeded', now()::text) ON CONFLICT (key) DO NOTHING RETURNING key",
  );
  if (!claimed.length) return;

  for (const r of SEED_REVIEWS) {
    await db.query("INSERT INTO ma_reviews (name, rating, period, body) VALUES ($1, $2, $3, $4)", [r.name, r.rating, r.period, r.body]);
  }
  for (const b of SEED_BOOKINGS) {
    await db.query("INSERT INTO ma_bookings (arrival, departure, status, source, notes) VALUES ($1, $2, 'bevestigd', 'admin', $3)", [
      b.arrival,
      b.departure,
      "Overgenomen uit de oude agenda",
    ]);
  }
}
