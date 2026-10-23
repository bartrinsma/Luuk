import "server-only";
import { getDb } from "./db";
import type { Range } from "./dates";

export type BookingStatus = "aanvraag" | "bevestigd" | "geblokkeerd" | "afgewezen";

export interface Booking {
  id: number;
  arrival: string;
  departure: string;
  status: BookingStatus;
  guest_name: string | null;
  email: string | null;
  phone: string | null;
  guests: number | null;
  notes: string | null;
  price: string | null;
  source: string;
  created_at: string;
}

/** Statussen die de agenda bezet maken. Een aanvraag blokkeert nog niets. */
export const OCCUPYING: BookingStatus[] = ["bevestigd", "geblokkeerd"];

export async function occupiedRanges(): Promise<Range[]> {
  const db = await getDb();
  const rows = await db.query<{ arrival: string; departure: string }>(
    "SELECT arrival, departure FROM ma_bookings WHERE status = ANY($1) AND departure >= CURRENT_DATE - 31 ORDER BY arrival",
    [OCCUPYING],
  );
  return rows.map((r) => ({ van: r.arrival, tot: r.departure }));
}

/** Overlapt de periode met een bezette periode (optioneel een boeking zelf negeren)? */
export async function overlaps(arrival: string, departure: string, ignoreId?: number): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query(
    "SELECT 1 FROM ma_bookings WHERE status = ANY($1) AND arrival < $3 AND departure > $2 AND id <> $4 LIMIT 1",
    [OCCUPYING, arrival, departure, ignoreId ?? 0],
  );
  return rows.length > 0;
}

export async function listBookings(): Promise<Booking[]> {
  const db = await getDb();
  return db.query<Booking>("SELECT * FROM ma_bookings ORDER BY arrival DESC, id DESC");
}
