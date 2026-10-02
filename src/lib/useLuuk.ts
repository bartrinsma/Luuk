"use client";

import { useCallback, useRef, useState } from "react";
import type { LuukErrorResponse } from "@/lib/types";

const FALLBACK =
  "De verbinding met m'n superbrein hapert even. Niet jouw schuld, niet de mijne — waarschijnlijk die van de wifi. Probeer het nog eens. Sí.";

/** Client-hook: POST naar een Luuk-route; fouten worden altijd een Luuk-boodschap. */
export function useLuuk<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (body: unknown) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        const json = (await res.json().catch(() => null)) as (T & Partial<LuukErrorResponse>) | null;
        if (!res.ok || !json || json.luukError) {
          setData(null);
          setMessage(json?.luukError ?? FALLBACK);
        } else {
          setData(json);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setData(null);
        setMessage(FALLBACK);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [endpoint],
  );

  const reset = useCallback(() => {
    setData(null);
    setMessage(null);
  }, []);

  return { data, message, loading, run, reset, setMessage };
}
