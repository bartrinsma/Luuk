"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { rise } from "./ResultCard";

interface LuukVerdictProps {
  title: string;
  text: string;
  source?: "ai" | "mock";
  /** Optioneel label rechtsboven, bijv. "KOOPJE". */
  stamp?: { label: string; tone: "good" | "neutral" | "bad" };
}

/** Luuk's persoonlijke analyse. Het hart van elke resultatenpagina. */
export function LuukVerdict({ title, text, source, stamp }: LuukVerdictProps) {
  const stampStyle = stamp
    ? { good: "border-neon/40 text-neon bg-neon/10", neutral: "border-cyan/40 text-cyan bg-cyan/10", bad: "border-rose-400/40 text-rose-300 bg-rose-400/10" }[stamp.tone]
    : "";

  return (
    <motion.section
      variants={rise}
      className="relative overflow-hidden rounded-3xl border border-cyan/20 bg-gradient-to-br from-cyan/[0.08] via-white/[0.02] to-transparent p-6 sm:p-8"
    >
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan/20 blur-3xl" />
      <header className="relative mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan font-black text-obsidian shadow-[0_0_24px_-4px_rgb(0_229_255/0.8)]">
            L
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="text-xs text-muted">{source === "mock" ? "Luuk · demo-modus" : "Luuk · live analyse"}</p>
          </div>
        </div>
        {stamp && (
          <motion.span
            initial={{ scale: 1.6, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: -4 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 300, damping: 15 }}
            className={`rounded-lg border-2 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest ${stampStyle}`}
          >
            {stamp.label}
          </motion.span>
        )}
      </header>
      <blockquote className="relative">
        <Quote className="absolute -left-1 -top-1 h-6 w-6 text-cyan/25" />
        <p className="pl-7 text-lg leading-relaxed text-white/90 sm:text-xl">{text}</p>
      </blockquote>
    </motion.section>
  );
}
