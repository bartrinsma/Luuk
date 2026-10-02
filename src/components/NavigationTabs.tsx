"use client";

import { motion } from "framer-motion";
import { Car, Flame, Home, Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/huizen", label: "Huizen", icon: Building2 },
  { href: "/autos", label: "Auto's", icon: Car },
  { href: "/roast", label: "Roast", icon: Flame },
] as const;

export function NavigationTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Modules" className="glass flex items-center gap-0.5 rounded-full p-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
              active ? "text-obsidian" : "text-muted hover:text-white"
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-cyan shadow-[0_0_24px_-4px_rgb(0_229_255/0.8)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative h-4 w-4" strokeWidth={2.2} />
            <span className="relative hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
