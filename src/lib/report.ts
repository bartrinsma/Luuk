/**
 * Eén generiek rapportmodel voor PDF, e-mail en WhatsApp.
 * Isomorf: draait in de browser (PDF, WhatsApp) én op de server (e-mail).
 */
import { formatEuro, formatEuroCents, formatNumber, formatPercent } from "@/lib/format";
import type { CarResponse, HouseResponse, SeoResponse } from "@/lib/types";
import { formatPostcode } from "@/lib/validation";

export type ReportKind = "huis" | "auto" | "website";

export interface ReportFact {
  label: string;
  value: string;
  /** Voor checklists: geslaagd of gezakt. */
  ok?: boolean;
}

export interface ShareReport {
  kind: ReportKind;
  /** Adres, kenteken of domein. */
  subject: string;
  subtitle: string;
  /** Wat in de zoekbalk hoort om deze analyse te reproduceren. */
  query: string;
  headline: { label: string; value: string };
  secondary?: { label: string; value: string };
  facts: ReportFact[];
  verdictTitle: string;
  verdict: string;
  stamp?: string;
  /** Herkomst van de data, voor de kleine lettertjes. */
  dataNote: string;
}

const MODULE_PATH: Record<ReportKind, string> = { huis: "/huizen", auto: "/autos", website: "/roast" };

const KIND_LABEL: Record<ReportKind, string> = { huis: "Woninganalyse", auto: "Voertuiganalyse", website: "Website Roast" };

export const kindLabel = (kind: ReportKind) => KIND_LABEL[kind];

export function shareUrl(origin: string, report: Pick<ShareReport, "kind" | "query">): string {
  return `${origin.replace(/\/$/, "")}${MODULE_PATH[report.kind]}?q=${encodeURIComponent(report.query)}`;
}

// ---------- Builders per module ----------

export function houseReport(d: HouseResponse): ShareReport {
  const p = d.property;
  const query = d.funda?.url ?? (p.postcode ? `${formatPostcode(p.postcode)} ${p.huisnummer}` : `${p.straat} ${p.huisnummer}, ${p.woonplaats}`);
  const stamp = { koopje: "Koopje", eerlijk: "Marktconform", miskoop: "Miskoop" }[d.analysis.verdict];

  return {
    kind: "huis",
    subject: p.adres,
    subtitle: `${p.woningtype} · bouwjaar ${p.bouwjaar}`,
    query,
    headline: { label: `WOZ-waarde (peiljaar ${p.wozPeiljaar})`, value: formatEuro(p.wozWaarde) },
    secondary: { label: `Bruto maandlast (${formatPercent(d.mortgage.annualRate * 100)}, ${d.mortgage.termYears} jaar)`, value: formatEuroCents(d.mortgage.monthlyPayment) },
    facts: [
      { label: "Bouwjaar", value: String(p.bouwjaar) },
      { label: "Woonoppervlakte", value: `${p.woonoppervlakte} m²` },
      { label: "Perceel", value: p.perceeloppervlakte ? `${formatNumber(p.perceeloppervlakte)} m²` : "—" },
      { label: "Energielabel", value: p.energielabel },
      { label: "Prijs per m²", value: formatEuro(p.prijsPerM2) },
      { label: `Gemiddeld ${p.woonplaats}`, value: `${formatEuro(p.regioPrijsPerM2)} / m²` },
      { label: "Totale rente (30 jaar)", value: formatEuro(d.mortgage.totalInterest) },
      ...(d.funda?.vraagprijs ? [{ label: "Vraagprijs (Funda)", value: formatEuro(d.funda.vraagprijs) }] : []),
      { label: "Luuk's eerlijke prijs", value: formatEuro(d.analysis.fairPrice) },
      ...p.historischeVraagprijzen.map((h) => ({ label: `Vraagprijs ${h.jaar}`, value: formatEuro(h.vraagprijs) })),
    ],
    verdictTitle: "Luuk's Verdict — Koopje of Miskoop?",
    verdict: d.verdict,
    stamp,
    dataNote: d.dataSource === "kadaster" ? "Bron: Kadaster/WOZ." : "Bron: Luuk-waardemodel op basis van adres en regio (indicatief).",
  };
}

export function carReport(d: CarResponse): ShareReport {
  const v = d.vehicle;
  const model = v.handelsbenaming.toUpperCase().startsWith(v.merk.toUpperCase()) ? v.handelsbenaming.slice(v.merk.length).trim() : v.handelsbenaming;
  const name = `${titleCase(v.merk)} ${titleCase(model)}`.trim();
  const val = d.valuation;

  return {
    kind: "auto",
    subject: v.kentekenFormatted,
    subtitle: `${name}${v.bouwjaar ? ` · ${v.bouwjaar}` : ""}`,
    query: v.kentekenFormatted,
    headline: { label: "Dagwaarde volgens Luuk", value: formatEuro(val.currentValue) },
    secondary: { label: "Maximaal bod", value: formatEuro(d.maxBid) },
    facts: [
      { label: "Merk", value: titleCase(v.merk) },
      { label: "Model", value: titleCase(model) || "—" },
      { label: "Bouwjaar", value: v.bouwjaar ? String(v.bouwjaar) : "—" },
      { label: "Brandstof", value: v.brandstof ?? "Onbekend" },
      { label: "Vermogen", value: v.vermogenKw ? `${v.vermogenKw} kW (${Math.round(v.vermogenKw * 1.36)} pk)` : "—" },
      { label: d.priceSource === "rdw" ? "Catalogusprijs (RDW)" : "Nieuwprijs (geschat)", value: formatEuro(val.originalPrice) },
      { label: "Leeftijd", value: `${val.ageYears.toFixed(1).replace(".", ",")} jaar` },
      { label: "Restwaarde", value: formatPercent(val.retainedPercentage, 0) },
      { label: "Afschrijving", value: `${formatEuro(val.totalDepreciation)} (${Math.round(val.depreciationRate * 100)}% p/j)` },
    ],
    verdictTitle: "Luuk's Commentaar",
    verdict: d.verdict,
    dataNote: d.dataSource === "rdw" ? "Bron: RDW Open Data. Dagwaarde: V = P × (1 - r)^t." : "Bron: Luuk-model (RDW niet bereikbaar). Dagwaarde: V = P × (1 - r)^t.",
  };
}

export function seoReport(d: SeoResponse): ShareReport {
  const r = d.report;
  const passed = r.checks.filter((c) => c.pass).length;
  const stamp = r.mobileScore >= 90 ? "Irritant goed" : r.mobileScore >= 50 ? "Lekt" : "Vergiet";

  return {
    kind: "website",
    subject: r.hostname,
    subtitle: r.title ?? "Geen title-tag",
    query: r.hostname,
    headline: { label: "Mobiele score", value: `${r.mobileScore}/100` },
    secondary: { label: "Laadtijd", value: `${(r.loadTimeMs / 1000).toFixed(1).replace(".", ",")} s` },
    facts: [
      { label: "SEO-checks geslaagd", value: `${passed}/${r.checks.length}` },
      ...r.checks.map((c) => ({ label: c.label, value: c.detail, ok: c.pass })),
    ],
    verdictTitle: "Luuk's Roast",
    verdict: d.verdict,
    stamp,
    dataNote: d.dataSource === "demo" ? "Bron: Luuk-model (site niet bereikbaar)." : "Bron: live gemeten door Luuk.si.",
  };
}

// ---------- Teksten ----------

export function emailSubject(r: ShareReport): string {
  if (r.kind === "website") return `Luuk.si Analyse: ${r.subject} - Top of Flop?`;
  return `Luuk.si Analyse: ${r.subject} - Koopje of Miskoop?`;
}

/** Eerste zin (of twee korte) van het oordeel, voor previews. */
export function shortQuote(verdict: string, max = 180): string {
  const sentences = verdict.match(/[^.!?]+[.!?]+/g) ?? [verdict];
  let out = "";
  for (const s of sentences) {
    if ((out + s).length > max) break;
    out += s;
  }
  out = (out || verdict.slice(0, max - 1) + "…").trim();
  return out.replace(/\s*Sí\.?$/, "").trim();
}

const KIND_EMOJI: Record<ReportKind, string> = { huis: "🏠", auto: "🚗", website: "🌐" };

export function whatsappText(r: ShareReport, url: string): string {
  return [
    `🚨 *Luuk.si heeft dit geanalyseerd:* ${KIND_EMOJI[r.kind]} ${r.subject}`,
    "",
    `💰 ${r.headline.label}: *${r.headline.value}*`,
    r.secondary ? `📊 ${r.secondary.label}: *${r.secondary.value}*` : null,
    r.stamp ? `⚖️ Oordeel: *${r.stamp.toUpperCase()}*` : null,
    "",
    `🧠 Luuk's oordeel: _"${shortQuote(r.verdict)}"_`,
    "",
    `👉 Bekijk het hele rapport hier: ${url}`,
    "",
    "Sí.",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w) => (/\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");
}
