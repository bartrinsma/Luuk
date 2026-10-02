import Link from "next/link";
import { DailyChart, DistributionBars, ProvinceChart } from "@/components/admin/charts";
import { MODULE_COLORS, MODULE_LABELS } from "@/lib/admin/modules";
import { Kpi, PageHeader, Panel, PeriodFilter, StorageWarning, TopList, parsePeriod, periodLabel } from "@/components/admin/ui";
import {
  getDaily,
  getHourly,
  getOverview,
  getProvinces,
  getTopBrands,
  getTopCities,
  getTopDomains,
  getUnknownRegionCount,
  getVerdicts,
} from "@/lib/analytics/queries";
import { requireAdmin } from "@/lib/admin/auth";
import { formatEuro, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const days = parsePeriod((await searchParams).periode);
  const [overview, daily, provinces, unknown, cities, brands, domains, verdicts, hourly] = await Promise.all([
    getOverview(days),
    getDaily(days),
    getProvinces(days),
    getUnknownRegionCount(days),
    getTopCities(days),
    getTopBrands(days),
    getTopDomains(days),
    getVerdicts(days),
    getHourly(days),
  ]);

  const trend = days > 0 && overview.previousTotal > 0 ? ((overview.total - overview.previousTotal) / overview.previousTotal) * 100 : null;
  const verdictTotal = Object.values(verdicts).reduce((s, n) => s + n, 0);
  const sharesTotal = overview.shares.pdf + overview.shares.email + overview.shares.whatsapp;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Dashboard" subtitle={`Alle aanvragen, ${periodLabel(days)}.`}>
        <PeriodFilter days={days} basePath="/admin" />
      </PageHeader>

      <StorageWarning {...overview.storage} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Aanvragen" value={overview.total} trend={trend} sub={trend !== null ? "vs vorige periode" : undefined} />
        <Kpi label="Bezoekers" value={overview.visitors} sub="uniek per dag geteld" />
        <Kpi label="Gedeeld" value={sharesTotal} sub={`${overview.shares.pdf} pdf · ${overview.shares.email} mail · ${overview.shares.whatsapp} app`} />
        <Kpi
          label="Ongeldige invoer"
          value={overview.invalid}
          sub={overview.total + overview.invalid > 0 ? `${Math.round((overview.invalid / (overview.total + overview.invalid)) * 100)}% van alle pogingen` : undefined}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(["huizen", "autos", "roast", "chat"] as const).map((m) => (
          <Link
            key={m}
            href={`/admin/aanvragen?module=${m}&periode=${days}`}
            className="panel flex items-center justify-between rounded-2xl px-4 py-3 transition-colors hover:border-cyan/30"
          >
            <span className="flex items-center gap-2 text-sm text-ink">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MODULE_COLORS[m] }} />
              {MODULE_LABELS[m]}
            </span>
            <span className="font-mono text-lg font-semibold text-ink">{formatNumber(overview.perModule[m] ?? 0)}</span>
          </Link>
        ))}
      </div>

      <Panel title="Aanvragen per dag" className="mt-6" aside={days === 0 ? <span className="text-xs text-muted">laatste 90 dagen</span> : undefined}>
        <DailyChart data={daily} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Provincies" aside={<Link href={`/admin/provincies?periode=${days}`} className="text-xs font-medium text-cyan-ink hover:underline">Details →</Link>}>
          <ProvinceChart data={provinces} />
          {(unknown.unknown > 0 || unknown.abroad > 0) && (
            <p className="mt-3 text-xs text-muted">
              Zonder bekende regio: {formatNumber(unknown.unknown)} · buitenland: {formatNumber(unknown.abroad)}. De regio komt uit de geo-gegevens van de host
              (Netlify) en is daarom pas beschikbaar op de live site.
            </p>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Koopje of miskoop?">
            {verdictTotal === 0 ? (
              <p className="text-sm text-muted">Nog geen getaxeerde woningen.</p>
            ) : (
              <VerdictSplit verdicts={verdicts} total={verdictTotal} />
            )}
          </Panel>
          <Panel title="Aanvragen per uur">
            <DistributionBars values={hourly} labels={hourly.map((_, i) => `${String(i).padStart(2, "0")}:00`)} />
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Top woonplaatsen">
          <TopList rows={cities} valueLabel="gem. WOZ" formatAvg={(v) => formatEuro(Math.round(v / 1000) * 1000)} />
        </Panel>
        <Panel title="Top automerken">
          <TopList rows={brands} valueLabel="gem." formatAvg={(v) => formatEuro(Math.round(v / 50) * 50)} />
        </Panel>
        <Panel title="Meest geroaste websites">
          <TopList rows={domains} valueLabel="score" formatAvg={(v) => `${Math.round(v)}/100`} />
        </Panel>
      </div>
    </div>
  );
}

function VerdictSplit({ verdicts, total }: { verdicts: Record<string, number>; total: number }) {
  // Status-achtige betekenis (goed/neutraal/slecht) → met label + percentage, nooit alleen kleur.
  const parts = [
    { key: "koopje", label: "Koopje", color: "#059669" },
    { key: "eerlijk", label: "Marktconform", color: "#94a3b8" },
    { key: "miskoop", label: "Miskoop", color: "#e11d48" },
  ];
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {parts.map((p) => {
          const n = verdicts[p.key] ?? 0;
          return n > 0 ? <div key={p.key} style={{ width: `${(n / total) * 100}%`, background: p.color }} title={`${p.label}: ${n}`} /> : null;
        })}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2 text-sm">
        {parts.map((p) => (
          <li key={p.key}>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
              {p.label}
            </div>
            <div className="font-mono font-semibold text-ink">{Math.round(((verdicts[p.key] ?? 0) / total) * 100)}%</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
