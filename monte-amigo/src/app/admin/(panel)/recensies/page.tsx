import type { Metadata } from "next";
import { deleteReview, saveReview, toggleReview } from "@/app/admin/actions";
import { Flash, PageHead, type SP } from "@/components/admin/ui";
import { Stars } from "@/components/site/Stars";
import { listReviews, type Review } from "@/lib/reviews";

export const metadata: Metadata = { title: "Recensies" };

function ReviewFields({ r }: { r?: Review }) {
  const k = r?.id ?? "new";
  return (
    <>
      <div className="adm-grid3">
        <div className="adm-field">
          <label htmlFor={`name-${k}`}>Naam</label>
          <input id={`name-${k}`} name="name" type="text" required defaultValue={r?.name} placeholder="Bijv. Familie Jansen" />
        </div>
        <div className="adm-field">
          <label htmlFor={`rating-${k}`}>Sterren</label>
          <select id={`rating-${k}`} name="rating" defaultValue={r?.rating ?? 5}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} ({n})
              </option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor={`period-${k}`}>Periode</label>
          <input
            id={`period-${k}`}
            name="period"
            type="text"
            defaultValue={r?.period ?? String(new Date().getFullYear())}
            placeholder="Bijv. 2026 of juli 2026"
          />
        </div>
      </div>
      <div className="adm-field">
        <label htmlFor={`body-${k}`}>Recensie</label>
        <textarea id={`body-${k}`} name="body" required rows={5} defaultValue={r?.body} />
        <p className="hint">Een lege regel begint een nieuwe alinea.</p>
      </div>
      <label className="adm-check">
        <input type="checkbox" name="published" defaultChecked={r?.published ?? true} /> Tonen op de website
      </label>
    </>
  );
}

export default async function RecensiesAdminPage({ searchParams }: { searchParams: SP }) {
  const reviews = (await listReviews(false)).reverse();

  return (
    <>
      <PageHead title="Recensies" sub="Voeg recensies van gasten toe. Ze verschijnen direct op de pagina Recensies." />
      <Flash searchParams={searchParams} />

      <div className="adm-card">
        <div className="adm-card-body">
          <h2>Nieuwe recensie</h2>
          <p className="lead">Bijvoorbeeld overgenomen uit een e-mail of van een boekingsplatform.</p>
          <form action={saveReview} className="adm-form">
            <ReviewFields />
            <button className="adm-btn" type="submit">
              Recensie opslaan
            </button>
          </form>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>Alle recensies</h2>
          <span className="badge">{reviews.length}</span>
        </div>
        {reviews.length ? (
          <ul className="adm-list">
            {reviews.map((r) => (
              <li key={r.id}>
                <div className="adm-row">
                  <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                    <div className="title">{r.name}</div>
                    <div className="sub">
                      <Stars n={r.rating} /> {r.period}
                    </div>
                    <p className="adm-pre">{r.body.length > 220 ? r.body.slice(0, 220) + "…" : r.body}</p>
                  </div>
                  <form className="actions">
                    <input type="hidden" name="id" value={r.id} />
                    <span className={`badge ${r.published ? "green" : ""}`}>{r.published ? "Zichtbaar" : "Verborgen"}</span>
                    <button className="adm-btn sm ghost" formAction={toggleReview}>
                      {r.published ? "Verbergen" : "Tonen"}
                    </button>
                  </form>
                </div>
                <details className="adm-details" style={{ marginTop: ".6rem" }}>
                  <summary>Wijzigen</summary>
                  <form action={saveReview} className="adm-form">
                    <input type="hidden" name="id" value={r.id} />
                    <ReviewFields r={r} />
                    <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                      <button className="adm-btn sm" type="submit">
                        Opslaan
                      </button>
                      <button className="adm-btn sm danger" type="submit" formAction={deleteReview} formNoValidate>
                        Verwijderen
                      </button>
                    </div>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-empty">Nog geen recensies.</p>
        )}
      </div>
    </>
  );
}
