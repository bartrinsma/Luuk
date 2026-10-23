/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { HomeVideo } from "@/components/site/HomeVideo";

export const metadata: Metadata = {
  title: { absolute: "Monte Amigo – Cumbre del Sol" },
  description:
    "Luxe vakantieappartement voor 4/5 personen, hoog gelegen in Cumbre del Sol aan de Costa Blanca, met fantastisch uitzicht over de bergen en vallei.",
  openGraph: { images: ["/img/balkon-uitzicht.jpg"] },
};

export default function HomePage() {
  return (
    <main id="content" className="site-content">
      <h1 className="page-title">Home</h1>
      <div className="entry-content">
        <HomeVideo />

        <p>
          <span className="intro-title">Monte Amigo</span>
          Welkom in ons luxe vakantieappartement voor 4/5 personen. Het is prachtig en hoog gelegen in Urbanisatie Cumbre del Sol
          aan de kust van de Costa Blanca in Spanje en biedt een fantastisch uitzicht over de bergen en vallei. Een mooi
          vakantieverblijf voor iedereen die zijn vakantie in een ongedwongen sfeer wil doorbrengen en wil genieten van alle comfort
          en gemakken.
        </p>

        <p className="license">
          Ons appartement is officieel geregistreerd voor verhuur onder de nummers:
          <br />
          Licentie verhuur: VT470686A.
          <br />
          Toeristische verhuur: ESFCTU0000030380000675080000000000000000000VT470686A6.
          <br />
          Korte termijn verhuur (tot 1 jaar): ESFCNT0000030380000675080000000000000000000000000009.
        </p>

        <div className="columns">
          <img src="/img/logo.png" alt="Logo Monte Amigo – Vakantiehuis Spanje" width={362} height={266} />
          <img
            src="/img/cumbre-del-sol.jpg"
            alt="Toegangsbord Residential Park Cumbre del Sol"
            width={768}
            height={511}
            loading="lazy"
          />
        </div>
      </div>
    </main>
  );
}
