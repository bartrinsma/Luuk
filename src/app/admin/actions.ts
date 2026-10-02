"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminConfigured, checkPassword, createSessionValue } from "@/lib/admin/auth";
import { rateLimit } from "@/lib/rateLimit";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState | undefined, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) return { error: "Het admin-gedeelte staat uit: stel ADMIN_PASSWORD in op de server." };

  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`admin-login:${ip}`, 8, 15 * 60 * 1000)) return { error: "Te veel pogingen. Probeer het over een kwartier opnieuw." };

  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) return { error: "Onjuist wachtwoord." };

  const { value, maxAge } = createSessionValue();
  (await cookies()).set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
