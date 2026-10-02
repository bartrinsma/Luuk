import { CopyButton } from "@/components/admin/CopyButton";
import { PageHeader, PeriodFilter, parsePeriod, periodLabel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getInsights } from "@/lib/analytics/insights";

export const dynamic = "force-dynamic";

export default async function InsightsPage({ searchParams }: PageProps<"/admin/inzichten">) {
  await requireAdmin();
  const days = parsePeriod((await searchParams).periode);
  const insights = await getInsights(days);
  const solid = insights.filter((i) => i.solid);
  const all = insights.map((i) => `${i.title}\n${i.text}`).join("\n\n");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Blog-inzichten" subtitle={`Automatisch geschreven feitjes voor de nieuwsgierigheidsblog, ${periodLabel(days)}.`}>
        <PeriodFilter days={days} basePath="/admin/inzichten" />
      </PageHeader>

      {insights.length === 0 ? (
        <div className="panel rounded-2xl p-8 text-center text-muted">Nog te weinig aanvragen voor inzichten. Kom terug als Nederland wat nieuwsgieriger is geweest.</div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between text-sm text-muted">
            <span>
              {solid.length} van {insights.length} inzichten hebben genoeg data om te publiceren.
            </span>
            <CopyButton text={all} />
          </div>
          <div className="flex flex-col gap-4">
            {insights.map((i) => (
              <article key={i.id} className="panel rounded-2xl p-6">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold text-ink">{i.title}</h2>
                  <div className="flex shrink-0 items-center gap-2">
                    {!i.solid && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">te weinig data</span>}
                    <CopyButton text={`${i.title}\n${i.text}`} />
                  </div>
                </div>
                <p className="text-[15px] leading-relaxed text-ink/85">{i.text}</p>
                <p className="mt-3 border-t border-ink/[0.05] pt-3 font-mono text-xs text-muted">Onderbouwing: {i.evidence}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted">
            Tip: publiceer alleen inzichten zonder &ldquo;te weinig data&rdquo;-label. Provincies worden vergeleken per 100.000 inwoners, zodat grote
            provincies niet automatisch winnen. Alle cijfers zijn geaggregeerd; er staan geen individuele adressen of kentekens in de teksten.
          </p>
        </>
      )}
    </div>
  );
}
