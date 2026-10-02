"use client";

/* eslint-disable @next/next/no-img-element -- lokale object-URL's van de gebruiker */
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Loader2, Minus, Plus, ScanSearch, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { ResultCard } from "@/components/ResultCard";
import { useToast } from "@/components/share/Toast";
import type { PhotoAssessment } from "@/lib/ai/photoAssessment";
import { formatEuro, formatPercent } from "@/lib/format";
import { resizeImage } from "@/lib/resizeImage";
import type { LuukErrorResponse } from "@/lib/types";

const MAX_PHOTOS = 6;

interface Picked {
  id: string;
  preview: string;
  base64: string;
}

/**
 * "Verfijn met foto's": de gebruiker uploadt foto's, Luuk corrigeert zijn prijs voor de staat van de woning.
 * Render met `key={query}`, zodat een nieuwe woning met een schone lei begint.
 */
export function PhotoUpload({ query, fairPrice }: { query: string; fairPrice: number }) {
  const toast = useToast();
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [result, setResult] = useState<PhotoAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return setError("Dat waren geen foto's. JPG, PNG of WebP graag. Sí.");
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return setError(`Maximaal ${MAX_PHOTOS} foto's. Kies je beste shots. Sí.`);

    setError(null);
    setPreparing(true);
    try {
      const resized = await Promise.all(
        list.slice(0, room).map(async (f) => {
          const { dataUrl, base64 } = await resizeImage(f);
          return { id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`, preview: dataUrl, base64 };
        }),
      );
      setPhotos((prev) => [...prev, ...resized]);
      setResult(null);
      if (list.length > room) toast(`Alleen de eerste ${room} foto's toegevoegd (max ${MAX_PHOTOS}).`, "info");
    } catch {
      setError("Die foto kreeg ik niet open. Probeer een JPG of PNG (iPhone-HEIC lukt niet in elke browser). Sí.");
    } finally {
      setPreparing(false);
    }
  };

  const analyze = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/huizen/fotos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, images: photos.map((p) => ({ mediaType: "image/jpeg", data: p.base64 })) }),
      });
      const json = (await res.json().catch(() => null)) as (PhotoAssessment & Partial<LuukErrorResponse>) | null;
      if (!res.ok || !json || json.luukError) setError(json?.luukError ?? "Mijn ogen haperen even. Probeer het nog eens. Sí.");
      else setResult(json);
    } catch {
      setError("Geen verbinding. Zelfs ik kan niet kijken zonder internet. Sí.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ResultCard
      title="Verfijn met foto's"
      icon={<ImagePlus className="h-3.5 w-3.5" />}
      aside={<span className="text-xs text-muted">{photos.length}/{MAX_PHOTOS} · blijft privé</span>}
    >
      <p className="mb-4 text-sm leading-relaxed text-muted">
        Upload foto&apos;s van de gevel, keuken, badkamer of het dak. Luuk beoordeelt de staat en corrigeert zijn eerlijke prijs van{" "}
        <span className="font-semibold text-ink">{formatEuro(fairPrice)}</span>. Foto&apos;s worden niet opgeslagen.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${dragging ? "border-cyan bg-cyan-soft/60" : "border-ink/10 bg-ink/[0.015]"}`}
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <AnimatePresence>
            {photos.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative aspect-square overflow-hidden rounded-xl bg-ink/5"
              >
                <img src={p.preview} alt="Geüploade foto" className="h-full w-full object-cover" />
                <button
                  onClick={() => {
                    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                    setResult(null);
                  }}
                  aria-label="Foto verwijderen"
                  className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-ink/10 bg-white text-muted transition-colors hover:border-cyan/50 hover:text-cyan-ink"
            >
              {preparing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              <span className="text-xs font-medium">{photos.length ? "Meer" : "Foto's kiezen"}</span>
            </button>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-ink/40">Sleep foto&apos;s hierheen of klik op het vak · max {MAX_PHOTOS}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="mt-3 text-sm text-ink/80">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {photos.length > 0 && (
          <button
            onClick={() => {
              setPhotos([]);
              setResult(null);
            }}
            className="flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            <Trash2 className="h-4 w-4" /> Wissen
          </button>
        )}
        <button
          onClick={analyze}
          disabled={photos.length === 0 || busy || preparing}
          className="flex h-11 items-center gap-2 rounded-full bg-cyan px-5 font-semibold text-white transition-shadow hover:shadow-[0_0_28px_-4px_rgb(14_165_233/0.5)] disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          {busy ? "Luuk kijkt…" : "Laat Luuk kijken"}
        </button>
      </div>

      <AnimatePresence>{result && <AssessmentResult result={result} fairPrice={fairPrice} />}</AnimatePresence>
    </ResultCard>
  );
}

function AssessmentResult({ result, fairPrice }: { result: PhotoAssessment; fairPrice: number }) {
  const delta = result.aangepastePrijs - fairPrice;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6 rounded-2xl border border-cyan/25 bg-gradient-to-br from-cyan-soft/70 to-white p-5"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Staat van de woning</div>
          <div className="mt-1 font-mono text-3xl font-bold text-ink">{result.conditieScore ? `${result.conditieScore}/10` : "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Correctie</div>
          <div className={`mt-1 font-mono text-3xl font-bold ${delta > 0 ? "text-neon" : delta < 0 ? "text-rose-600" : "text-ink"}`}>
            {result.correctiePercentage > 0 ? "+" : ""}
            {formatPercent(result.correctiePercentage)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Eerlijke prijs na foto&apos;s</div>
          <AnimatedNumber value={result.aangepastePrijs} format={formatEuro} className="mt-1 block font-mono text-3xl font-bold text-cyan" />
        </div>
      </div>

      {result.bevindingen.length > 0 && (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {result.bevindingen.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink/85">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${b.type === "plus" ? "bg-neon/15 text-neon" : "bg-rose-400/15 text-rose-600"}`}>
                {b.type === "plus" ? <Plus className="h-3 w-3" strokeWidth={3} /> : <Minus className="h-3 w-3" strokeWidth={3} />}
              </span>
              {b.tekst}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-[15px] leading-relaxed text-ink/90">
        <span className="font-semibold">Luuk: </span>
        {result.verdict}
      </p>
      {result.source === "mock" && <p className="mt-2 text-xs text-muted">Demo-modus: fotobeoordeling werkt zodra ANTHROPIC_API_KEY is ingesteld.</p>}
    </motion.div>
  );
}
