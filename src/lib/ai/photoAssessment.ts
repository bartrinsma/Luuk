import Anthropic from "@anthropic-ai/sdk";
import type { HouseAnalysis } from "@/lib/analysis";
import { formatEuro } from "@/lib/format";
import type { Property } from "@/lib/services/kadaster";

/**
 * Luuk bekijkt de foto's die de gebruiker uploadt en corrigeert zijn eerlijke prijs
 * voor de staat van de woning. Vision draait alleen via Anthropic; zonder key is het demo-modus.
 */

export interface PhotoImage {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  data: string; // base64, zonder data:-prefix
}

export interface PhotoFinding {
  type: "plus" | "min";
  tekst: string;
}

export interface PhotoAssessment {
  fotoCount: number;
  conditieScore: number | null; // 1–10
  correctiePercentage: number; // −15 … +15
  aangepastePrijs: number;
  bevindingen: PhotoFinding[];
  verdict: string;
  source: "ai" | "mock";
}

const MAX_CORRECTION = 15;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["isWoning", "conditieScore", "correctiePercentage", "bevindingen", "verdict"],
  properties: {
    isWoning: { type: "boolean", description: "false als de foto's geen woning (interieur of exterieur) tonen" },
    conditieScore: { type: "integer", description: "1 = sloopklaar, 10 = nieuwstaat" },
    correctiePercentage: { type: "number", description: "correctie op de eerlijke prijs, tussen -15 en 15" },
    bevindingen: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "tekst"],
        properties: { type: { type: "string", enum: ["plus", "min"] }, tekst: { type: "string" } },
      },
    },
    verdict: { type: "string" },
  },
} as const;

export async function assessHousePhotos(images: PhotoImage[], property: Property, analysis: HouseAnalysis): Promise<PhotoAssessment> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const ai = await callVision(images, property, analysis);
      if (ai) return ai;
    } catch (err) {
      console.warn("[fotos] vision faalde, demo-antwoord:", (err as Error).message);
    }
  }
  return mockAssessment(images.length, analysis);
}

let client: Anthropic | null = null;

async function callVision(images: PhotoImage[], property: Property, analysis: HouseAnalysis): Promise<PhotoAssessment | null> {
  client ??= new Anthropic();
  const response = await client.beta.messages.create({
    model: process.env.LUUK_ANTHROPIC_MODEL ?? "claude-opus-5-5",
    max_tokens: 2000,
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: `Jij bent Luuk, de nuchtere, zelfverzekerde waarde-expert van Luuk.si. Je zegt nooit dat je een AI bent.
Je beoordeelt foto's van een woning en corrigeert de "eerlijke prijs" voor de staat ervan.
Let op: onderhoud gevel/kozijnen/dak, afwerking, keuken en badkamer (leeftijd), vocht of schimmel, lichtinval, isolatie-indicaties (dubbel glas, zonnepanelen), tuin.
Regels:
- Baseer je alleen op wat zichtbaar is; verzin geen gebreken.
- correctiePercentage: negatief bij achterstallig onderhoud of verouderde keuken/badkamer, positief bij recente renovatie of luxe afwerking. Blijf tussen -15 en 15.
- bevindingen: 2 tot 6 korte, concrete punten in het Nederlands.
- verdict: 2-3 scherpe zinnen in het Nederlands, noem het aangepaste bedrag niet (dat rekent de code uit), eindig met "Sí."
- Tonen de foto's geen woning? Zet isWoning op false, correctie 0, en zeg dat droog.`,
    messages: [
      {
        role: "user",
        content: [
          ...images.map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.mediaType, data: img.data } })),
          {
            type: "text" as const,
            text: `Woning: ${JSON.stringify({
              adres: property.adres,
              woningtype: property.woningtype,
              bouwjaar: property.bouwjaar,
              woonoppervlakte: property.woonoppervlakte,
              energielabel: property.energielabel,
              eerlijkePrijsZonderFotos: analysis.fairPrice,
            })}\nBeoordeel de ${images.length} foto('s).`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") return null;
  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const parsed = JSON.parse(text) as {
    isWoning: boolean;
    conditieScore: number;
    correctiePercentage: number;
    bevindingen: PhotoFinding[];
    verdict: string;
  };

  const correctie = parsed.isWoning ? clamp(Number(parsed.correctiePercentage) || 0, -MAX_CORRECTION, MAX_CORRECTION) : 0;
  return {
    fotoCount: images.length,
    conditieScore: parsed.isWoning ? clamp(Math.round(parsed.conditieScore), 1, 10) : null,
    correctiePercentage: Math.round(correctie * 10) / 10,
    aangepastePrijs: roundTo(analysis.fairPrice * (1 + correctie / 100), 5000),
    bevindingen: (parsed.bevindingen ?? []).slice(0, 6),
    verdict: parsed.verdict,
    source: "ai",
  };
}

function mockAssessment(count: number, analysis: HouseAnalysis): PhotoAssessment {
  return {
    fotoCount: count,
    conditieScore: null,
    correctiePercentage: 0,
    aangepastePrijs: analysis.fairPrice,
    bevindingen: [],
    verdict: `${count} foto${count === 1 ? "" : "'s"} binnen. Mijn beeldanalyse staat in demo-modus — zodra de Anthropic-sleutel is aangesloten, beoordeel ik elk kozijn en elke keuken. Tot die tijd houd ik ${formatEuro(analysis.fairPrice)} aan. Sí.`,
    source: "mock",
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function roundTo(v: number, step: number): number {
  return Math.round(v / step) * step;
}
