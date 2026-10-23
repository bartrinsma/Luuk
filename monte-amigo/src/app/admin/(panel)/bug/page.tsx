import type { Metadata } from "next";
import Link from "next/link";
import { createBug, deleteBug, retryBug } from "@/app/admin/actions";
import { Flash, PageHead, type SP } from "@/components/admin/ui";
import { ticketSettings } from "@/lib/settings";
import { listBugs } from "@/lib/tickets";

export const metadata: Metadata = { title: "Bugs melden" };

const PRIO: Record<string, string> = { laag: "", normaal: "blue", hoog: "red" };

export default async function BugPage({ searchParams }: { searchParams: SP }) {
  const [bugs, cfg] = await Promise.all([listBugs(), ticketSettings()]);

  return (
    <>
      <PageHead
        title="Bugs melden"
        sub="Werkt er iets niet goed op de website? Meld het hier. De melding komt als ticket op de to-do lijst van Online met Bart."
      />
      <Flash searchParams={searchParams} />

      {!cfg.key && (
        <p className="adm-flash info">
          De koppeling met het ticketsysteem is nog niet ingesteld. Bugs worden wel opgeslagen; stel de API-sleutel in bij{" "}
          <Link href="/admin/instellingen/">Instellingen</Link> en stuur ze daarna door.
        </p>
      )}

      <div className="adm-card">
        <div className="adm-card-body">
          <h2>Nieuwe bug</h2>
          <p className="lead">Hoe concreter, hoe sneller het opgelost kan worden.</p>
          <form action={createBug} className="adm-form">
            <div className="adm-field">
              <label htmlFor="title">Korte titel</label>
              <input id="title" name="title" type="text" required maxLength={160} placeholder="Bijv. Agenda toont juli niet goed op iPhone" />
            </div>
            <div className="adm-field">
              <label htmlFor="actual">Wat gaat er mis?</label>
              <textarea id="actual" name="actual" required rows={4} placeholder="Wat zie je, en wat deed je vlak daarvoor?" />
            </div>
            <div className="adm-field">
              <label htmlFor="expected">Wat had je verwacht?</label>
              <textarea id="expected" name="expected" rows={3} />
            </div>
            <div className="adm-grid3">
              <div className="adm-field">
                <label htmlFor="page_url">Op welke pagina?</label>
                <input id="page_url" name="page_url" type="text" placeholder="https://monte-amigo.nl/agenda/" />
              </div>
              <div className="adm-field">
                <label htmlFor="priority">Prioriteit</label>
                <select id="priority" name="priority" defaultValue="normaal">
                  <option value="laag">Laag</option>
                  <option value="normaal">Normaal</option>
                  <option value="hoog">Hoog (website werkt niet)</option>
                </select>
              </div>
              <div className="adm-field">
                <label htmlFor="reporter">Je naam</label>
                <input id="reporter" name="reporter" type="text" />
              </div>
            </div>
            <button className="adm-btn" type="submit">
              {cfg.auto && cfg.key ? "Bug melden en ticket aanmaken" : "Bug opslaan"}
            </button>
          </form>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>Gemelde bugs</h2>
          <span className="badge">{bugs.length}</span>
        </div>
        {bugs.length ? (
          <ul className="adm-list">
            {bugs.map((b) => (
              <li key={b.id}>
                <div className="adm-row">
                  <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                    <div className="title">{b.title}</div>
                    <div className="sub">
                      {new Date(b.created_at).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" })}
                      {b.reporter ? ` · ${b.reporter}` : ""}
                      {b.page_url ? ` · ${b.page_url}` : ""}
                    </div>
                    <p className="adm-pre">{b.actual}</p>
                    {b.ticket_error && !b.ticket_id && <p className="adm-error">{b.ticket_error}</p>}
                  </div>
                  <form className="actions">
                    <input type="hidden" name="id" value={b.id} />
                    <span className={`badge ${PRIO[b.priority] ?? ""}`}>{b.priority}</span>
                    {b.ticket_id ? (
                      <span className="badge green">
                        <span className="dot gray" /> Ticket op to-do lijst
                      </span>
                    ) : (
                      <button className="adm-btn sm" formAction={retryBug}>
                        {b.ticket_error ? "Opnieuw doorsturen" : "Doorsturen als ticket"}
                      </button>
                    )}
                    <button className="adm-btn sm danger" formAction={deleteBug}>
                      Verwijderen
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Nog geen bugs gemeld.</p>
        )}
      </div>
    </>
  );
}
