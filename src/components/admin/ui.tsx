import Link from "next/link";
import type { ReactNode } from "react";
import { PERIODS } from "@/lib/admin/filters";
import { formatNumber } from "@/lib/format";

export { PERIODS, parsePeriod, periodLabel } from "@/lib/admin/filters";

/** Periodekeuze als links, zodat elke weergave deelbaar en server-gerenderd is. */
export function PeriodFilter({ days, basePath, extra = {} }: { days: number; basePath: string; extra?: Record<string, string> }) {
  return (
    <div className="glass inline-flex shrink-0 self-start overflow-x-auto rounded-full p-1 text-sm sm:self-auto" role="group" aria-label="Periode">
      {PERIODS.map((p) => {
        const qs = new URLSearchParams({ ...extra, periode: String(p.value) });
        const active = p.value === days;
        return (
          <Link
            key={p.value}
            href={`${basePath}?${qs}`}
            aria-current={active ? "true" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors ${active ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Panel({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel rounded-2xl p-5 ${className}`}>
      {(title || aside) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, trend }: { label: string; value: number | string; sub?: ReactNode; trend?: number | null }) {
  return (
    <div className="panel rounded-2xl p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink">{typeof value === "number" ? formatNumber(value) : value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
        {trend !== undefined && trend !== null && (
          <span className={`font-medium ${trend > 0 ? "text-neon" : trend < 0 ? "text-rose-600" : "text-muted"}`}>
            {trend > 0 ? "▲" : trend < 0 ? "▼" : "■"} {Math.abs(Math.round(trend))}%
          </span>
        )}
        {sub}
      </div>
    </div>
  );
}

/** Toplijst als horizontale balkjes (één reeks → geen legenda nodig; waarden staan er direct naast). */
export function TopList({
  rows,
  valueLabel,
  formatAvg,
  empty = "Nog geen data.",
}: {
  rows: { label: string; n: number; avg: number | null }[];
  valueLabel?: string;
  formatAvg?: (v: number) => string;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.n));
  return (
    <ol className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className="font-mono text-xs text-muted">{i + 1}</span>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-ink" title={r.label}>
                {r.label}
              </span>
              {formatAvg && r.avg !== null && (
                <span className="shrink-0 text-xs text-muted">
                  {valueLabel} {formatAvg(r.avg)}
                </span>
              )}
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.05]">
              <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${(r.n / max) * 100}%` }} />
            </div>
          </div>
          <span className="w-10 text-right font-mono text-ink">{formatNumber(r.n)}</span>
        </li>
      ))}
    </ol>
  );
}

export function StorageWarning({ kind, persistent }: { kind: string; persistent: boolean }) {
  if (persistent && kind === "postgres") return null;
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {persistent ? (
        <>
          <strong>Lokale database (PGlite).</strong> Prima voor ontwikkelen; zet <code className="font-mono">DATABASE_URL</code> voor productie.
        </>
      ) : (
        <>
          <strong>Let op: geen blijvende database.</strong> Op deze server worden events tijdelijk in <code className="font-mono">/tmp</code> bewaard en
          gaan ze verloren bij een herstart. Koppel een Postgres-database via <code className="font-mono">DATABASE_URL</code> (bijv. Netlify DB of Neon).
        </>
      )}
    </div>
  );
}
