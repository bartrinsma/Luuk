import Link from "next/link";
import { NavigationTabs } from "./NavigationTabs";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-baseline text-xl font-extrabold tracking-tight" aria-label="Luuk.si home">
          <span className="text-ink">Luuk</span>
          <span className="text-cyan transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_18px_rgb(14_165_233/0.7)]">
            .si
          </span>
        </Link>
        <NavigationTabs />
      </div>
    </header>
  );
}
