"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Photo {
  src: string;
  alt: string;
  wide?: boolean;
}

/** Fotogalerij met vergroting: pijltjes, swipe en Esc. */
export function Gallery({ photos }: { photos: Photo[] }) {
  const [idx, setIdx] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const startX = useRef<number | null>(null);

  const show = useCallback((i: number) => setIdx((i + photos.length) % photos.length), [photos.length]);
  const close = useCallback(() => {
    setIdx(null);
    lastFocus.current?.focus();
  }, []);

  useEffect(() => {
    if (idx === null) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [idx, show, close]);

  return (
    <>
      <ul className="gallery">
        {photos.map((p, i) => (
          <li key={p.src} className={p.wide ? "wide" : undefined}>
            <button
              type="button"
              onClick={(e) => {
                lastFocus.current = e.currentTarget;
                setIdx(i);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>

      {idx !== null && (
        <div
          className="lightbox is-open"
          role="dialog"
          aria-modal="true"
          aria-label="Foto vergroot"
          onClick={(e) => e.target === e.currentTarget && close()}
          onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (startX.current === null) return;
            const dx = e.changedTouches[0].clientX - startX.current;
            if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
            startX.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[idx].src} alt={photos[idx].alt} />
          <button ref={closeRef} type="button" className="lb-close" aria-label="Sluiten" onClick={close}>
            &times;
          </button>
          <button type="button" className="lb-prev" aria-label="Vorige foto" onClick={() => show(idx - 1)}>
            &#8249;
          </button>
          <button type="button" className="lb-next" aria-label="Volgende foto" onClick={() => show(idx + 1)}>
            &#8250;
          </button>
          <div className="lb-count" aria-live="polite">
            {idx + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}
