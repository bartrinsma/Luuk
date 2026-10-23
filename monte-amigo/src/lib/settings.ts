import "server-only";
import { getDb } from "./db";

export interface TicketSettings {
  url: string;
  key: string;
  /** Bug direct als ticket doorsturen bij het opslaan. */
  auto: boolean;
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.query<{ value: string }>("SELECT value FROM ma_settings WHERE key = $1", [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.query(
    "INSERT INTO ma_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [key, value],
  );
}

/** Instellingen uit /admin/instellingen, met omgevingsvariabelen als terugval. */
export async function ticketSettings(): Promise<TicketSettings> {
  const [url, key, auto] = await Promise.all([
    getSetting("tickets_api_url"),
    getSetting("tickets_api_key"),
    getSetting("tickets_auto"),
  ]);
  return {
    url: (url || process.env.TICKETS_API_URL || "https://tickets.onlinemetbart.nl").replace(/\/+$/, ""),
    key: key || process.env.TICKETS_API_KEY || "",
    auto: auto !== "0",
  };
}
