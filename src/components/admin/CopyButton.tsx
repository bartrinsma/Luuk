"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* klembord geweigerd: niets aan te doen */
        }
      }}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
        done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-ink/10 text-muted hover:border-cyan/40 hover:text-ink"
      }`}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Gekopieerd" : "Kopieer"}
    </button>
  );
}
