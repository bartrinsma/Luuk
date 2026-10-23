"use client";

import { useSyncExternalStore } from "react";
import { isoDate, parseDate, today } from "./dates";

const noSubscribe = () => () => {};

/** Vandaag, maar pas in de browser (op de server null), zodat er geen hydratieverschil ontstaat. */
export function useToday(): Date | null {
  const iso = useSyncExternalStore(noSubscribe, () => isoDate(today()), () => null);
  return iso ? parseDate(iso) : null;
}
