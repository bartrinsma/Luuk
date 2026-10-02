"use client";

import { AnimatePresence, motion } from "framer-motion";

/** Luuk's antwoord op onzin-input. Geen rode foutmelding, maar een droge reactie. */
export function LuukMessage({ message }: { message: string | null }) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          className="panel flex w-full items-start gap-3 rounded-2xl p-4"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 font-black text-cyan">L</div>
          <p className="pt-1 text-[15px] leading-relaxed text-white/85">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** "Luuk denkt na…" */
export function Thinking({ label = "Luuk rekent" }: { label?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full flex-col gap-4" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="flex gap-1">
          <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-cyan" />
          <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-cyan" />
          <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-cyan" />
        </span>
        {label}…
      </div>
      <div className="shimmer h-40 rounded-3xl" />
      <div className="shimmer h-24 rounded-3xl" />
    </motion.div>
  );
}
