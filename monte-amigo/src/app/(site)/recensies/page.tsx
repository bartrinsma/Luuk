import type { Metadata } from "next";
import Link from "next/link";
import { Stars } from "@/components/site/Stars";
import { listReviews } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "Recensies",
  description: "Wat gasten zeggen over vakantieappartement Monte Amigo in Cumbre del Sol.",
};

export const dynamic = "force-dynamic";

export default async function RecensiesPage() {
  const reviews = await listReviews(true);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <main id="content" className="site-content">
      <h1 className="page-title">Recensies</h1>
      <div className="entry-content">
        {reviews.length > 0 && (
          <div className="review-summary">
            <span className="score">{avg.toFixed(1).replace(".", ",")}</span>
            <div>
              <Stars n={Math.round(avg)} />
              <p>Gemiddelde van {reviews.length} recensies van onze gasten</p>
            </div>
          </div>
        )}
        <ul className="reviews">
          {reviews.map((r) => (
            <li key={r.id} className="review">
              <h3>{r.name}</h3>
              <div className="meta">
                <Stars n={r.rating} />
                {r.period && <span>{r.period}</span>}
              </div>
              {r.body.split(/\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </li>
          ))}
        </ul>
        <p>
          Ook genieten van Monte Amigo? <Link href="/reserveren/">Reserveer je verblijf</Link> of bekijk de{" "}
          <Link href="/agenda/">beschikbaarheid</Link>.
        </p>
      </div>
    </main>
  );
}
