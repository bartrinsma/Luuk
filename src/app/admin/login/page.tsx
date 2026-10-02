import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/admin/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin — Luuk.si", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24">
      <div className="text-2xl font-extrabold tracking-tight">
        Luuk<span className="text-cyan">.si</span> <span className="font-medium text-muted">admin</span>
      </div>
      <LoginForm configured={adminConfigured()} />
    </main>
  );
}
