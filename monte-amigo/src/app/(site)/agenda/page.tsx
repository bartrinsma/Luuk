import type { Metadata } from "next";
import { AgendaView } from "@/components/site/AgendaView";
import { occupiedRanges } from "@/lib/bookings";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Beschikbaarheid van vakantieappartement Monte Amigo in Cumbre del Sol.",
};

// Altijd de actuele bezetting uit de database tonen.
export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const ranges = await occupiedRanges();
  return (
    <main id="content" className="site-content site-content--wide">
      <h1 className="page-title">Agenda</h1>
      <div className="entry-content">
        <p>
          Hieronder zie je wanneer Monte Amigo nog beschikbaar is. Klik op je aankomst- en vertrekdatum om direct een reservering voor
          die periode te starten.
        </p>
        <AgendaView ranges={ranges} />
      </div>
    </main>
  );
}
