import type { Metadata } from "next";
import { deleteBooking, saveBooking, setBookingStatus } from "@/app/admin/actions";
import { Flash, PageHead, StatusBadge, type SP } from "@/components/admin/ui";
import { AvailabilityCalendar } from "@/components/site/AvailabilityCalendar";
import { listBookings, occupiedRanges, type Booking } from "@/lib/bookings";
import { isoDate, niceDate, nightsBetween, nightsLabel, parseDate, today } from "@/lib/dates";
import { euro } from "@/lib/rates";

export const metadata: Metadata = { title: "Boekingen" };

function Period({ b }: { b: Booking }) {
  const a = parseDate(b.arrival)!;
  const d = parseDate(b.departure)!;
  return (
    <>
      {niceDate(a)} – {niceDate(d)} · {nightsLabel(nightsBetween(a, d))}
    </>
  );
}

function StatusButton({ id, status, className, children }: { id: number; status: string; className: string; children: React.ReactNode }) {
  return (
    <form action={setBookingStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`adm-btn sm ${className}`} type="submit">
        {children}
      </button>
    </form>
  );
}

function BookingFields({ b }: { b?: Booking }) {
  return (
    <>
      <div className="adm-grid3">
        <div className="adm-field">
          <label htmlFor={`arrival-${b?.id ?? "new"}`}>Aankomst</label>
          <input id={`arrival-${b?.id ?? "new"}`} name="arrival" type="date" required defaultValue={b?.arrival} />
        </div>
        <div className="adm-field">
          <label htmlFor={`departure-${b?.id ?? "new"}`}>Vertrek</label>
          <input id={`departure-${b?.id ?? "new"}`} name="departure" type="date" required defaultValue={b?.departure} />
        </div>
        <div className="adm-field">
          <label htmlFor={`status-${b?.id ?? "new"}`}>Status</label>
          <select id={`status-${b?.id ?? "new"}`} name="status" defaultValue={b?.status ?? "bevestigd"}>
            <option value="bevestigd">Bevestigd (bezet)</option>
            <option value="geblokkeerd">Geblokkeerd (eigen gebruik / onderhoud)</option>
            <option value="aanvraag">Aanvraag (nog niet bezet)</option>
            <option value="afgewezen">Afgewezen</option>
          </select>
        </div>
      </div>
      <div className="adm-grid2">
        <div className="adm-field">
          <label htmlFor={`guest-${b?.id ?? "new"}`}>Naam gast</label>
          <input id={`guest-${b?.id ?? "new"}`} name="guest_name" type="text" defaultValue={b?.guest_name ?? ""} />
        </div>
        <div className="adm-field">
          <label htmlFor={`guests-${b?.id ?? "new"}`}>Aantal gasten</label>
          <input id={`guests-${b?.id ?? "new"}`} name="guests" type="number" min={1} max={8} defaultValue={b?.guests ?? ""} />
        </div>
        <div className="adm-field">
          <label htmlFor={`email-${b?.id ?? "new"}`}>E-mail</label>
          <input id={`email-${b?.id ?? "new"}`} name="email" type="email" defaultValue={b?.email ?? ""} />
        </div>
        <div className="adm-field">
          <label htmlFor={`phone-${b?.id ?? "new"}`}>Telefoon</label>
          <input id={`phone-${b?.id ?? "new"}`} name="phone" type="tel" defaultValue={b?.phone ?? ""} />
        </div>
      </div>
      <div className="adm-field">
        <label htmlFor={`notes-${b?.id ?? "new"}`}>Notities</label>
        <textarea id={`notes-${b?.id ?? "new"}`} name="notes" rows={3} defaultValue={b?.notes ?? ""} />
      </div>
    </>
  );
}

function BookingItem({ b }: { b: Booking }) {
  return (
    <li>
      <div className="adm-row">
        <div>
          <div className="title">{b.guest_name || (b.status === "geblokkeerd" ? "Geblokkeerd" : "Gast")}</div>
          <div className="sub">
            <Period b={b} />
            {b.guests ? ` · ${b.guests} gasten` : ""}
            {b.source === "website" ? " · via website" : ""}
          </div>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <details className="adm-details" style={{ marginTop: ".6rem" }}>
        <summary>Details en wijzigen</summary>
        {(b.email || b.phone || b.price) && (
          <p className="sub">
            {b.email && (
              <>
                <a href={`mailto:${b.email}`}>{b.email}</a> ·{" "}
              </>
            )}
            {b.phone && (
              <>
                <a href={`tel:${b.phone}`}>{b.phone}</a> ·{" "}
              </>
            )}
            {b.price && <>prijsindicatie {euro(Number(b.price))}</>}
          </p>
        )}
        <form action={saveBooking} className="adm-form">
          <input type="hidden" name="id" value={b.id} />
          <BookingFields b={b} />
          <div className="actions" style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <button className="adm-btn sm" type="submit">
              Opslaan
            </button>
            <button className="adm-btn sm danger" type="submit" formAction={deleteBooking} formNoValidate>
              Verwijderen
            </button>
          </div>
        </form>
      </details>
    </li>
  );
}

export default async function BoekingenPage({ searchParams }: { searchParams: SP }) {
  const [all, ranges] = await Promise.all([listBookings(), occupiedRanges()]);
  const now = isoDate(today());
  const requests = all.filter((b) => b.status === "aanvraag").reverse();
  const upcoming = all.filter((b) => b.status !== "aanvraag" && b.status !== "afgewezen" && b.departure >= now).reverse();
  const history = all.filter((b) => b.status === "afgewezen" || (b.status !== "aanvraag" && b.departure < now));

  return (
    <>
      <PageHead title="Boekingen" sub="Houd bij wanneer het appartement bezet of beschikbaar is. De agenda op de website past zich direct aan." />
      <Flash searchParams={searchParams} />

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>Aanvragen via de website</h2>
          <span className="badge orange">{requests.length}</span>
        </div>
        {requests.length ? (
          <ul className="adm-list">
            {requests.map((b) => (
              <li key={b.id}>
                <div className="adm-row">
                  <div>
                    <div className="title">{b.guest_name}</div>
                    <div className="sub">
                      <Period b={b} /> · {b.guests} gasten
                      {b.price ? ` · indicatie ${euro(Number(b.price))}` : ""}
                    </div>
                    <div className="sub">
                      <a href={`mailto:${b.email}`}>{b.email}</a> · <a href={`tel:${b.phone}`}>{b.phone}</a>
                    </div>
                    {b.notes && <p className="adm-pre">{b.notes}</p>}
                  </div>
                  <div className="actions">
                    <StatusButton id={b.id} status="bevestigd" className="green">
                      Bevestigen
                    </StatusButton>
                    <StatusButton id={b.id} status="afgewezen" className="danger">
                      Afwijzen
                    </StatusButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Geen openstaande aanvragen. Nieuwe aanvragen via het reserveringsformulier verschijnen hier.</p>
        )}
      </div>

      <div className="adm-card">
        <div className="adm-card-body">
          <h2>Periode toevoegen</h2>
          <p className="lead">Een boeking die je zelf hebt geregeld, of een periode die je wilt blokkeren.</p>
          <form action={saveBooking} className="adm-form">
            <BookingFields />
            <button className="adm-btn" type="submit">
              Toevoegen
            </button>
          </form>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-body">
          <h2>Agenda</h2>
          <p className="lead">Zo zien bezoekers de beschikbaarheid op de website.</p>
          <AvailabilityCalendar ranges={ranges} months={3} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>Komende en lopende periodes</h2>
        </div>
        {upcoming.length ? (
          <ul className="adm-list">
            {upcoming.map((b) => (
              <BookingItem key={b.id} b={b} />
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Geen komende boekingen.</p>
        )}
      </div>

      {history.length > 0 && (
        <details className="adm-card adm-details">
          <summary className="adm-card-head" style={{ marginBottom: 0 }}>
            Eerdere en afgewezen ({history.length})
          </summary>
          <ul className="adm-list">
            {history.map((b) => (
              <BookingItem key={b.id} b={b} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
