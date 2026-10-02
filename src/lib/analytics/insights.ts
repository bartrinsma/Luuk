import "server-only";
import {
  getHourly,
  getProvinces,
  getTopBrands,
  getTopCities,
  getTopDomains,
  getTopFuels,
  getVerdicts,
  getWeekdays,
  type ProvinceRow,
} from "@/lib/analytics/queries";
import { formatEuro, formatNumber } from "@/lib/format";
import { DEMONYM } from "@/lib/provinces";

/**
 * "Nieuwsgierigheidsblog": automatisch geschreven feitjes in Luuk's toon, klaar om te kopiëren.
 * Elk inzicht toont de onderliggende cijfers, zodat de redactie kan checken voor publicatie.
 */

export interface Insight {
  id: string;
  title: string;
  text: string;
  evidence: string;
  /** false als er te weinig data is om het hardop te zeggen. */
  solid: boolean;
}

const MIN_SOLID = 30; // onder dit aantal aanvragen is een "record" toeval

const WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

export async function getInsights(days: number): Promise<Insight[]> {
  const [provinces, cities, brands, fuels, domains, verdicts, hourly, weekdays] = await Promise.all([
    getProvinces(days),
    getTopCities(days),
    getTopBrands(days),
    getTopFuels(days),
    getTopDomains(days),
    getVerdicts(days),
    getHourly(days),
    getWeekdays(days),
  ]);
  const out: Insight[] = [];

  // 1. Nieuwsgierigste provincie (per 100.000 inwoners — anders wint altijd Zuid-Holland)
  const ranked = [...provinces].filter((p) => p.visitorRequests > 0).sort((a, b) => b.curiosityIndex - a.curiosityIndex);
  const totalRegional = provinces.reduce((s, p) => s + p.visitorRequests, 0);
  if (ranked.length > 0) {
    const [first, second] = ranked;
    const last = ranked.at(-1)!;
    const factor = second && second.curiosityIndex > 0 ? first.curiosityIndex / second.curiosityIndex : null;
    out.push({
      id: "curious-province",
      title: `De ${DEMONYM[first.province]} zijn het nieuwsgierigst`,
      text:
        `Niemand vraagt Luuk zo vaak om raad als de ${DEMONYM[first.province]}: ${fmtIndex(first)} aanvragen per 100.000 inwoners` +
        (factor && factor >= 1.15 ? `, ${factor.toFixed(1).replace(".", ",")}× zoveel als ${second.province}` : "") +
        `. ${ranked.length > 2 ? `De ${DEMONYM[last.province]} zijn het nuchterst (${fmtIndex(last)}). ` : ""}Sí.`,
      evidence: ranked.slice(0, 5).map((p) => `${p.province}: ${p.visitorRequests} aanvragen, ${fmtIndex(p)}/100k`).join(" · "),
      solid: totalRegional >= MIN_SOLID,
    });
  }

  // 2. Waar staan de huizen waar iedereen naar kijkt?
  if (cities[0]) {
    out.push({
      id: "hot-city",
      title: `${cities[0].label} is de huizenmagneet`,
      text: `De woonplaats waar Luuk het vaakst huizen taxeert? ${cities[0].label}: ${cities[0].n} woningen${
        cities[0].avg ? `, met een gemiddelde WOZ van ${formatEuro(Math.round(cities[0].avg / 1000) * 1000)}` : ""
      }.${cities[1] ? ` ${cities[1].label} volgt met ${cities[1].n}.` : ""} Sí.`,
      evidence: cities.slice(0, 5).map((c) => `${c.label}: ${c.n}`).join(" · "),
      solid: cities[0].n >= 10,
    });
  }

  // 3. Miskoop-provincie
  const miskoop = provinces.filter((p) => p.houseSearches >= 5 && p.miskoopShare !== null).sort((a, b) => b.miskoopShare! - a.miskoopShare!);
  if (miskoop[0]) {
    const m = miskoop[0];
    out.push({
      id: "miskoop-province",
      title: `In ${m.province} betaal je vaker te veel`,
      text: `${Math.round(m.miskoopShare! * 100)}% van de woningen die in ${m.province} door Luuk werden doorgelicht, kreeg het stempel "miskoop". ${
        m.avgWoz ? `Gemiddelde WOZ: ${formatEuro(Math.round(m.avgWoz / 1000) * 1000)}. ` : ""
      }Onderhandelen loont daar dubbel. Sí.`,
      evidence: miskoop.slice(0, 5).map((p) => `${p.province}: ${Math.round(p.miskoopShare! * 100)}% van ${p.houseSearches}`).join(" · "),
      solid: m.houseSearches >= MIN_SOLID,
    });
  }

  // 4. Auto's
  if (brands[0]) {
    out.push({
      id: "top-brand",
      title: `Nederland checkt vooral ${brands[0].label}s`,
      text: `${brands[0].label} is het meest opgezochte merk: ${brands[0].n} kentekens${
        brands[0].avg ? `, gemiddelde dagwaarde ${formatEuro(Math.round(brands[0].avg / 50) * 50)}` : ""
      }.${fuels[0] ? ` Favoriete brandstof van de nieuwsgierige koper: ${fuels[0].label.toLowerCase()}.` : ""} Sí.`,
      evidence: brands.slice(0, 5).map((b) => `${b.label}: ${b.n}`).join(" · "),
      solid: brands[0].n >= 10,
    });
  }

  // 5. Websites
  if (domains[0]) {
    out.push({
      id: "top-domain",
      title: `${domains[0].label} kreeg de meeste roasts`,
      text: `${domains[0].label} werd ${domains[0].n}× op de grill gelegd${
        domains[0].avg !== null ? ` (gemiddelde mobiele score ${Math.round(domains[0].avg)}/100)` : ""
      }. Iemand heeft daar een concurrent zitten. Sí.`,
      evidence: domains.slice(0, 5).map((d) => `${d.label}: ${d.n}`).join(" · "),
      solid: domains[0].n >= 5,
    });
  }

  // 6. Koopje vs miskoop landelijk
  const totalVerdicts = Object.values(verdicts).reduce((s, n) => s + n, 0);
  if (totalVerdicts > 0) {
    const share = (k: string) => Math.round(((verdicts[k] ?? 0) / totalVerdicts) * 100);
    out.push({
      id: "verdicts",
      title: "Koopje of miskoop? De landelijke stand",
      text: `Van alle ${formatNumber(totalVerdicts)} getaxeerde woningen vond Luuk ${share("koopje")}% een koopje, ${share("eerlijk")}% marktconform en ${share("miskoop")}% een miskoop. Sí.`,
      evidence: `koopje ${verdicts.koopje ?? 0} · eerlijk ${verdicts.eerlijk ?? 0} · miskoop ${verdicts.miskoop ?? 0}`,
      solid: totalVerdicts >= MIN_SOLID,
    });
  }

  // 7. Wanneer is Nederland nieuwsgierig?
  const totalHourly = hourly.reduce((s, n) => s + n, 0);
  if (totalHourly > 0) {
    const peakHour = hourly.indexOf(Math.max(...hourly));
    const night = hourly.slice(0, 6).reduce((s, n) => s + n, 0);
    const peakDay = weekdays.indexOf(Math.max(...weekdays));
    out.push({
      id: "peak-time",
      title: `Piekuur: ${String(peakHour).padStart(2, "0")}:00`,
      text: `De meeste vragen komen binnen rond ${String(peakHour).padStart(2, "0")}:00 uur, en ${WEEKDAYS[peakDay]} is de drukste dag. ${
        night > 0 ? `${Math.round((night / totalHourly) * 100)}% van de aanvragen komt tussen middernacht en zes uur — nachtbrakers met een hypotheekplan. ` : ""
      }Sí.`,
      evidence: `piekuur ${peakHour}u (${hourly[peakHour]}) · drukste dag ${WEEKDAYS[peakDay]} (${weekdays[peakDay]})`,
      solid: totalHourly >= MIN_SOLID * 3,
    });
  }

  return out;
}

function fmtIndex(p: ProvinceRow): string {
  return p.curiosityIndex >= 10 ? formatNumber(Math.round(p.curiosityIndex)) : p.curiosityIndex.toFixed(1).replace(".", ",");
}
