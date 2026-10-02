"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Titel + omnibar, gecentreerd; schuift omhoog zodra er resultaten zijn. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  compact,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      layout
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`flex w-full flex-col items-center text-center ${compact ? "pt-10 sm:pt-14" : "pt-[14vh] sm:pt-[18vh]"}`}
    >
      <motion.span
        layout="position"
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-ink/[0.03] px-3 py-1 text-xs font-medium tracking-wide text-muted"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_8px_rgb(14_165_233/0.6)]" />
        {eyebrow}
      </motion.span>
      <motion.h1
        layout="position"
        className={`text-gradient font-semibold tracking-tight transition-[font-size] duration-500 ${compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-6xl"}`}
      >
        {title}
      </motion.h1>
      <motion.p layout="position" className={`mt-4 max-w-xl text-muted ${compact ? "hidden" : "text-base sm:text-lg"}`}>
        {subtitle}
      </motion.p>
      <motion.div layout="position" className={`w-full max-w-2xl ${compact ? "mt-6" : "mt-10"}`}>
        {children}
      </motion.div>
    </motion.div>
  );
}
