import { Download } from "lucide-react";
import Link from "next/link";
import { MODULE_LABELS } from "@/lib/admin/modules";
import { PageHeader, PERIODS, periodLabel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { filtersFromParams, filtersToQuery, MODULE_OPTIONS, STATUS_OPTIONS } from "@/lib/admin/filters";
import { getEvents, type EventRow } from "@/lib/analytics/queries";
import { formatEuro, formatNumber } from "@/lib/format";
import { PROVINCES } from "@/lib/provinces";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<string, string> = { ok: "OK", invalid: "Ongeldig", not_found: "Niet gevonden", error: "Fout" };
const ACTION_LABELS: Record<string, string> = { search: "Zoekopdracht", photos: "Foto's", pdf: "PDF", email: "E-mail", whatsapp: "WhatsApp" };

export default async function RequestsPage({ searchParams }: PageProps<"/admin/aanvragen">) {
  await requireAdmin();
  const f = filtersFromParams(await searchParams);
  const { rows, total } = await getEvents(f, f.page, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const exportHref = `/api/admin/export?${filtersToQuery({ ...f, page: 1 })}`;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Aanvragen" subtitle={`${formatNumber(total)} events, ${periodLabel(f.days)}. Alles wat bezoekers invoerden, per onderdeel.`}>
        <a href={exportHref} className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink hover:border-cyan/40">
          <Download className="h-4 w-4" /> CSV-export
        </a>
      </PageHeader>

      {/* Filters: gewoon een GET-formulier, zodat elke selectie een deelbare URL is. */}
      <form className="panel mb-4 grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <Select name="module" label="Onderdeel" value={f.module} options={MODULE_OPTIONS.map((m) => [m, MODULE_LABELS[m]])} />
        <Select name="status" label="Status" value={f.status} options={STATUS_OPTIONS.map((s) => [s, STATUS_LABELS[s]])} />
        <Select name="provincie" label="Provincie" value={f.province} options={PROVINCES.map((p) => [p, p])} />
        <Select name="periode" label="Periode" value={String(f.days)} options={PERIODS.map((p) => [String(p.value), p.label])} allowEmpty={false} />
        <label className="flex flex-col gap-1 lg:col-span-1">
          <span className="text-xs font-medium text-muted">Zoeken</span>
          <input
            name="q"
            defaultValue={f.q ?? ""}
            placeholder="adres, kenteken, domein…"
            className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-sm focus:border-cyan focus:outline-none"
          />
        </label>
        <div className="flex items-end gap-2">
          <button className="h-10 flex-1 rounded-xl bg-cyan px-4 text-sm font-semibold text-white">Filter</button>
          <Link href="/admin/aanvragen" className="flex h-10 items-center rounded-xl px-3 text-sm text-muted hover:text-ink">
            Wis
          </Link>
        </div>
      </form>

      <div className="panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-ink/[0.02] text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tijd</th>
                <th className="px-4 py-2.5 font-medium">Onderdeel</th>
                <th className="px-4 py-2.5 font-medium">Invoer</th>
                <th className="px-4 py-2.5 font-medium">Resultaat</th>
                <th className="px-4 py-2.5 text-right font-medium">Waarde</th>
                <th className="px-4 py-2.5 font-medium">Gezochte plek</th>
                <th className="px-4 py-2.5 font-medium">Bezoeker uit</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted">
                    Geen aanvragen gevonden voor deze filters.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-ink/[0.05] align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">{r.created_at.slice(5, 16).replace("-", "/")}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="text-ink">{MODULE_LABELS[r.module] ?? r.module}</span>
                    {r.action !== "search" && <span className="ml-1 text-xs text-muted">· {ACTION_LABELS[r.action] ?? r.action}</span>}
                  </td>
                  <td className="max-w-[16rem] px-4 py-2.5">
                    <span className="line-clamp-2 break-words text-ink/85" title={r.input ?? ""}>
                      {r.input ?? "—"}
                    </span>
                  </td>
                  <td className="max-w-[16rem] px-4 py-2.5">
                    <div className="truncate text-ink" title={r.subject ?? ""}>
                      {r.subject ?? "—"}
                    </div>
                    <ResultDetail row={r} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">{formatValue(r)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{[r.city, r.province].filter(Boolean).join(", ") || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                    {r.visitor_region ?? (r.visitor_country && r.visitor_country !== "NL" ? r.visitor_country : "—")}
                    {r.visitor_city && <span className="block text-xs">{r.visitor_city}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <StatusPill status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <nav className="flex items-center justify-between border-t border-ink/[0.06] px-4 py-3 text-sm" aria-label="Paginering">
            <span className="text-muted">
              Pagina {f.page} van {pages}
            </span>
            <div className="flex gap-2">
              <PageLink f={f} page={f.page - 1} disabled={f.page <= 1}>
                ← Vorige
              </PageLink>
              <PageLink f={f} page={f.page + 1} disabled={f.page >= pages}>
                Volgende →
              </PageLink>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

function Select({
  name,
  label,
  value,
  options,
  allowEmpty = true,
}: {
  name: string;
  label: string;
  value: string | null | undefined;
  options: (readonly [string, string])[] | [string, string][];
  allowEmpty?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-sm text-ink focus:border-cyan focus:outline-none"
      >
        {allowEmpty && <option value="">Alle</option>}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function PageLink({ f, page, disabled, children }: { f: ReturnType<typeof filtersFromParams>; page: number; disabled: boolean; children: React.ReactNode }) {
  if (disabled) return <span className="rounded-full px-3 py-1.5 text-muted/50">{children}</span>;
  return (
    <Link href={`/admin/aanvragen?${filtersToQuery({ ...f, page })}`} className="rounded-full border border-ink/10 px-3 py-1.5 text-ink hover:border-cyan/40">
      {children}
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const style =
    status === "ok"
      ? "bg-emerald-50 text-emerald-700"
      : status === "invalid"
        ? "bg-amber-50 text-amber-800"
        : status === "not_found"
          ? "bg-slate-100 text-slate-700"
          : "bg-rose-50 text-rose-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function ResultDetail({ row }: { row: EventRow }) {
  const m = row.meta ?? {};
  const bits: string[] = [];
  if (row.module === "huizen") {
    if (m.verdict) bits.push(String(m.verdict));
    if (m.via === "funda") bits.push("via Funda");
    if (m.vraagprijs) bits.push(`vraagprijs ${formatEuro(Number(m.vraagprijs))}`);
  } else if (row.module === "autos") {
    bits.push([m.merk, m.bouwjaar, m.brandstof].filter(Boolean).join(" · "));
  } else if (row.module === "roast") {
    if (m.loadTimeMs) bits.push(`${(Number(m.loadTimeMs) / 1000).toFixed(1).replace(".", ",")} s`);
    if (m.checksTotal) bits.push(`${m.checksPassed}/${m.checksTotal} checks`);
  } else if (row.module === "fotos") {
    bits.push(`${m.fotoCount ?? "?"} foto's`, m.conditieScore ? `staat ${m.conditieScore}/10` : "demo");
  } else if (row.module === "share" && m.kind) {
    bits.push(String(m.kind));
  }
  const text = bits.filter(Boolean).join(" · ");
  return text ? <div className="truncate text-xs text-muted">{text}</div> : null;
}

function formatValue(r: EventRow): string {
  if (r.value === null || r.value === undefined) return "—";
  if (r.module === "roast") return `${Math.round(r.value)}/100`;
  return formatEuro(r.value);
}
