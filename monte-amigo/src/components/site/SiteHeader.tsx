"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export const MENU = [
  { href: "/", label: "Home" },
  { href: "/over-ons/", label: "Over ons" },
  { href: "/tarieven/", label: "Tarieven" },
  { href: "/agenda/", label: "Agenda" },
  { href: "/reserveren/", label: "Reserveren" },
  { href: "/recensies/", label: "Recensies" },
  { href: "/een-homepage-sectie/", label: "Omgeving" },
];

const BANNERS: Record<string, string> = { "/tarieven/": "/img/banner-palmen.jpg" };

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = pathname === "/";
  const banner = BANNERS[pathname] ?? "/img/hero-cliff.jpg";

  return (
    <>
      <a className="skip-link" href="#content">
        Naar de inhoud
      </a>
      <header className="site-header">
        <div className={home ? "hero" : "hero hero--small"} style={{ backgroundImage: `url('${banner}')` }}>
          <div className="site-title">
            <Link href="/" rel="home">
              Monte Amigo – Cumbre del Sol
            </Link>
            <p>Luxe vakantieappartement voor 4/5 personen aan de Costa Blanca</p>
          </div>
          {home && (
            <a className="scroll-down" href="#content" aria-label="Naar de inhoud">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 16.6 4.7 9.3l1.7-1.7L12 13.2l5.6-5.6 1.7 1.7z" />
              </svg>
            </a>
          )}
        </div>
      </header>

      <nav className={`main-nav is-sticky${open ? " is-open" : ""}`} aria-label="Hoofdmenu">
        <div className="main-nav__inner">
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={open}
            aria-controls="menu"
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M3 6h18v2.4H3zm0 4.8h18v2.4H3zm0 4.8h18V18H3z" />
            </svg>{" "}
            Menu
          </button>
          <ul className="menu" id="menu">
            {MENU.map((m) => (
              <li key={m.href}>
                <Link href={m.href} aria-current={pathname === m.href ? "page" : undefined} onClick={() => setOpen(false)}>
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
