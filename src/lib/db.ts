import "server-only";

/**
 * Database-laag voor analytics. Overal dezelfde SQL (Postgres):
 *  - DATABASE_URL / NETLIFY_DATABASE_URL gezet → echte Postgres (Netlify DB, Neon, Supabase, …)
 *  - anders → PGlite: Postgres in WASM, opgeslagen in .data/pglite (lokaal) of /tmp (serverless, NIET blijvend)
 */

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  kind: "postgres" | "pglite";
  persistent: boolean;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS luuk_events (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  module        TEXT NOT NULL,              -- huizen | autos | roast | chat | fotos | share
  action        TEXT NOT NULL,              -- search | photos | pdf | email | whatsapp
  status        TEXT NOT NULL,              -- ok | invalid | not_found | error
  input         TEXT,                       -- wat de gebruiker intypte (ingekort)
  subject       TEXT,                       -- adres, kenteken of domein
  province      TEXT,                       -- provincie van het gezochte huis
  city          TEXT,                       -- woonplaats van het gezochte huis
  value         NUMERIC,                    -- WOZ, dagwaarde of mobiele score
  visitor_hash  TEXT,                       -- dagelijks wisselende hash, geen IP
  visitor_region TEXT,                      -- provincie van de bezoeker (geo-IP van de host)
  visitor_city  TEXT,
  visitor_country TEXT,
  meta          JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS luuk_events_created_idx ON luuk_events (created_at DESC);
CREATE INDEX IF NOT EXISTS luuk_events_module_idx ON luuk_events (module, created_at DESC);
`;

let dbPromise: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  dbPromise ??= createDb().catch((err) => {
    dbPromise = null; // volgende keer opnieuw proberen
    throw err;
  });
  return dbPromise;
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { max: 3, idle_timeout: 20, prepare: false, onnotice: () => {} });
    await sql.unsafe(SCHEMA);
    return {
      kind: "postgres",
      persistent: true,
      query: async <T,>(text: string, params: unknown[] = []) => (await sql.unsafe(text, params as never[])) as unknown as T[],
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const serverless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
  const dir = process.env.LUUK_PGLITE_DIR || (serverless ? "/tmp/luuk-pglite" : ".data/pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.exec(SCHEMA);
  return {
    kind: "pglite",
    persistent: !serverless,
    query: async <T,>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows,
  };
}
