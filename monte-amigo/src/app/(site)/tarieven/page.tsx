import type { Metadata } from "next";
import Link from "next/link";
import { RatesTable } from "@/components/site/RatesTable";
import { CLEANING_FEE, DEPOSIT, MAX_NIGHTS, MIN_NIGHTS } from "@/lib/rates";

export const metadata: Metadata = {
  title: "Tarieven",
  description:
    "Tarieven van Monte Amigo per maand: prijs per week en per nacht. Minimaal 2 nachten, exclusief €125 schoonmaakkosten en €200 borg.",
};

export default function TarievenPage() {
  return (
    <main id="content" className="site-content">
      <h1 className="page-title">Tarieven</h1>
      <div className="entry-content">
        <RatesTable />

        <div className="notes">
          <p>
            Het verblijf loopt in juli en augustus in principe van zaterdag tot zaterdag. In overleg zijn andere aankomst- en
            vertrekdagen mogelijk. Prijzen zijn exclusief €{CLEANING_FEE} schoonmaak kosten en €{DEPOSIT} borg.
          </p>
          <p>
            Minimaal verblijf is {MIN_NIGHTS} nachten, maximaal verblijf is in principe {MAX_NIGHTS} nachten. Heeft u andere wensen?
            Neem dan even contact met ons op.
          </p>
          <p>
            Wij zijn verplicht uw gegevens te registreren bij de Spaanse overheid. Daarvoor vragen wij van elke gast de naam,
            geboortedatum, nationaliteit, huisadres, contactgegevens en paspoort/id nummer.
          </p>
        </div>

        <p>
          Wil jij boeken? <Link href="/reserveren/">Klik dan hier!</Link>
        </p>
      </div>
    </main>
  );
}
