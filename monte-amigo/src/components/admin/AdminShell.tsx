"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/actions";

const I = {
  dash: "M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z",
  cal: "M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm-2 8h14v10H5z",
  star: "m12 17.3 6.2 3.7-1.6-7 5.4-4.7-7.2-.6L12 2 9.2 8.7 2 9.3l5.4 4.7-1.6 7z",
  bug: "M20 8h-2.8a6 6 0 0 0-1.8-2l1.6-1.6-1.4-1.4-2.2 2.2a6 6 0 0 0-2.8 0L8.4 3 7 4.4 8.6 6a6 6 0 0 0-1.8 2H4v2h2.1a6 6 0 0 0 0 1H4v2h2.1c0 .3 0 .7.1 1H4v2h2.8A6 6 0 0 0 17.2 16H20v-2h-2.2c.1-.3.1-.7.1-1H20v-2h-2.1a6 6 0 0 0 0-1H20zm-6 8h-4v-2h4zm0-4h-4v-2h4z",
  cog: "M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4L10.7 6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a7.6 7.6 0 0 0 1.7 1l.3 2.7h4l.3-2.7a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z",
};

const ITEMS = [
  { href: "/admin/", label: "Dashboard", icon: I.dash },
  { href: "/admin/boekingen/", label: "Boekingen", icon: I.cal, countKey: "requests" as const },
  { href: "/admin/recensies/", label: "Recensies", icon: I.star },
  { href: "/admin/bug/", label: "Bugs melden", icon: I.bug },
  { href: "/admin/instellingen/", label: "Instellingen", icon: I.cog },
];

function Brand() {
  return (
    <Link href="/admin/" className="adm-brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/logo.png" alt="" />
      <span>
        Monte Amigo
        <small>Beheer</small>
      </span>
    </Link>
  );
}

export function AdminShell({ requests, children }: { requests: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="adm-shell">
      <header className="adm-top">
        <Brand />
        <button type="button" className="adm-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
          </svg>
        </button>
      </header>

      <aside className={`adm-side${open ? " is-open" : ""}`}>
        <Brand />
        <nav className="adm-nav" aria-label="Beheermenu">
          {ITEMS.map((it) => {
            const active = it.href === "/admin/" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(it.href.slice(0, -1));
            return (
              <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d={it.icon} />
                </svg>
                {it.label}
                {it.countKey && requests > 0 && <span className="count">{requests}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="adm-side-foot">
          <Link href="/" target="_blank">
            ↗ Naar de website
          </Link>
          <form action={logout}>
            <button type="submit">Uitloggen</button>
          </form>
        </div>
      </aside>

      <main className="adm-main">
        <div className="adm-inner">{children}</div>
      </main>
    </div>
  );
}
