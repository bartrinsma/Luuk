/**
 * Mock-Luuk: simuleert de antwoorden van het LLM zolang er geen API-key is aangesloten.
 * Deterministisch per input, met genoeg variatie om niet als een bandje te klinken.
 */
import type { HouseAnalysis } from "@/lib/analysis";
import { formatEuro, formatEuroShort, formatPercent } from "@/lib/format";
import { pick, seededRandom } from "@/lib/seed";
import type { Property } from "@/lib/services/kadaster";
import type { SeoReport } from "@/lib/services/seo";
import type { Vehicle } from "@/lib/services/rdw";
import { detectIntent } from "@/lib/validation";
import type { CarValuation } from "@/utils/calculateCarValue";
import type { MortgageResult } from "@/utils/calculateMortgage";

// ---------- Home / chat ----------

const TOPICS: { match: RegExp; answers: string[] }[] = [
  {
    match: /\b(bitcoin|btc|crypto)\b/i,
    answers: [
      "Bitcoin is precies waard wat de volgende koper ervoor betaalt — en die koper is vandaag nerveuzer dan gisteren. Leg er niet meer in dan je bereid bent te verliezen. Sí.",
    ],
  },
  {
    match: /\b(goud|gold|zilver)\b/i,
    answers: [
      "Goud levert geen rente, geen dividend en geen huur. Het enige wat het doet is minder hard dalen dan je spaarrekening als het misgaat. Verzekering, geen investering. Sí.",
    ],
  },
  {
    match: /\b(rente|hypotheekrente)\b/i,
    answers: [
      "Ik reken met 4,2% annuïtair over 30 jaar. Elke 0,1% renteverschil op een ton hypotheek is grofweg €6 per maand. Op €400k praat je dus over €24 per maand per tiende procent. Shoppen loont. Sí.",
    ],
  },
  {
    match: /\b(huis|huizen|woning|huizenmarkt|vastgoed)\b/i,
    answers: [
      "De Nederlandse huizenmarkt is geen markt, het is een tekort met een prijskaartje. Wil je weten wat een specifiek adres waard is? Tab Huizen, postcode erin, en ik vertel je of het een koopje of gebakken lucht is. Sí.",
    ],
  },
  {
    match: /\b(auto|auto's|kenteken|occasion|tweedehands)\b/i,
    answers: [
      "Een auto verliest gemiddeld 15% per jaar aan waarde. Het snelst in jaar één, het pijnlijkst als je hem zelf nieuw kocht. Geef me een kenteken in de tab Auto's en ik geef je de dagwaarde. Sí.",
    ],
  },
  {
    match: /\b(benzine|diesel|brandstof|tanken)\b/i,
    answers: [
      "Ruim 60% van wat je aan de pomp betaalt is belasting. Rijd je minder dan 10.000 km per jaar, dan is die zuinige diesel waar je over twijfelt gewoon een dure hobby. Sí.",
    ],
  },
  {
    match: /\b(sparen|beleggen|aandelen|etf|pensioen)\b/i,
    answers: [
      "Sparen verliest het van inflatie, beleggen verliest het van paniek. Een goedkope wereldwijde ETF, maandelijks inleggen en twintig jaar niet kijken verslaat de meeste mensen die het wél proberen. Sí.",
    ],
  },
  {
    match: /\b(wie ben jij|wie is luuk|wat ben jij|wat doe jij)\b/i,
    answers: [
      "Ik ben Luuk. Ik weet wat dingen waard zijn: huizen, auto's, websites. Jij stelt de vraag, ik geef het antwoord. Zonder omwegen. Sí.",
    ],
  },
  {
    match: /\b(hoi|hallo|hey|goedemorgen|goedemiddag|goedenavond)\b/i,
    answers: ["Hallo. Genoeg beleefdheden — wat wil je weten? Bij voorkeur iets met een prijskaartje. Sí."],
  },
];

const PRICE_WORDS = /\b(prijs|prijzen|waard|waarde|kost|kosten|duur|goedkoop|hoeveel|euro|€)\b/i;

export function mockChat(query: string): string {
  const intent = detectIntent(query);
  if (intent === "autos")
    return "Dat is een kenteken. Daar heb ik een hele afdeling voor. Ga naar Auto's en ik vertel je tot op de euro wat dat ding nog waard is. Sí.";
  if (intent === "huizen")
    return "Een adres. Prachtig. Ga naar Huizen, dan trek ik de WOZ, het bouwjaar en de maandlasten eruit — plus mijn eerlijke mening. Sí.";
  if (intent === "roast")
    return "Een domein. Zin in een confrontatie? Ga naar Roast en ik vertel je waarom die site klanten lekt. Sí.";

  const topic = TOPICS.find((t) => t.match.test(query));
  const rand = seededRandom(`chat:${query.toLowerCase().trim()}`);
  if (topic) return pick(rand, topic.answers);

  if (PRICE_WORDS.test(query))
    return pick(rand, [
      "Waarde is wat iemand vandaag bereid is te betalen, niet wat jij er ooit voor gaf. Geef me een kenteken, een adres of een URL en ik zet er een hard getal op. Sí.",
      "Prijzen zijn mijn specialiteit. Maar 'ongeveer' doe ik niet. Geef me een concreet object — huis, auto of website — en je krijgt een concreet bedrag. Sí.",
    ]);

  return pick(rand, [
    "Kort antwoord: dat hangt af van wat het jou oplevert. Lang antwoord: precies hetzelfde, maar dan duurder. Stel je vraag scherper en ik geef je een getal. Sí.",
    "Interessante vraag. Mijn kernspecialiteit ligt bij waarde: huizen, auto's, websites. Gooi er een prijsvraag tegenaan en kijk wat er gebeurt. Sí.",
    "Ik ben nu in mijn sobere modus en beantwoord vooral vragen over geld, waarde en prijzen. Probeer de tabs hierboven — daar ben ik onverslaanbaar. Sí.",
  ]);
}

// ---------- Huizen ----------

export function mockHouseVerdict(p: Property, mortgage: MortgageResult, a: HouseAnalysis): string {
  const rand = seededRandom(`huis:${p.adres}`);
  const woz = formatEuroShort(p.wozWaarde);
  const fair = formatEuro(a.fairPrice);
  const maand = formatEuro(Math.round(mortgage.monthlyPayment));
  const rente = formatPercent(mortgage.annualRate * 100);
  const labelSlecht = ["E", "F", "G"].includes(p.energielabel);

  const vraag = a.comparedTo === "vraagprijs" ? formatEuro(a.comparedPrice) : null;
  const vraagOpener = vraag
    ? a.verdict === "miskoop"
      ? `Ze vragen ${vraag} op Funda. Mijn model zegt ${fair}. Dat verschil van ${formatPercent(a.deltaPercentage, 0)} heet in de makelaardij 'potentie' en bij mij 'lucht'.`
      : a.verdict === "koopje"
        ? `Vraagprijs ${vraag} op Funda, terwijl ik ${fair} reken. Dat is ${formatPercent(Math.abs(a.deltaPercentage), 0)} onder mijn eerlijke prijs. Snel zijn.`
        : `Vraagprijs ${vraag} op Funda, mijn eerlijke prijs ${fair}. Scheelt weinig — dit is een normale marktconform huis.`
    : null;

  const opener = vraagOpener ?? (
    a.verdict === "miskoop"
      ? pick(rand, [
          `Met een WOZ van ${woz} en een rente van ${rente} betaal je je blauw: ${maand} per maand voor een ${a.eraLabel}.`,
          `${woz} WOZ voor ${p.woonoppervlakte} m². Dat is ${formatEuro(p.prijsPerM2)} per m², ${formatPercent(Math.abs(a.m2VsRegionPercentage), 0)} boven het gemiddelde in ${p.woonplaats}.`,
        ])
      : a.verdict === "koopje"
        ? pick(rand, [
            `Een WOZ van ${woz} voor ${p.woonoppervlakte} m² in ${p.woonplaats}? Dat ligt onder wat ik ervoor zou neerleggen.`,
            `${maand} per maand bij ${rente} voor een ${a.eraLabel} van ${p.woonoppervlakte} m². Dat is geen vraagprijs, dat is een uitnodiging.`,
          ])
        : pick(rand, [
            `WOZ ${woz}, ${maand} per maand bij ${rente}. Niet spectaculair, niet schandalig.`,
            `${p.woonoppervlakte} m² ${a.eraLabel} voor ${woz}. Netjes in lijn met de markt in ${p.woonplaats}.`,
          ]));

  const risk = labelSlecht
    ? `Energielabel ${p.energielabel}: reken op een flinke isolatierekening of een stookrekening die pijn doet.`
    : p.bouwjaar < 1940
      ? `Bouwjaar ${p.bouwjaar}: charme zat, maar check de fundering voordat je verliefd wordt.`
      : p.bouwjaar >= 2010
        ? `Bouwjaar ${p.bouwjaar} en label ${p.energielabel}: weinig onderhoud, lage energierekening. Dat is geld waard.`
        : `Label ${p.energielabel} en bouwjaar ${p.bouwjaar}: niks bijzonders, niks rampzaligs.`;

  const close =
    a.verdict === "miskoop"
      ? `Voor ${fair} is het een deal, alles daarboven is gebakken lucht. Sí.`
      : a.verdict === "koopje"
        ? `Mijn eerlijke prijs is ${fair}. Alles daaronder: tekenen. Sí.`
        : `Eerlijke prijs: ${fair}. Bied daar niet boven. Sí.`;

  return `${opener} ${risk} ${close}`;
}

// ---------- Auto's ----------

export function mockCarVerdict(v: Vehicle, val: CarValuation, maxBid: number, priceEstimated: boolean): string {
  const rand = seededRandom(`auto:${v.kenteken}`);
  const model = prettyModel(v);
  const jaar = v.bouwjaar ?? "onbekend jaar";
  const orig = formatEuro(val.originalPrice);
  const nu = formatEuro(val.currentValue);
  const age = val.ageYears;

  const opener = `${pick(rand, ["Een", "Ah, een"])} ${model} uit ${jaar}. ${priceEstimated ? "Nieuw ongeveer" : "Origineel"} ${orig}, nu nog hooguit ${nu} waard.`;
  const middle =
    age < 2
      ? "Nog bijna nieuw — de eerste eigenaar heeft de grootste klap al voor je opgevangen."
      : age < 6
        ? pick(rand, [
            "Afgetrapt door de vorige eigenaar of een pareltje? Vraag naar het onderhoudsboekje.",
            "Op de leeftijd waarop leasebakken massaal terugkomen. Onderhandelen is verplicht.",
          ])
        : age < 12
          ? pick(rand, [
              `${Math.round(100 - val.retainedPercentage)}% van de waarde is al verdampt. De rest verdampt langzamer, maar de reparaties niet.`,
              "Het afschrijvingsmonster heeft zijn werk gedaan. Nu begint het onderhoudsmonster.",
            ])
          : "Dit is geen investering meer, dit is vervoer. Koop hem op de APK, niet op de lak.";

  return `${opener} ${middle} Betaal er in ieder geval geen euro meer voor dan ${formatEuro(maxBid)}. Sí.`;
}

function prettyModel(v: Vehicle): string {
  const brand = v.merk.charAt(0) + v.merk.slice(1).toLowerCase();
  const model = v.handelsbenaming.toUpperCase().startsWith(v.merk.toUpperCase()) ? v.handelsbenaming.slice(v.merk.length).trim() : v.handelsbenaming;
  return `${brand} ${model.charAt(0) + model.slice(1).toLowerCase()}`.trim();
}

// ---------- SEO / Roast ----------

export function mockSeoVerdict(r: SeoReport): string {
  const failed = r.checks.filter((c) => !c.pass);
  const secs = (r.loadTimeMs / 1000).toFixed(1).replace(".", ",");
  const domain = r.hostname.replace(/^www\./, "");

  if (failed.length === 0)
    return `Ik had m'n roast al klaarstaan, maar ${domain} laadt in ${secs} seconden en heeft z'n basis op orde. Irritant goed. Ga zo door, dan hoef ik je niet meer te spreken. Sí.`;

  const pain: string[] = [];
  if (failed.some((c) => c.id === "h1")) pain.push(r.h1Count === 0 ? "geen H1-tags" : `${r.h1Count} H1-tags (Google weet niet waar je over gaat)`);
  if (failed.some((c) => c.id === "description")) pain.push(r.metaDescription ? "een rommelige meta description" : "geen meta description");
  if (failed.some((c) => c.id === "title")) pain.push(r.title ? `een titel als "${r.title.slice(0, 40)}"` : "geen title-tag");
  if (failed.some((c) => c.id === "viewport")) pain.push("geen mobiele viewport");
  if (failed.some((c) => c.id === "https")) pain.push("geen HTTPS");
  if (failed.some((c) => c.id === "alt")) pain.push(`${r.imagesWithoutAlt} afbeeldingen zonder alt-tekst`);
  const top = pain.slice(0, 2);
  const slow = r.loadTimeMs >= 2500;

  const opener = `Laten we eerlijk zijn: met een laadtijd van ${secs} seconden${top.length ? ` en ${joinNl(top)}` : ""} ben je ${slow || r.mobileScore < 50 ? "digitaal onzichtbaar" : "op z'n best middelmatig"}.`;
  const middle =
    r.mobileScore < 50
      ? `Mobiele score ${r.mobileScore}/100. Deze site lekt meer klanten dan een vergiet.`
      : `Mobiele score ${r.mobileScore}/100 — ${failed.length} van de ${r.checks.length} checks gezakt. Elk lek kost je bezoekers, elke bezoeker is omzet.`;
  const close = slow ? "Fix je snelheid en je SEO, of sluit de deuren. Sí." : "Fix die basics deze week nog. Sí.";
  return `${opener} ${middle} ${close}`;
}

function joinNl(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} en ${items.at(-1)}`;
}
