"use client";

import { useState } from "react";
import {
  MONTHS,
  addDays,
  isoDate,
  isoWeek,
  niceDate,
  nightBooked,
  nightsBetween,
  rangeFree,
  type Range,
} from "@/lib/dates";
import { useToday } from "@/lib/useClient";

const DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const MAX_AHEAD = 24; // maanden vooruit bladeren

type DayState = "past" | "booked" | "arrive" | "depart" | "free";

const STATE_LABEL: Record<DayState, string> = {
  past: "verleden",
  booked: "bezet",
  arrive: "vrij tot de middag, daarna bezet",
  depart: "vrij vanaf de middag",
  free: "beschikbaar",
};

interface Props {
  ranges: Range[];
  months?: number;
  /** Geef dit mee om datums te kunnen kiezen. */
  onSelect?: (start: Date | null, end: Date | null) => void;
  start?: Date | null;
  end?: Date | null;
}

export function AvailabilityCalendar({ ranges, months: perView = 12, onSelect, start = null, end = null }: Props) {
  // "Vandaag" pas in de browser bepalen, zodat server en browser hetzelfde renderen.
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const [hint, setHint] = useState("");

  // Spring naar de gekozen aankomstmaand als die buiten beeld valt.
  const startKey = start ? isoDate(start) : "";
  const [prevStart, setPrevStart] = useState("");
  if (startKey !== prevStart && today) {
    setPrevStart(startKey);
    if (start) {
      const diff = (start.getFullYear() - today.getFullYear()) * 12 + start.getMonth() - today.getMonth();
      if (diff >= 0 && (diff < offset || diff >= offset + perView)) setOffset(Math.min(MAX_AHEAD - perView, diff));
    }
  }

  if (!today) return <div className="cal-root cal-loading" aria-busy="true" />;
  const now = today;

  const monthList = Array.from({ length: perView }, (_, i) => new Date(now.getFullYear(), now.getMonth() + offset + i, 1));

  function state(d: Date): DayState {
    if (d < now) return "past";
    const night = nightBooked(d, ranges);
    const morning = nightBooked(addDays(d, -1), ranges);
    if (night && morning) return "booked";
    if (night) return "arrive";
    if (morning) return "depart";
    return "free";
  }

  function pick(d: Date) {
    if (!onSelect) return;
    if (!start || end || d <= start) {
      if (nightBooked(d, ranges)) {
        setHint(`Op ${niceDate(d)} kun je niet aankomen; die nacht is al bezet.`);
        return;
      }
      setHint(`Aankomst: ${niceDate(d)}. Kies nu je vertrekdatum.`);
      onSelect(d, null);
    } else {
      if (!rangeFree(start, d, ranges)) {
        setHint("Er zit een bezette nacht tussen. Kies een eerdere vertrekdatum of een andere aankomst.");
        return;
      }
      setHint(`${nightsBetween(start, d)} nachten geselecteerd. Klik op een dag om opnieuw te kiezen.`);
      onSelect(start, d);
    }
  }

  function dayCell(date: Date) {
    const s = state(date);
    let cls = `cal-day ${s}`;
    const t = date.getTime();
    if (start && t === start.getTime()) cls += end ? " sel-start" : " sel";
    else if (end && t === end.getTime()) cls += " sel-end";
    else if (start && end && date > start && date < end && s === "free") cls += " in-range";
    const label = `${niceDate(date)}, ${STATE_LABEL[s]}`;
    if (onSelect && s !== "past") {
      return (
        <button type="button" className={cls} aria-label={label} onClick={() => pick(date)}>
          {date.getDate()}
        </button>
      );
    }
    return (
      <span className={cls} title={label}>
        {date.getDate()}
      </span>
    );
  }

  function monthTable(m: Date) {
    const y = m.getFullYear();
    const mo = m.getMonth();
    const lead = (m.getDay() + 6) % 7;
    const days = new Date(y, mo + 1, 0).getDate();
    const cells: (Date | null)[] = [...Array(lead).fill(null)];
    for (let d = 1; d <= days; d++) cells.push(new Date(y, mo, d));
    while (cells.length % 7) cells.push(null);
    const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

    return (
      <div className="cal-month" key={`${y}-${mo}`}>
        <h3>
          {MONTHS[mo]} {y}
        </h3>
        <table>
          <thead>
            <tr>
              <th scope="col" aria-label="Weeknummer">
                w
              </th>
              {DAYS.map((d) => (
                <th scope="col" key={d}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => (
              <tr key={i}>
                <td className="wk">{isoWeek(w.find(Boolean)!)}</td>
                {w.map((d, j) => (
                  <td key={j}>{d && dayCell(d)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const a = monthList[0];
  const b = monthList[monthList.length - 1];
  const rangeLabel =
    perView === 1
      ? `${MONTHS[a.getMonth()]} ${a.getFullYear()}`
      : `${MONTHS[a.getMonth()].slice(0, 3)} ${a.getFullYear()} – ${MONTHS[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;

  return (
    <div className="cal-root">
      <div className="cal-toolbar">
        <button type="button" className="cal-btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - perView))}>
          &lsaquo; Eerder
        </button>
        <div className="cal-range" aria-live="polite">
          {rangeLabel}
        </div>
        <button
          type="button"
          className="cal-btn"
          disabled={offset + perView >= MAX_AHEAD}
          onClick={() => setOffset(Math.min(MAX_AHEAD - perView, offset + perView))}
        >
          Later &rsaquo;
        </button>
      </div>
      <div className="cal-grid">{monthList.map(monthTable)}</div>
      <ul className="cal-legend">
        <li>
          <span className="sw free" />
          Beschikbaar
        </li>
        <li>
          <span className="sw booked" />
          Bezet
        </li>
        <li>
          <span className="sw arrive" />
          Wisseldag (vertrek / aankomst)
        </li>
        {onSelect && (
          <li>
            <span className="sw sel" />
            Jouw keuze
          </li>
        )}
      </ul>
      {onSelect && (
        <p className="cal-hint" aria-live="polite">
          {hint}
        </p>
      )}
    </div>
  );
}
