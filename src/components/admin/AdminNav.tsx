"use client";

import { BarChart3, ListFilter, Map, Newspaper } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/provincies", label: "Provincies", icon: Map },
  { href: "/admin/aanvragen", label: "Aanvragen", icon: ListFilter },
  { href: "/admin/inzichten", label: "Blog-inzichten", icon: Newspaper },
];

export function AdminNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  // De gekozen periode reist mee tussen pagina's.
  const periode = params.get("periode");
  const suffix = periode ? `?periode=${periode}` : "";

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={`${href}${suffix}`}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-cyan-soft text-cyan-ink" : "text-muted hover:bg-ink/[0.04] hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
