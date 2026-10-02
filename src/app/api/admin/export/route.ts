import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidSession } from "@/lib/admin/auth";
import { filtersFromParams } from "@/lib/admin/filters";
import { getEventsForExport } from "@/lib/analytics/queries";

/** GET /api/admin/export?… → CSV van alle aanvragen die aan de filters voldoen (max 50.000). */
export async function GET(request: Request) {
  if (!isValidSession((await cookies()).get(ADMIN_COOKIE)?.value)) return new Response("Niet ingelogd", { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const rows = await getEventsForExport(filtersFromParams(params));

  const header = ["tijd", "onderdeel", "actie", "status", "invoer", "resultaat", "waarde", "woonplaats", "provincie", "bezoeker_provincie", "bezoeker_plaats", "bezoeker_land", "details"];
  const lines = rows.map((r) =>
    [r.created_at, r.module, r.action, r.status, r.input, r.subject, r.value, r.city, r.province, r.visitor_region, r.visitor_city, r.visitor_country, JSON.stringify(r.meta ?? {})]
      .map(csvCell)
      .join(";"),
  );
  // BOM + puntkomma: opent direct goed in Nederlandse Excel.
  const body = "﻿" + [header.join(";"), ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="luuk-aanvragen-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Voorkom formule-injectie in Excel (invoer komt van bezoekers).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
