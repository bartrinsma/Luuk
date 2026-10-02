"use client";

import { motion } from "framer-motion";
import { Building2, Calculator, ExternalLink, History, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { FundaIcon, FundaMark } from "@/components/FundaMark";
import { HousePhotoCard } from "@/components/huizen/HousePhotoCard";
import { PhotoUpload } from "@/components/huizen/PhotoUpload";
import { LuukMessage, Thinking } from "@/components/LuukMessage";
import { LuukVerdict } from "@/components/LuukVerdict";
import { PageHero } from "@/components/PageHero";
import { ResultCard, ResultStack, SourceBadge, Stat, rise } from "@/components/ResultCard";
import { ActionBar } from "@/components/share/ActionBar";
import { SearchInput } from "@/components/SearchInput";
import { formatEuro, formatEuroCents, formatNumber, formatPercent } from "@/lib/format";
import type { HouseResponse } from "@/lib/types";
import { houseReport } from "@/lib/report";
import { useLuuk } from "@/lib/useLuuk";
import { detectHouseMode, parseHouseInput, type HouseMode } from "@/lib/houseInput";

type Mode = HouseMode;

const HINTS: Record<Mode, string> = {
  postcode: "Postcode + huisnummer, bijv. 3511 LX 12 of 1012AB 1-H",
  adres: "Straat + huisnummer + woonplaats, bijv. Damrak 1, Amsterdam",
  funda: "Plak de link van de Funda-advertentie, bijv. funda.nl/detail/koop/utrecht/huis-eikenlaan-12/…",
};

const MODE_LABEL: Record<Mode, string> = { postcode: "Postcode", adres: "Straat & plaats", funda: "Funda-link" };

export function HuizenClient({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<Mode>(initialQuery ? detectHouseMode(initialQuery) : "postcode");
  const [modeLocked, setModeLocked] = useState(false);
  const { data, message, loading, run, setMessage } = useLuuk<HouseResponse>("/api/huizen");
  const started = useRef(false);

  const submit = (q = query, m = mode) => {
    const parsed = parseHouseInput(q, m);
    if (!parsed.ok) return setMessage(parsed.error);
    run({ query: q, mode: parsed.value.kind === "funda" ? "funda" : m });
  };

  useEffect(() => {
    if (initialQuery && !started.current) {
      started.current = true;
      submit(initialQuery, detectHouseMode(initialQuery));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (v: string) => {
    setQuery(v);
    // Een Funda-link wint altijd; verder alleen automatisch wisselen zolang de gebruiker niet zelf koos.
    if (detectHouseMode(v) === "funda") setMode("funda");
    else if (!modeLocked && v.trim().length >= 2) setMode(detectHouseMode(v));
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 sm:px-6">
      <PageHero
        eyebrow="Vastgoed & WOZ"
        title="Wat is dit huis écht waard?"
        subtitle="WOZ-waarde, bouwjaar, m² en je maandlasten bij 100% financiering. Plus Luuk's oordeel: koopje of miskoop."
        compact={loading || !!data}
      >
        <div className="mb-3 flex justify-center">
          <div className="glass inline-flex rounded-full p-1 text-sm" role="tablist" aria-label="Invoermethode">
            {(["postcode", "adres", "funda"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setModeLocked(true);
                }}
                className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors sm:px-4 ${mode === m ? "text-white" : "text-muted hover:text-ink"}`}
              >
                {mode === m && <motion.span layoutId="addr-mode" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                {m === "funda" && <FundaIcon className="relative h-4 w-4" />}
                <span className="relative">{MODE_LABEL[m]}</span>
              </button>
            ))}
          </div>
        </div>
        <SearchInput
          value={query}
          onValueChange={onChange}
          onSubmit={() => submit()}
          loading={loading}
          icon={mode === "funda" ? FundaIcon : MapPin}
          inputMode={mode === "funda" ? "url" : undefined}
          autoFocus
        />
        <p className="mt-3 text-center text-xs text-ink/35">{HINTS[mode]}</p>
      </PageHero>

      <div className="mt-8 w-full">
        <LuukMessage message={message} />
        {loading && <Thinking label={mode === "funda" ? "Luuk leest de advertentie" : "Luuk trekt het Kadaster leeg"} />}
        {data && !loading && <HouseResult data={data} />}
      </div>
    </div>
  );
}

function HouseResult({ data }: { data: HouseResponse }) {
  const { property: p, mortgage: m, analysis: a } = data;
  const interestShare = (m.firstMonthInterest / m.monthlyPayment) * 100;
  const report = houseReport(data);
  const maxPrice = Math.max(p.wozWaarde, ...p.historischeVraagprijzen.map((x) => x.vraagprijs));
  const stamp =
    a.verdict === "koopje"
      ? { label: "Koopje", tone: "good" as const }
      : a.verdict === "miskoop"
        ? { label: "Miskoop", tone: "bad" as const }
        : { label: "Marktconform", tone: "neutral" as const };

  return (
    <ResultStack key={p.adres}>
      <motion.div variants={rise} className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <div className="text-lg font-semibold text-ink">{p.adres}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {p.woningtype}
            {data.funda && (
              <a
                href={data.funda.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-[#F7A100]/30 bg-[#F7A100]/10 px-2 py-0.5 transition-colors hover:bg-[#F7A100]/20"
              >
                <FundaMark />
                <ExternalLink className="h-3 w-3 text-[#E68A00]" />
              </a>
            )}
          </div>
        </div>
        <SourceBadge tone={data.dataSource === "kadaster" ? "live" : data.dataSource === "pdok+model" ? "neutral" : "demo"}>
          {data.dataSource === "kadaster" ? "Kadaster live" : data.dataSource === "pdok+model" ? "PDOK-adres · Luuk-model" : "Luuk-model (demo)"}
        </SourceBadge>
      </motion.div>

      <HousePhotoCard photos={data.photos} address={p.adres} />

      {/* De Data-Dump */}
      <ResultCard title="WOZ-waarde" icon={<Building2 className="h-3.5 w-3.5" />} aside={<span className="text-xs text-ink/40">peiljaar {p.wozPeiljaar}</span>}>
        <AnimatedNumber value={p.wozWaarde} format={formatEuro} className="price-glow block font-mono text-6xl font-bold tracking-tighter text-ink sm:text-8xl" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Bouwjaar" value={p.bouwjaar} sub={a.eraLabel} />
          <Stat label="Woonoppervlakte" value={`${p.woonoppervlakte} m²`} sub={p.perceeloppervlakte ? `perceel ${formatNumber(p.perceeloppervlakte)} m²` : "geen perceel"} />
          <Stat
            label="Prijs per m²"
            value={formatEuro(p.prijsPerM2)}
            sub={`${a.m2VsRegionPercentage >= 0 ? "+" : ""}${formatPercent(a.m2VsRegionPercentage, 0)} vs ${p.woonplaats}`}
          />
          <Stat label="Energielabel" value={p.energielabel} sub={labelVerdict(p.energielabel)} />
        </div>
        <PriceComparison data={data} />
      </ResultCard>

      {/* Maandlasten */}
      <ResultCard title="Maandlasten" icon={<Calculator className="h-3.5 w-3.5" />} aside={<span className="text-xs text-ink/40">100% financiering · annuïtair</span>}>
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-baseline gap-2">
              <AnimatedNumber value={m.monthlyPayment} format={formatEuroCents} delay={0.2} className="font-mono text-5xl font-bold tracking-tighter text-cyan sm:text-6xl" />
              <span className="whitespace-nowrap text-muted">/ maand</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              Bruto, {formatPercent(m.annualRate * 100)} rente over {m.termYears} jaar op {formatEuro(m.principal)}.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Totale rente" value={formatEuro(m.totalInterest)} />
            <Stat label="Totaal betaald" value={formatEuro(m.totalPaid)} />
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs text-muted">
            <span>Eerste termijn: rente {formatEuro(m.firstMonthInterest)}</span>
            <span>aflossing {formatEuro(m.firstMonthPrincipal)}</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-ink/[0.06]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${interestShare}%` }} transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="bg-cyan" />
            <div className="flex-1 bg-neon/60" />
          </div>
          <p className="mt-2 text-xs text-ink/35">{formatPercent(interestShare, 0)} van je eerste betaling is pure rente. Welkom bij de bank.</p>
        </div>
      </ResultCard>

      {/* Historische vraagprijzen */}
      <ResultCard title="Historische vraagprijzen" icon={<History className="h-3.5 w-3.5" />}>
        {p.historischeVraagprijzen.length === 0 ? (
          <p className="text-sm text-muted">Geen vraagprijzen bekend. Deze woning is sinds 2000 niet via de markt van eigenaar gewisseld — of heel stil.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {p.historischeVraagprijzen.map((h) => {
              const pct = (h.vraagprijs / maxPrice) * 100;
              return (
                <li key={h.jaar} className="grid grid-cols-[3.5rem_1fr_7rem] items-center gap-3 text-sm">
                  <span className="font-mono text-muted">{h.jaar}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.6, duration: 1 }} className="h-full rounded-full bg-ink/50" />
                  </div>
                  <span className="text-right font-mono text-ink">{formatEuro(h.vraagprijs)}</span>
                </li>
              );
            })}
            <li className="grid grid-cols-[3.5rem_1fr_7rem] items-center gap-3 text-sm">
              <span className="font-mono text-cyan-ink">WOZ</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(p.wozWaarde / maxPrice) * 100}%` }} transition={{ delay: 0.6, duration: 1 }} className="h-full rounded-full bg-cyan" />
              </div>
              <span className="text-right font-mono text-cyan-ink">{formatEuro(p.wozWaarde)}</span>
            </li>
          </ul>
        )}
      </ResultCard>

      <LuukVerdict title="Luuk's Verdict — Koopje of Miskoop?" text={data.verdict} source={data.verdictSource} stamp={stamp} />
      <PhotoUpload key={report.query} query={report.query} fairPrice={a.fairPrice} />
      <ActionBar report={report} />
    </ResultStack>
  );
}

function labelVerdict(label: string): string {
  if (label.startsWith("A")) return "zuinig";
  if (label === "B" || label === "C") return "prima";
  if (label === "D") return "matig";
  return "isolatie nodig";
}

/** Vraagprijs (Funda) of WOZ naast Luuk's eerlijke prijs — de kern van "koopje of miskoop". */
function PriceComparison({ data }: { data: HouseResponse }) {
  const a = data.analysis;
  const asking = a.comparedTo === "vraagprijs";
  const over = a.deltaPercentage > 0;
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-ink/[0.06] bg-cyan-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">
            {asking ? (
              <>
                <FundaIcon className="h-3.5 w-3.5" /> Vraagprijs
              </>
            ) : (
              "WOZ-waarde"
            )}
          </div>
          <div className="mt-1 font-mono text-xl font-semibold text-ink">{formatEuro(a.comparedPrice)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Luuk&apos;s eerlijke prijs</div>
          <div className="mt-1 font-mono text-xl font-semibold text-cyan-ink">{formatEuro(a.fairPrice)}</div>
        </div>
      </div>
      <div className={`text-sm font-medium ${Math.abs(a.deltaPercentage) < 4 ? "text-muted" : over ? "text-rose-600" : "text-neon"}`}>
        {over ? "+" : ""}
        {formatPercent(a.deltaPercentage, 0)} {asking ? "t.o.v. eerlijke prijs" : "WOZ t.o.v. eerlijke prijs"}
      </div>
    </div>
  );
}
