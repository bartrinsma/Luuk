import type { Metadata } from "next";
import { saveTicketSettings, testTickets } from "@/app/admin/actions";
import { Flash, PageHead, type SP } from "@/components/admin/ui";
import { getDb } from "@/lib/db";
import { ticketSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Instellingen" };

export default async function InstellingenPage({ searchParams }: { searchParams: SP }) {
  const [cfg, db] = await Promise.all([ticketSettings(), getDb()]);
  const masked = cfg.key ? `${cfg.key.slice(0, 12)}…${cfg.key.slice(-4)}` : null;

  return (
    <>
      <PageHead title="Instellingen" sub="Koppeling met het ticketsysteem en technische gegevens." />
      <Flash searchParams={searchParams} />

      {!db.persistent && (
        <p className="adm-flash fout">
          Let op: er is geen blijvende database ingesteld (DATABASE_URL). Boekingen, recensies en bugs kunnen verloren gaan bij een
          herstart van de server.
        </p>
      )}

      <div className="adm-card">
        <div className="adm-card-body">
          <h2>Ticketsysteem (tickets.onlinemetbart.nl)</h2>
          <p className="lead">
            Elke klant in het ticketsysteem heeft een eigen API-sleutel (te maken bij de klant, onder &quot;API-koppeling&quot;). Met
            die sleutel komen bugs als ticket op de to-do lijst van deze klant.
          </p>
          <form action={saveTicketSettings} className="adm-form">
            <div className="adm-field">
              <label htmlFor="url">Adres van het ticketsysteem</label>
              <input id="url" name="url" type="url" defaultValue={cfg.url} placeholder="https://tickets.onlinemetbart.nl" />
            </div>
            <div className="adm-field">
              <label htmlFor="key">API-sleutel</label>
              <input id="key" name="key" type="password" autoComplete="off" placeholder={masked ? "Laat leeg om de huidige te houden" : "omb_…"} />
              <p className="hint">
                {masked ? (
                  <>
                    Huidige sleutel: <code className="adm-code">{masked}</code>
                  </>
                ) : (
                  "Nog geen sleutel ingesteld."
                )}
              </p>
            </div>
            {masked && (
              <label className="adm-check">
                <input type="checkbox" name="clear_key" /> Sleutel verwijderen
              </label>
            )}
            <label className="adm-check">
              <input type="checkbox" name="auto" defaultChecked={cfg.auto} /> Nieuwe bugs automatisch als ticket doorsturen
            </label>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              <button className="adm-btn" type="submit">
                Opslaan
              </button>
              <button className="adm-btn ghost" type="submit" formAction={testTickets} formNoValidate>
                Verbinding testen
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-body">
          <h2>Systeem</h2>
          <p className="lead" style={{ marginBottom: 0 }}>
            Database: {db.kind === "postgres" ? "Postgres" : "PGlite (lokaal)"} · {db.persistent ? "blijvend" : "tijdelijk"}
            <br />
            Melding bij nieuwe aanvraag: {process.env.RESEND_API_KEY ? `per e-mail naar ${process.env.NOTIFY_EMAIL || "rentalmonteamigo@gmail.com"}` : "uit (geen RESEND_API_KEY)"}
          </p>
        </div>
      </div>
    </>
  );
}
