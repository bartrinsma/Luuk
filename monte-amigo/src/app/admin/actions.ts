"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminConfigured, checkPassword, createSessionValue, requireAdmin } from "@/lib/auth";
import { overlaps } from "@/lib/bookings";
import { parseDate } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { setSetting, ticketSettings } from "@/lib/settings";
import { syncBug, testConnection } from "@/lib/tickets";

/* ---------- Inloggen ---------- */

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState | undefined, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: "De admin staat uit: stel ADMIN_PASSWORD in op de server." };

  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`admin-login:${ip}`, 8, 15 * 60 * 1000)) return { error: "Te veel pogingen. Probeer het over een kwartier opnieuw." };

  if (!checkPassword(String(formData.get("password") ?? ""))) return { error: "Onjuist wachtwoord." };

  const { value, maxAge } = createSessionValue();
  (await cookies()).set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  redirect("/admin/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login/");
}

/* ---------- Hulpjes ---------- */

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const id = (fd: FormData) => Number(fd.get("id")) || 0;

function done(path: string, msg: string, kind: "ok" | "fout" = "ok"): never {
  revalidatePath("/", "layout");
  redirect(`${path}?${kind}=${encodeURIComponent(msg)}`);
}

/* ---------- Boekingen ---------- */

const BOOKING_STATUSES = ["aanvraag", "bevestigd", "geblokkeerd", "afgewezen"];

export async function saveBooking(fd: FormData): Promise<void> {
  await requireAdmin();
  const P = "/admin/boekingen/";
  const bookingId = id(fd);
  const arrival = str(fd, "arrival", 10);
  const departure = str(fd, "departure", 10);
  const status = str(fd, "status", 20);
  if (!parseDate(arrival) || !parseDate(departure)) done(P, "Vul een geldige aankomst- en vertrekdatum in.", "fout");
  if (departure <= arrival) done(P, "De vertrekdatum moet na de aankomstdatum liggen.", "fout");
  if (!BOOKING_STATUSES.includes(status)) done(P, "Onbekende status.", "fout");
  if ((status === "bevestigd" || status === "geblokkeerd") && (await overlaps(arrival, departure, bookingId))) {
    done(P, "Deze periode overlapt met een andere bezette periode.", "fout");
  }

  const guests = Number(fd.get("guests")) || null;
  const values = [arrival, departure, status, str(fd, "guest_name", 120) || null, str(fd, "email", 200) || null,
    str(fd, "phone", 40) || null, guests, str(fd, "notes", 4000) || null];
  const db = await getDb();
  if (bookingId) {
    await db.query(
      `UPDATE ma_bookings SET arrival=$1, departure=$2, status=$3, guest_name=$4, email=$5, phone=$6, guests=$7, notes=$8 WHERE id=$9`,
      [...values, bookingId],
    );
    done(P, "Boeking bijgewerkt.");
  }
  await db.query(
    `INSERT INTO ma_bookings (arrival, departure, status, guest_name, email, phone, guests, notes, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'admin')`,
    values,
  );
  done(P, status === "geblokkeerd" ? "Periode geblokkeerd." : "Boeking toegevoegd.");
}

export async function setBookingStatus(fd: FormData): Promise<void> {
  await requireAdmin();
  const P = "/admin/boekingen/";
  const status = str(fd, "status", 20);
  if (!BOOKING_STATUSES.includes(status)) done(P, "Onbekende status.", "fout");
  const db = await getDb();
  const [b] = await db.query<{ arrival: string; departure: string }>("SELECT arrival, departure FROM ma_bookings WHERE id=$1", [id(fd)]);
  if (!b) done(P, "Boeking niet gevonden.", "fout");
  if (status === "bevestigd" && (await overlaps(b.arrival, b.departure, id(fd)))) {
    done(P, "Kan niet bevestigen: de periode overlapt met een andere boeking.", "fout");
  }
  await db.query("UPDATE ma_bookings SET status=$2 WHERE id=$1", [id(fd), status]);
  done(P, status === "bevestigd" ? "Aanvraag bevestigd; de agenda is bijgewerkt." : "Status gewijzigd.");
}

export async function deleteBooking(fd: FormData): Promise<void> {
  await requireAdmin();
  const db = await getDb();
  await db.query("DELETE FROM ma_bookings WHERE id=$1", [id(fd)]);
  done("/admin/boekingen/", "Boeking verwijderd.");
}

/* ---------- Recensies ---------- */

export async function saveReview(fd: FormData): Promise<void> {
  await requireAdmin();
  const P = "/admin/recensies/";
  const name = str(fd, "name", 120);
  const body = str(fd, "body", 6000);
  const rating = Number(fd.get("rating"));
  const period = str(fd, "period", 40);
  const published = fd.get("published") === "on";
  if (!name || !body) done(P, "Vul een naam en de recensie in.", "fout");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) done(P, "Kies 1 tot 5 sterren.", "fout");

  const db = await getDb();
  const reviewId = id(fd);
  if (reviewId) {
    await db.query("UPDATE ma_reviews SET name=$1, rating=$2, period=$3, body=$4, published=$5 WHERE id=$6", [
      name, rating, period, body, published, reviewId,
    ]);
    done(P, "Recensie bijgewerkt.");
  }
  await db.query("INSERT INTO ma_reviews (name, rating, period, body, published) VALUES ($1, $2, $3, $4, $5)", [
    name, rating, period, body, published,
  ]);
  done(P, published ? "Recensie toegevoegd en gepubliceerd." : "Recensie opgeslagen als concept.");
}

export async function toggleReview(fd: FormData): Promise<void> {
  await requireAdmin();
  const db = await getDb();
  await db.query("UPDATE ma_reviews SET published = NOT published WHERE id=$1", [id(fd)]);
  done("/admin/recensies/", "Zichtbaarheid gewijzigd.");
}

export async function deleteReview(fd: FormData): Promise<void> {
  await requireAdmin();
  const db = await getDb();
  await db.query("DELETE FROM ma_reviews WHERE id=$1", [id(fd)]);
  done("/admin/recensies/", "Recensie verwijderd.");
}

/* ---------- Bugs ---------- */

const PRIORITIES = ["laag", "normaal", "hoog"];

export async function createBug(fd: FormData): Promise<void> {
  await requireAdmin();
  const P = "/admin/bug/";
  const title = str(fd, "title", 160);
  const actual = str(fd, "actual", 6000);
  const priority = PRIORITIES.includes(str(fd, "priority")) ? str(fd, "priority") : "normaal";
  if (!title || !actual) done(P, "Vul een titel en een beschrijving in.", "fout");
  const pageUrl = str(fd, "page_url", 500);
  if (pageUrl && !/^https?:\/\//i.test(pageUrl) && !pageUrl.startsWith("/")) done(P, "De pagina-URL moet met http(s):// of / beginnen.", "fout");

  const db = await getDb();
  const [row] = await db.query<{ id: number }>(
    "INSERT INTO ma_bugs (title, actual, expected, page_url, priority, reporter) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [title, actual, str(fd, "expected", 6000) || null, pageUrl || null, priority, str(fd, "reporter", 120) || null],
  );

  if (!(await ticketSettings()).auto) done(P, "Bug opgeslagen. Automatisch doorsturen staat uit.");
  const res = await syncBug(row.id);
  if (res.ok) done(P, "Bug opgeslagen en als ticket op de to-do lijst gezet.");
  done(P, `Bug opgeslagen, maar doorsturen is mislukt: ${res.error}`, "fout");
}

export async function retryBug(fd: FormData): Promise<void> {
  await requireAdmin();
  const res = await syncBug(id(fd));
  if (res.ok) done("/admin/bug/", "Ticket aangemaakt.");
  done("/admin/bug/", `Doorsturen mislukt: ${res.error}`, "fout");
}

export async function deleteBug(fd: FormData): Promise<void> {
  await requireAdmin();
  const db = await getDb();
  await db.query("DELETE FROM ma_bugs WHERE id=$1", [id(fd)]);
  done("/admin/bug/", "Bug verwijderd (een eventueel ticket blijft bestaan).");
}

/* ---------- Instellingen ---------- */

export async function saveTicketSettings(fd: FormData): Promise<void> {
  await requireAdmin();
  const P = "/admin/instellingen/";
  const url = str(fd, "url", 300).replace(/\/+$/, "");
  if (url && !/^https:\/\//i.test(url) && !/^http:\/\/localhost/i.test(url)) done(P, "Gebruik een https://-adres.", "fout");
  await setSetting("tickets_api_url", url);
  // Een leeg sleutelveld betekent: huidige sleutel houden.
  const key = str(fd, "key", 300);
  if (key) await setSetting("tickets_api_key", key);
  if (fd.get("clear_key") === "on") await setSetting("tickets_api_key", "");
  await setSetting("tickets_auto", fd.get("auto") === "on" ? "1" : "0");
  done(P, "Instellingen opgeslagen.");
}

export async function testTickets(): Promise<void> {
  await requireAdmin();
  const res = await testConnection();
  done("/admin/instellingen/", res.message, res.ok ? "ok" : "fout");
}
