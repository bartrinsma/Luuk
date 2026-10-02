import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin/auth";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Admin — Luuk.si", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-ink/[0.06] bg-white/80 px-4 py-4 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r lg:py-6">
        <div className="flex items-center justify-between lg:block">
          <Link href="/admin" className="text-xl font-extrabold tracking-tight">
            Luuk<span className="text-cyan">.si</span> <span className="text-sm font-medium text-muted">admin</span>
          </Link>
          <form action={logout} className="lg:hidden">
            <button className="text-sm text-muted hover:text-ink">Uitloggen</button>
          </form>
        </div>
        <Suspense fallback={<div className="h-9" />}>
          <AdminNav />
        </Suspense>
        <div className="mt-auto hidden flex-col gap-2 text-sm lg:flex">
          <Link href="/" className="text-muted hover:text-ink">
            ← Naar de site
          </Link>
          <form action={logout}>
            <button className="text-muted hover:text-ink">Uitloggen</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}
