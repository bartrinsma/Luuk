"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { overlaps } from "@/lib/bookings";
import { addDays, niceDate, parseDate, today } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { notifyOwner } from "@/lib/email";
import { MAX_GUESTS, MIN_NIGHTS, euro, priceFor } from "@/lib/rates";
import { rateLimit } from "@/lib/rateLimit";

export interface ReservationState {
  ok?: boolean;
  name?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const str = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);

export async function submitReservation(_prev: ReservationState | undefined, fd: FormData): Promise<ReservationState> {
  // Honeypot: bots vullen dit verborgen veld in. Doe alsof het gelukt is.
  if (str(fd, "website")) return { ok: true };

  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`reserveren:${ip}`, 5, 60 * 60 * 1000)) {
    return { error: "Je hebt al een aantal aanvragen verstuurd. Probeer het later opnieuw of stuur ons een e-mail." };
  }

  const naam = str(fd, "naam", 120);
  const email = str(fd, "email", 200);
  const telefoon = str(fd, "telefoon", 40);
  const gasten = Number(fd.get("gasten"));
  const toelichting = str(fd, "toelichting", 4000);
  const a = parseDate(str(fd, "aankomst", 10));
  const b = parseDate(str(fd, "vertrek", 10));

  const fe: Record<string, string> = {};
  if (naam.length < 2) fe.naam = "Vul je naam in.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fe.email = "Vul een geldig e-mailadres in.";
  if (!/^\+?\d{8,15}$/.test(telefoon.replace(/[\s\-().]/g, ""))) fe.telefoon = "Vul een geldig telefoonnummer in.";
  if (!Number.isInteger(gasten) || gasten < 1 || gasten > MAX_GUESTS) fe.gasten = "Kies het aantal gasten.";
  if (!a || a < addDays(today(), 1)) fe.aankomst = "Kies een aankomstdatum in de toekomst.";
  if (!b || (a && b <= a)) fe.vertrek = "De vertrekdatum moet na de aankomstdatum liggen.";
  if (a && b && b > a && !fe.aankomst) {
    if (priceFor(a, b).nights < MIN_NIGHTS) fe.vertrek = `Het minimale verblijf is ${MIN_NIGHTS} nachten.`;
    else if (await overlaps(str(fd, "aankomst"), str(fd, "vertrek"))) {
      fe.vertrek = "Het appartement is in (een deel van) deze periode al bezet.";
    }
  }
  if (Object.keys(fe).length) return { fieldErrors: fe };

  const p = priceFor(a!, b!);
  const db = await getDb();
  await db.query(
    `INSERT INTO ma_bookings (arrival, departure, status, guest_name, email, phone, guests, notes, price, source)
     VALUES ($1, $2, 'aanvraag', $3, $4, $5, $6, $7, $8, 'website')`,
    [str(fd, "aankomst"), str(fd, "vertrek"), naam, email, telefoon, gasten, toelichting || null, p.total],
  );
  revalidatePath("/admin", "layout");

  await notifyOwner(
    `Nieuwe reserveringsaanvraag: ${naam} (${niceDate(a!, false)} – ${niceDate(b!, false)})`,
    [
      `Naam: ${naam}`,
      `E-mail: ${email}`,
      `Telefoon: ${telefoon}`,
      `Aantal gasten: ${gasten}`,
      `Aankomst: ${niceDate(a!)}`,
      `Vertrek: ${niceDate(b!)}`,
      `Aantal nachten: ${p.nights}`,
      `Prijsindicatie (incl. schoonmaak, excl. borg): ${euro(p.total)}`,
      "",
      `Toelichting: ${toelichting || "-"}`,
      "",
      "Bevestig of wijs de aanvraag af in de admin: /admin/boekingen/",
    ].join("\n"),
    email,
  );

  return { ok: true, name: naam.split(" ")[0] };
}
