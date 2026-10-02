"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera } from "lucide-react";
import { useState } from "react";
import { rise } from "@/components/ResultCard";
import type { HousePhoto } from "@/lib/services/housePhotos";

/** Gevelfoto (of luchtfoto) bovenaan het resultaat. Bronnen die niet laden vallen stil af. */
export function HousePhotoCard({ photos, address }: { photos: HousePhoto[]; address: string }) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const available = photos.filter((p) => !failed.has(p.source));
  const active = available.find((p) => p.source === activeSource) ?? available[0];
  const markFailed = (source: string) => setFailed((prev) => new Set(prev).add(source));

  if (!active) return null;

  return (
    <motion.section variants={rise} className="panel overflow-hidden rounded-3xl">
      <div className="relative aspect-[16/9] w-full bg-ink/[0.04] sm:aspect-[16/7]">
        <AnimatePresence mode="wait">
          <motion.img
            key={active.source}
            src={active.url}
            alt={`${active.label} van ${address}`}
            referrerPolicy="no-referrer"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onError={() => markFailed(active.source)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        {/* Alternatieven alvast laden: wat niet laadt, verdwijnt uit de tabs voordat iemand erop klikt. */}
        {available
          .filter((p) => p.source !== active.source)
          .map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.source} src={p.url} alt="" hidden referrerPolicy="no-referrer" onError={() => markFailed(p.source)} />
          ))}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/50 to-transparent p-4 pt-12">
          <span className="flex items-center gap-1.5 text-xs font-medium text-white/90">
            <Camera className="h-3.5 w-3.5" /> {active.attribution}
          </span>
          {available.length > 1 && (
            <div className="flex gap-1.5 rounded-full bg-white/85 p-1 backdrop-blur">
              {available.map((p) => (
                <button
                  key={p.source}
                  onClick={() => setActiveSource(p.source)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${p.source === active.source ? "bg-ink text-white" : "text-ink/70 hover:text-ink"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
