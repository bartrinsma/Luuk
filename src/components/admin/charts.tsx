"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { MODULE_COLORS, MODULE_LABELS } from "@/lib/admin/modules";
import { formatEuro, formatNumber } from "@/lib/format";

/**
 * Kleine, afhankelijkheidsvrije grafieken voor het admin-dashboard.
 * Kleuren: gevalideerd categorisch palet (blauw, oranje, aqua, geel; vaste volgorde per module).
 * Geel en aqua halen < 3:1 contrast op wit → altijd met legenda + tabelweergave (relief-regel).
 */

type ModuleKey = keyof typeof MODULE_COLORS;
const MODULE_ORDER: ModuleKey[] = ["huizen", "autos", "roast", "chat"];

// ---------- Tooltip ----------

interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

function Tooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs text-ink shadow-lg"
      style={{ left: state.x, top: state.y - 10 }}
    >
      {state.content}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

// ---------- Aanvragen per dag (gestapeld) ----------

export interface DailyPoint {
  day: string;
  counts: Record<ModuleKey, number>;
}

export function DailyChart({ data }: { data: DailyPoint[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [tip, setTip] = useState<TooltipState | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const totals = data.map((d) => MODULE_ORDER.reduce((s, m) => s + d.counts[m], 0));
  const max = Math.max(1, ...totals);
  const niceMax = niceCeil(max);
  const H = 200;
  const W = 720;
  const gap = data.length > 60 ? 1 : 2;
  const barW = Math.max(2, (W - gap * (data.length - 1)) / data.length);
  const labelEvery = Math.ceil(data.length / 8);

  const show = (i: number, e: React.PointerEvent | React.FocusEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    const target = (e.currentTarget as SVGElement).getBoundingClientRect();
    if (!box) return;
    const d = data[i];
    setTip({
      x: Math.min(Math.max(target.left - box.left + target.width / 2, 80), box.width - 80),
      y: target.top - box.top,
      content: (
        <>
          <div className="mb-1 font-medium text-muted">{formatDay(d.day)}</div>
          <div className="mb-1 font-mono text-sm font-semibold">{formatNumber(totals[i])} aanvragen</div>
          {MODULE_ORDER.map((m) => (
            <div key={m} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 rounded-sm" style={{ background: MODULE_COLORS[m] }} />
                {MODULE_LABELS[m]}
              </span>
              <span className="font-mono">{d.counts[m]}</span>
            </div>
          ))}
        </>
      ),
    });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Legend items={MODULE_ORDER.map((m) => ({ label: MODULE_LABELS[m], color: MODULE_COLORS[m] }))} />
        <ViewToggle view={view} onChange={setView} />
      </div>
      {view === "chart" ? (
        <div ref={boxRef} className="relative" onPointerLeave={() => setTip(null)}>
          <svg viewBox={`0 -14 ${W} ${H + 38}`} className="h-auto w-full" role="img" aria-label="Aanvragen per dag per module">
            {[0, 0.5, 1].map((t) => (
              <g key={t}>
                <line x1={0} x2={W} y1={H - t * H} y2={H - t * H} stroke="rgb(15 23 42 / 0.07)" strokeWidth={1} />
                <text x={2} y={H - t * H - 4} textAnchor="start" className="fill-[#94a3b8] text-[10px]">
                  {formatNumber(niceMax * t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = i * (barW + gap);
              let y = H;
              const segs = MODULE_ORDER.filter((m) => d.counts[m] > 0);
              return (
                <g
                  key={d.day}
                  tabIndex={0}
                  onPointerMove={(e) => show(i, e)}
                  onFocus={(e) => show(i, e)}
                  onBlur={() => setTip(null)}
                  className="outline-none"
                >
                  {/* ruime, onzichtbare hitbox over de volle hoogte */}
                  <rect x={x} y={0} width={barW} height={H} fill="transparent" />
                  {segs.map((m, si) => {
                    const h = (d.counts[m] / niceMax) * H;
                    y -= h;
                    const isTop = si === segs.length - 1;
                    return (
                      <rect
                        key={m}
                        x={x}
                        y={y}
                        width={barW}
                        height={Math.max(0, h - (isTop ? 0 : 1))}
                        rx={isTop ? Math.min(3, barW / 2) : 0}
                        fill={MODULE_COLORS[m]}
                      />
                    );
                  })}
                  {i % labelEvery === 0 && (
                    <text x={x + barW / 2} y={H + 16} textAnchor="middle" className="fill-[#94a3b8] text-[10px]">
                      {formatDay(d.day, true)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <Tooltip state={tip} />
        </div>
      ) : (
        <div className="max-h-72 overflow-auto rounded-xl border border-ink/[0.06]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Dag</th>
                {MODULE_ORDER.map((m) => (
                  <th key={m} className="px-3 py-2 text-right font-medium">
                    {MODULE_LABELS[m]}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d, i) => (
                <tr key={d.day} className="border-t border-ink/[0.05]">
                  <td className="px-3 py-1.5 text-muted">{formatDay(d.day)}</td>
                  {MODULE_ORDER.map((m) => (
                    <td key={m} className="px-3 py-1.5 text-right font-mono">
                      {d.counts[m]}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right font-mono font-semibold">{totals[data.length - 1 - i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Provincies (horizontaal) ----------

export interface ProvinceDatum {
  province: string;
  population: number;
  visitorRequests: number;
  visitors: number;
  houseSearches: number;
  avgWoz: number | null;
  miskoopShare: number | null;
  curiosityIndex: number;
}

type ProvinceMetric = "curiosityIndex" | "visitorRequests" | "houseSearches";

const METRICS: { key: ProvinceMetric; label: string; hint: string }[] = [
  { key: "curiosityIndex", label: "Nieuwsgierigheid", hint: "aanvragen per 100.000 inwoners, op basis van waar bezoekers vandaan komen" },
  { key: "visitorRequests", label: "Aanvragen", hint: "aantal aanvragen per bezoekersprovincie" },
  { key: "houseSearches", label: "Gezochte huizen", hint: "in welke provincie de getaxeerde woningen staan" },
];

export function ProvinceChart({ data, initial = "curiosityIndex" }: { data: ProvinceDatum[]; initial?: ProvinceMetric }) {
  const [metric, setMetric] = useState<ProvinceMetric>(initial);
  const [tip, setTip] = useState<TooltipState | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const sorted = useMemo(() => [...data].sort((a, b) => b[metric] - a[metric]), [data, metric]);
  const max = Math.max(...sorted.map((d) => d[metric]), 0) || 1;
  const fmtIndex = (v: number) => (v >= 10 ? formatNumber(Math.round(v)) : v.toFixed(1).replace(".", ","));
  const fmt = (v: number) => (metric === "curiosityIndex" ? fmtIndex(v) : formatNumber(v));

  const show = (d: ProvinceDatum, e: React.PointerEvent | React.FocusEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    const t = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!box) return;
    setTip({
      x: Math.min(Math.max(t.left - box.left + 140, 90), box.width - 90),
      y: t.top - box.top,
      content: (
        <>
          <div className="mb-1 font-semibold">{d.province}</div>
          <Row label="Per 100.000 inwoners" value={fmtIndex(d.curiosityIndex)} />
          <Row label="Aanvragen" value={formatNumber(d.visitorRequests)} />
          <Row label="Bezoekers (per dag)" value={formatNumber(d.visitors)} />
          <Row label="Huizen gezocht" value={formatNumber(d.houseSearches)} />
          {d.avgWoz !== null && <Row label="Gem. WOZ" value={formatEuro(Math.round(d.avgWoz / 1000) * 1000)} />}
          {d.miskoopShare !== null && <Row label="Miskoop" value={`${Math.round(d.miskoopShare * 100)}%`} />}
          <Row label="Inwoners" value={formatNumber(d.population)} />
        </>
      ),
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="glass inline-flex rounded-full p-1 text-xs" role="group" aria-label="Maatstaf">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              aria-pressed={metric === m.key}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${metric === m.key ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">{METRICS.find((m) => m.key === metric)?.hint}</span>
      </div>
      <div ref={boxRef} className="relative" onPointerLeave={() => setTip(null)}>
        <ul className="flex flex-col gap-1.5">
          {sorted.map((d, i) => (
            <li
              key={d.province}
              tabIndex={0}
              onPointerMove={(e) => show(d, e)}
              onFocus={(e) => show(d, e)}
              onBlur={() => setTip(null)}
              className="grid cursor-default grid-cols-[8.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 rounded-lg px-1 py-1 text-sm outline-none hover:bg-ink/[0.03] focus-visible:bg-ink/[0.04]"
            >
              <span className="truncate text-ink">
                {i === 0 && d[metric] > 0 && <span className="mr-1">👑</span>}
                {d.province}
              </span>
              <div className="h-3 overflow-hidden rounded-r bg-ink/[0.04]">
                <div className="h-full rounded-r bg-[#2a78d6] transition-[width] duration-500" style={{ width: `${(d[metric] / max) * 100}%` }} />
              </div>
              <span className="text-right font-mono text-ink">{fmt(d[metric])}</span>
            </li>
          ))}
        </ul>
        <Tooltip state={tip} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}

// ---------- Kleine verdelingen (uur / weekdag) ----------

export function DistributionBars({ values, labels, unit = "aanvragen" }: { values: number[]; labels: string[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  return (
    <div>
      <div className="flex h-28 items-end gap-[2px]" onPointerLeave={() => setHover(null)}>
        {values.map((v, i) => (
          <div
            key={i}
            tabIndex={0}
            onPointerEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            className="flex h-full flex-1 items-end outline-none"
            aria-label={`${labels[i]}: ${v} ${unit}`}
          >
            <div
              className={`w-full rounded-t-[3px] transition-colors ${hover === i ? "bg-[#1c5cab]" : "bg-[#2a78d6]"}`}
              style={{ height: `${Math.max(v > 0 ? 3 : 0, (v / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[#94a3b8]">
        <span>{labels[0]}</span>
        <span className="font-medium text-ink">{hover !== null ? `${labels[hover]} · ${formatNumber(values[hover])} ${unit}` : ""}</span>
        <span>{labels.at(-1)}</span>
      </div>
    </div>
  );
}

// ---------- helpers ----------

function ViewToggle({ view, onChange }: { view: "chart" | "table"; onChange: (v: "chart" | "table") => void }) {
  return (
    <div className="inline-flex rounded-full border border-ink/10 p-0.5 text-xs">
      {(["chart", "table"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={`rounded-full px-2.5 py-1 font-medium ${view === v ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
        >
          {v === "chart" ? "Grafiek" : "Tabel"}
        </button>
      ))}
    </div>
  );
}

function niceCeil(v: number): number {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function formatDay(day: string, short = false): string {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString("nl-NL", short ? { day: "numeric", month: "short" } : { weekday: "short", day: "numeric", month: "short" });
}
