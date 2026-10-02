"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

/** Container die z'n kinderen één voor één laat inrollen. */
export function ResultStack({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={`flex w-full flex-col gap-4 ${className}`}>
      {children}
    </motion.div>
  );
}

interface ResultCardProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  aside?: ReactNode;
  className?: string;
}

/** Semi-transparant donker panel met lichte rand. Fade-in & slide-up. */
export function ResultCard({ children, title, icon, aside, className = "" }: ResultCardProps) {
  return (
    <motion.section variants={rise} className={`panel rounded-3xl p-5 sm:p-7 ${className}`}>
      {(title || aside) && (
        <header className="mb-5 flex items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {icon}
              {title}
            </h2>
          )}
          {aside}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1.5 font-mono text-2xl font-semibold tracking-tight sm:text-[1.7rem] ${accent ? "text-cyan" : "text-white"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-white/40">{sub}</div>}
    </div>
  );
}

export function SourceBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "live" | "neutral" | "demo" }) {
  const styles = {
    live: "border-neon/30 bg-neon/10 text-neon",
    neutral: "border-cyan/25 bg-cyan/10 text-cyan",
    demo: "border-white/10 bg-white/5 text-muted",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone === "live" ? "bg-neon" : tone === "neutral" ? "bg-cyan" : "bg-muted"}`} />
      {children}
    </span>
  );
}
