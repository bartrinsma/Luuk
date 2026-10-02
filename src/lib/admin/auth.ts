import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Admin-toegang met één wachtwoord (ADMIN_PASSWORD).
 * Na inloggen een HttpOnly-cookie "<verloopdatum>.<HMAC>"; het geheim is ADMIN_SECRET
 * (of, als die ontbreekt, een afgeleide van het wachtwoord — wachtwoord wijzigen = iedereen uitgelogd).
 * Zonder ADMIN_PASSWORD staat het admin-gedeelte volledig dicht.
 */

export const ADMIN_COOKIE = "luuk_admin";
const SESSION_DAYS = 7;

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

function secret(): string {
  return process.env.ADMIN_SECRET || `luuk-admin:${process.env.ADMIN_PASSWORD ?? ""}`;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Vergelijk hashes, zodat ook de lengte niet uitlekt via timing.
  return safeEqual(sign(`pw:${input}`), sign(`pw:${expected}`));
}

export function createSessionValue(): { value: string; maxAge: number } {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const expires = String(Date.now() + maxAge * 1000);
  return { value: `${expires}.${sign(expires)}`, maxAge };
}

export function isValidSession(value: string | undefined): boolean {
  if (!value || !adminConfigured()) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig || !safeEqual(sig, sign(expires))) return false;
  return Number(expires) > Date.now();
}

export async function isAdmin(): Promise<boolean> {
  return isValidSession((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** Gebruik bovenaan elke admin-pagina. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
