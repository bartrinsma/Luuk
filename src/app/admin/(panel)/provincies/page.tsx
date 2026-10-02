import Link from "next/link";
import { ProvinceChart } from "@/components/admin/charts";
import { PageHeader, Panel, PeriodFilter, parsePeriod, periodLabel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getProvinces, getUnknownRegionCount } from "@/lib/analytics/queries";
import { formatEuro, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProvincesPage({ searchParams }: PageProps<"/admin/provincies">) {
  await requireAdmin();
  const days = parsePeriod((await searchParams).periode);
  const [provinces, unknown] = await Promise.all([getProvinces(days), getUnknownRegionCount(days)]);
  const ranked = [...provinces].sort((a, b) => b.curiosityIndex - a.curiosityIndex);
  const total = provinces.reduce((s, p) => s + p.visitorRequests, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Provincies"
        subtitle={`Waar komen de nieuwsgierigen vandaan, en waar staan de huizen waar ze naar kijken? ${periodLabel(days)[0].toUpperCase()}${periodLabel(days).slice(1)}.`}
      >
        <PeriodFilter days={days} basePath="/admin/provincies" />
      </PageHeader>

      <Panel title="Ranglijst">
        <ProvinceChart data={provinces} />
      </Panel>

      <Panel title="Alle cijfers" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-ink/[0.06]">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Provincie</th>
                <th className="py-2 pr-3 text-right font-medium">Per 100k inw.</th>
                <th className="py-2 pr-3 text-right font-medium">Aanvragen</th>
                <th className="py-2 pr-3 text-right font-medium">Aandeel</th>
                <th className="py-2 pr-3 text-right font-medium">Bezoekers</th>
                <th className="py-2 pr-3 text-right font-medium">Huizen gezocht</th>
                <th className="py-2 pr-3 text-right font-medium">Gem. WOZ</th>
                <th className="py-2 text-right font-medium">Miskoop</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, i) => (
                <tr key={p.province} className="border-b border-ink/[0.04]">
                  <td className="py-2 pr-3 font-mono text-xs text-muted">{i + 1}</td>
                  <td className="py-2 pr-3">
                    <Link href={`/admin/aanvragen?provincie=${encodeURIComponent(p.province)}&periode=${days}`} className="text-ink hover:text-cyan-ink hover:underline">
                      {p.province}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono font-semibold">{p.curiosityIndex.toFixed(1).replace(".", ",")}</td>
                  <td className="py-2 pr-3 text-right font-mono">{formatNumber(p.visitorRequests)}</td>
                  <td className="py-2 pr-3 text-right font-mono text-muted">{total ? `${Math.round((p.visitorRequests / total) * 100)}%` : "—"}</td>
                  <td className="py-2 pr-3 text-right font-mono">{formatNumber(p.visitors)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{formatNumber(p.houseSearches)}</td>
                  <td className="py-2 pr-3 text-right font-mono">{p.avgWoz !== null ? formatEuro(Math.round(p.avgWoz / 1000) * 1000) : "—"}</td>
                  <td className="py-2 text-right font-mono">{p.miskoopShare !== null ? `${Math.round(p.miskoopShare * 100)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          <strong>Hoe lees je dit?</strong> &ldquo;Per 100k inw.&rdquo; corrigeert voor bevolkingsomvang (CBS, 2024): anders wint Zuid-Holland altijd. De
          bezoekersregio komt uit de geo-IP-gegevens van de host en is een benadering (mobiel internet en VPN&apos;s kunnen afwijken). &ldquo;Huizen
          gezocht&rdquo; is de provincie van het getaxeerde adres. Onbekende regio: {formatNumber(unknown.unknown)} · buitenland:{" "}
          {formatNumber(unknown.abroad)}.
        </p>
      </Panel>
    </div>
  );
}
