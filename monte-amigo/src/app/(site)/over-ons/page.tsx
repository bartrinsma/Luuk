/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { Gallery, type Photo } from "@/components/site/Gallery";

export const metadata: Metadata = {
  title: "Vakantiehuis",
  description:
    "Ons luxe, compleet gerenoveerde 4/5 persoonsappartement in Cumbre del Sol: keuken, terras met loungebank, twee slaapkamers, airco, glasvezelinternet en drie zwembaden om de hoek.",
};

const PHOTOS: Photo[] = [
  ["terras-1", "Overdekt terras met loungebank en uitzicht op de bergen"],
  ["terras-2", "Terras met loungebank en buffetkast"],
  ["balkon", "Balkon met ligstoelen en uitzicht over de vallei"],
  ["terras-3", "Terras met loungebank naast de schuifpui"],
  ["woonkamer", "Woon- en eetkamer"],
  ["keuken", "Compleet ingerichte keuken"],
  ["stapelbed-1", "Slaapkamer met stapelbed"],
  ["stapelbed-2", "Slaapkamer met stapelbed en ladekast"],
  ["badkamer", "Badkamer met douche"],
  ["slaapkamer-1", "Slaapkamer met tweepersoonsbed en balkondeur"],
  ["slaapkamer-2", "Slaapkamer met tweepersoonsbed"],
  ["slaapkamer-3", "Slaapkamer met tweepersoonsbed en ladekast"],
  ["zwembad-1", "Zwembad met uitzicht over de bergen"],
  ["cumbre-del-sol-luchtfoto", "Cumbre del Sol van bovenaf met zee en kust"],
  ["zwembad-vallei", "Zwembad met uitzicht over de vallei"],
  ["rotsboog", "Rotsboog aan de kust"],
  ["strand-kinderen", "Spelende kinderen op het strand"],
  ["speeltuin", "Speeltuin in de buurt"],
  ["appartement-buiten", "Buitenkant van het appartement met parkeerplaats voor de deur"],
].map(([n, alt]) => ({ src: `/img/${n}.jpg`, alt, wide: n === "appartement-buiten" }));

export default function OverOnsPage() {
  return (
    <main id="content" className="site-content">
      <figure className="featured-image">
        <img
          src="/img/balkon-uitzicht.jpg"
          alt="Balkon met ligstoelen en zonnig uitzicht over de bergen"
          width={1008}
          height={752}
        />
      </figure>
      <h1 className="page-title">Vakantiehuis</h1>
      <div className="entry-content">
        <p>
          Ons luxe, compleet gerenoveerde, 4/5 persoonsappartement (verhuurlicentie VT470686A) is voorzien van alle comfort en gemak.
          Een compleet ingerichte keuken (koelkast, afwasmachine, magnetron, koffieapparaten, oven, elektrisch fornuis, waterkoker etc.
          etc), modern ingerichte woon-/eetkamer, deels overdekt terras met een heerlijke loungebank en de mogelijkheid buiten te eten,
          twee slaapkamers (1x met 2 persoonsbed en 1x met stapelbed en 1 persoonsbed) en een complete badkamer met douche. Er is
          airconditioning (koud/warm) in de gehele woning, draadloos (glasvezel)internet en een Chromecast zodat je al je favorieten
          kunt streamen. Het appartement is ook ingericht op (kleine) kinderen. Zo is er een kinderbedje, een kinderstoel, serviesgoed
          en bestek voor kinderen. Het appartement ligt op de hoogste woonlaag maar op straatniveau. Dus geen lift nodig of onnodig
          veel trappen lopen! Parkeren kan voor de deur.
        </p>

        <p>
          Het dichtsbijzijnde strand is op 2,5 km en drie prachtige zwembaden om de hoek. Het strand en de zwembaden zijn zeer
          geschikt voor kinderen.
        </p>

        <p>
          Het vliegveld van Valencia ligt op +- 75 minuten en het vliegveld van Alicante op +- 50 minuten rijden van Moraira. We
          adviseren je wel om een auto te huren.
        </p>

        <Gallery photos={PHOTOS} />
      </div>
    </main>
  );
}
