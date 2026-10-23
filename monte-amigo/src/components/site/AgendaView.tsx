"use client";

import Link from "next/link";
import { useState } from "react";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { isoDate, nightsBetween, type Range } from "@/lib/dates";

export function AgendaView({ ranges }: { ranges: Range[] }) {
  const [sel, setSel] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const { start, end } = sel;

  return (
    <>
      <AvailabilityCalendar ranges={ranges} months={12} start={start} end={end} onSelect={(s, e) => setSel({ start: s, end: e })} />
      {start && end && (
        <p>
          <Link className="btn" href={`/reserveren/?aankomst=${isoDate(start)}&vertrek=${isoDate(end)}`}>
            Reserveer {nightsBetween(start, end)} nachten vanaf{" "}
            {start.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
          </Link>
        </p>
      )}
    </>
  );
}
