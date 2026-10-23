import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, StatusBadge } from "@/components/admin/ui";
import type { Booking } from "@/lib/bookings";
import { niceDate, nightsBetween, nightsLabel, parseDate } from "@/lib/dates";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const db = await getDb();
  const [[stats], upcoming, requests] = await Promise.all([
    db.query<{ requests: number; upcoming: number; nights: number; reviews: number; avg: string | null; bugs: number }>(`
      SELECT
        (SELECT count(*)::int FROM ma_bookings WHERE status = 'aanvraag') AS requests,
        (SELECT count(*)::int FROM ma_bookings WHERE status = 'bevestigd' AND departure >= CURRENT_DATE) AS upcoming,
        (SELECT coalesce(sum(LEAST(departure, CURRENT_DATE + 90) - GREATEST(arrival, CURRENT_DATE)), 0)::int
           FROM ma_bookings WHERE status IN ('bevestigd','geblokkeerd') AND departure > CURRENT_DATE AND arrival < CURRENT_DATE + 90) AS nights,
        (SELECT count(*)::int FROM ma_reviews WHERE published) AS reviews,
        (SELECT round(avg(rating), 1)::text FROM ma_reviews WHERE published) AS avg,
        (SELECT count(*)::int FROM ma_bugs WHERE ticket_id IS NULL) AS bugs
    `),
    db.query<Booking>(
      "SELECT * FROM ma_bookings WHERE status = 'bevestigd' AND departure >= CURRENT_DATE ORDER BY arrival LIMIT 5",
    ),
    db.query<Booking>("SELECT * FROM ma_bookings WHERE status = 'aanvraag' ORDER BY created_at DESC LIMIT 5"),
  ]);

  const period = (b: Booking) =>
    `${niceDate(parseDate(b.arrival)!, false)} – ${niceDate(parseDate(b.departure)!, false)} · ${nightsLabel(
      nightsBetween(parseDate(b.arrival)!, parseDate(b.departure)!),
    )}`;

  return (
    <>
      <PageHead title="Dashboard" sub="Overzicht van boekingen, recensies en meldingen." />

      <div className="adm-stats">
        <Link href="/admin/boekingen/" className="adm-stat">
          <span className="label">
            <span className="dot orange" /> Open aanvragen
          </span>
          <div className="value">{stats.requests}</div>
        </Link>
        <Link href="/admin/boekingen/" className="adm-stat">
          <span className="label">
            <span className="dot green" /> Komende verblijven
          </span>
          <div className="value">{stats.upcoming}</div>
        </Link>
        <Link href="/admin/boekingen/" className="adm-stat">
          <span className="label">
            <span className="dot blue" /> Bezet (90 dagen)
          </span>
          <div className="value">{Math.round((stats.nights / 90) * 100)}%</div>
        </Link>
        <Link href="/admin/recensies/" className="adm-stat">
          <span className="label">
            <span className="dot purple" /> Recensies
          </span>
          <div className="value">
            {stats.reviews}
            {stats.avg && <small style={{ fontSize: "1rem", color: "var(--a-muted)" }}> · {stats.avg.replace(".", ",")} ★</small>}
          </div>
        </Link>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>Nieuwe aanvragen</h2>
          <Link href="/admin/boekingen/">Alle boekingen →</Link>
        </div>
        {requests.length ? (
          <ul className="adm-list">
            {requests.map((b) => (
              <li key={b.id}>
                <div className="adm-row">
                  <div>
                    <div className="title">{b.guest_name}</div>
                    <div className="sub">{period(b)}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Geen openstaande aanvragen.</p>
        )}
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>Komende verblijven</h2>
        </div>
        {upcoming.length ? (
          <ul className="adm-list">
            {upcoming.map((b) => (
              <li key={b.id}>
                <div className="adm-row">
                  <div>
                    <div className="title">{b.guest_name || "Gast"}</div>
                    <div className="sub">{period(b)}</div>
                  </div>
                  {b.guests ? <span className="badge">{b.guests} gasten</span> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Nog geen bevestigde verblijven.</p>
        )}
      </div>

      {stats.bugs > 0 && (
        <p className="adm-flash info">
          {stats.bugs} bug{stats.bugs === 1 ? " is" : "s zijn"} nog niet als ticket doorgestuurd. <Link href="/admin/bug/">Bekijken</Link>
        </p>
      )}
    </>
  );
}
