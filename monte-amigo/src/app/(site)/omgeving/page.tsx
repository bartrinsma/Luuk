/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { Gallery, type Photo } from "@/components/site/Gallery";

export const metadata: Metadata = {
  title: "Wat te doen in de omgeving?",
  description:
    "Wat te doen rond Cumbre del Sol en Moraira: stranden, bergdorpjes, attractieparken, golf, wielrennen en wandelen aan de Costa Blanca.",
};

const PHOTOS: Photo[] = [
  { src: "/img/strand-moraira.jpg", alt: "Strand bij Moraira met zicht op de kaap" },
  { src: "/img/zeilboten.jpg", alt: "Zeilboten voor de kust" },
  { src: "/img/suppen.jpg", alt: "Suppen op zee bij zonsondergang" },
  { src: "/img/wandelpad-kust.jpg", alt: "Wandelpad langs de kust" },
  { src: "/img/rotsboog.jpg", alt: "Rotsboog aan de kust" },
  { src: "/img/strand-kinderen.jpg", alt: "Spelende kinderen op het strand" },
];

export default function OmgevingPage() {
  return (
    <main id="content" className="site-content">
      <h1 className="page-title">Wat te doen in de omgeving?</h1>
      <div className="entry-content">
        <p>
          Cumbre del Sol, een mooie urbanisatie, aan de oostkust van Spanje is gelegen in de groenrijke, bergachtige regio Marina
          Alta, tussen Denia en Altea.
        </p>
        <p>
          In de omgeving van ons appartement Monte Amigo zijn er voor jong en oud tal van leuke activiteiten te doen, gezellige dorpen
          en steden te bezoeken en te genieten van de prachtige natuur. Je kan bijvoorbeeld naar Alicante of Valencia. Mooie stranden
          bezoeken rondom Cumbre del Sol of Moraira, gezellige bergdorpjes bekijken, toeristische attracties bezoeken of
          natuurwandelingen maken in de omgeving.
        </p>
        <p>
          Met kinderen zijn er ook genoeg leuke dingen te doen, variërend van een bezoek aan een dierentuin of een attractiepark tot
          aan avonturenpark Palmeral Aventuras of themapark Terra Mítica. En natuurlijk niet te vergeten lekker spelen op het strand,
          bij het zwembad of in 1 van de speeltuintjes in de omgeving.
        </p>

        <h3>Moraira</h3>
        <figure className="inline-photo">
          <img src="/img/moraira.jpg" alt="Letters MORAIRA aan de kust" width={768} height={576} loading="lazy" />
        </figure>
        <p>
          Op korte rijafstand ligt het charmante stadje Moraira, bekend om zijn traditionele Spaanse architectuur, ongerepte stranden
          en verrassende restaurants. Of je nu wilt genieten van de zon op het strand, een duik wilt nemen in de azuurblauwe zee,
          gezellig wilt shoppen of wilt genieten van de lokale keuken, dit is een uitgelezen kans om dit prachtige stadje te
          ontdekken.
        </p>
        <p>
          Voor de sportievere vakantieganger is er ook genoeg te doen! Wat te denken van het bezoeken van prachtige golfbanen in de
          buurt, een waterscooter huren, met de racefiets een prachtige tocht maken door de bergen of de vele wandelpaden in de
          omgeving verkennen?
        </p>

        <Gallery photos={PHOTOS} />
      </div>
    </main>
  );
}
