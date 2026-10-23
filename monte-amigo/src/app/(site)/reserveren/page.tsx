/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { BookingForm } from "@/components/site/BookingForm";
import { occupiedRanges } from "@/lib/bookings";
import { CONTACT_EMAIL } from "@/lib/rates";

export const metadata: Metadata = {
  title: "Reserveren",
  description:
    "Reserveer je vakantie in Monte Amigo, Cumbre del Sol. Bekijk de beschikbaarheid en vraag direct je verblijf aan.",
};

export const dynamic = "force-dynamic";

export default async function ReserverenPage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const [ranges, sp] = await Promise.all([occupiedRanges(), searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  return (
    <main id="content" className="site-content">
      <h1 className="page-title">Reserveren</h1>
      <div className="entry-content">
        <p>
          Wil jij zeker zijn van jouw heerlijke vakantie bij ons in Monte Amigo? Vul dan onderstaand formulier in zodat wij jouw
          reservering kunnen bevestigen. Heb je nog vragen of stuur je liever een e-mail? Klik dan op de button linksonder of stuur
          jouw e-mail naar <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Wij hopen je snel te verwelkomen!
        </p>
        <p>
          Ps. Wij zijn verplicht uw gegevens te registreren bij de Spaanse overheid. Daarvoor vragen wij van elke gast de naam,
          geboortedatum, nationaliteit, huisadres en paspoort/id-nummer.
        </p>

        <BookingForm ranges={ranges} initialArrival={one(sp.aankomst)} initialDeparture={one(sp.vertrek)} />

        <figure className="after-form">
          <img
            src="/img/zee-baai.jpg"
            alt="Heldere blauwe baai met zeilboten aan de Costa Blanca"
            width={871}
            height={652}
            loading="lazy"
          />
        </figure>
      </div>
    </main>
  );
}
