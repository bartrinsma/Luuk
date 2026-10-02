"use client";

import { motion } from "framer-motion";
import { Car, Gauge, TrendingDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { LicensePlateInput } from "@/components/LicensePlateInput";
import { LuukMessage, Thinking } from "@/components/LuukMessage";
import { LuukVerdict } from "@/components/LuukVerdict";
import { PageHero } from "@/components/PageHero";
import { ResultCard, ResultStack, SourceBadge, Stat, rise } from "@/components/ResultCard";
import { ActionBar } from "@/components/share/ActionBar";
import { formatEuro, formatNumber, formatPercent } from "@/lib/format";
import type { CarResponse } from "@/lib/types";
import { carReport } from "@/lib/report";
import { useLuuk } from "@/lib/useLuuk";
import { formatKenteken, isValidKenteken, kentekenError } from "@/lib/validation";

const PRICE_SOURCE_LABEL: Record<CarResponse["priceSource"], string> = {
  rdw: "catalogusprijs RDW",
  "luuk-ai": "nieuwprijs geschat door Luuk",
  "luuk-model": "nieuwprijs geschat (Luuk-model)",
};

export function AutosClient({ initialQuery }: { initialQuery: string }) {
  const [plate, setPlate] = useState(formatKenteken(initialQuery));
  const { data, message, loading, run, setMessage } = useLuuk<CarResponse>("/api/autos");
  const started = useRef(false);

  const submit = (value = plate) => {
    if (!isValidKenteken(value)) return setMessage(kentekenError(value));
    run({ kenteken: value });
  };

  useEffect(() => {
    if (initialQuery && !started.current) {
      started.current = true;
      submit(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 sm:px-6">
      <PageHero
        eyebrow="Kenteken & Waarde"
        title="Wat is die bak nog waard?"
        subtitle="Kenteken erin. Luuk haalt de specs bij de RDW en rekent de dagwaarde tot op de euro uit."
        compact={loading || !!data}
      >
        <LicensePlateInput value={plate} onValueChange={setPlate} onSubmit={() => submit()} loading={loading} autoFocus />
        <p className="mt-3 text-center text-xs text-white/35">Elk Nederlands kenteken. Streepjes doet Luuk zelf.</p>
      </PageHero>

      <div className="mt-8 w-full">
        <LuukMessage message={message} />
        {loading && <Thinking label="Luuk belt de RDW" />}
        {data && !loading && <CarResult data={data} />}
      </div>
    </div>
  );
}

function CarResult({ data }: { data: CarResponse }) {
  const { vehicle: v, valuation: val } = data;
  const model = modelName(v.merk, v.handelsbenaming);
  const name = `${cap(v.merk)} ${model}`.trim();
  const apk = v.apkVervaldatum ? new Date(v.apkVervaldatum) : null;
  const pk = v.vermogenKw ? Math.round(v.vermogenKw * 1.36) : null;

  return (
    <ResultStack key={v.kenteken}>
      <motion.div variants={rise} className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className="rounded-md border-2 border-black/80 bg-plate px-2.5 py-0.5 font-mono text-lg font-black tracking-widest text-black">{v.kentekenFormatted}</span>
          <div>
            <div className="text-lg font-semibold text-white">{name}</div>
            <div className="text-sm text-muted">{[v.inrichting, v.kleur && cap(v.kleur)].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        <SourceBadge tone={data.dataSource === "rdw" ? "live" : "demo"}>{data.dataSource === "rdw" ? "RDW Open Data live" : "Luuk-model (demo)"}</SourceBadge>
      </motion.div>

      {/* Het Grote Prijskaartje */}
      <motion.section variants={rise} className="panel relative overflow-hidden rounded-3xl px-6 py-10 text-center sm:py-14">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/15 blur-3xl" />
        <div className="relative text-xs font-semibold uppercase tracking-[0.25em] text-muted">Dagwaarde volgens Luuk</div>
        <AnimatedNumber
          value={val.currentValue}
          format={formatEuro}
          duration={2}
          className="price-glow relative mt-3 block font-mono text-[3.6rem] font-black leading-none tracking-tighter text-cyan sm:text-[8.5rem]"
        />
        <div className="relative mx-auto mt-6 flex max-w-lg flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>
            Nieuw <span className="font-mono text-white">{formatEuro(val.originalPrice)}</span>
          </span>
          <span className="text-white/20">→</span>
          <span>
            nog <span className="font-mono text-white">{formatPercent(val.retainedPercentage, 0)}</span> over
          </span>
          <span className="text-white/20">·</span>
          <span className="text-white/50">{PRICE_SOURCE_LABEL[data.priceSource]}</span>
        </div>
        <div className="relative mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-black/30 px-4 py-2 font-mono text-xs text-white/60 sm:text-sm">
          V = {formatEuro(val.originalPrice)} × (1 − {val.depreciationRate.toFixed(2)})
          <sup className="-ml-1.5">{val.ageYears.toFixed(1)}</sup> = <span className="text-cyan">{formatEuro(val.currentValue)}</span>
        </div>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <ResultCard title="Voertuig specs" icon={<Car className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Merk" value={<span className="font-sans">{cap(v.merk)}</span>} />
            <Stat label="Model" value={<span className="font-sans">{model || "—"}</span>} />
            <Stat label="Bouwjaar" value={v.bouwjaar ?? "—"} sub={`${val.ageYears.toFixed(1).replace(".", ",")} jaar oud`} />
            <Stat label="Brandstof" value={<span className="font-sans text-xl">{v.brandstof ?? "Onbekend"}</span>} />
            <Stat label="Vermogen" value={v.vermogenKw ? `${v.vermogenKw} kW` : "—"} sub={pk ? `${pk} pk` : undefined} />
            <Stat
              label="APK tot"
              value={apk ? apk.toLocaleDateString("nl-NL", { month: "short", year: "numeric" }) : "—"}
              sub={v.massaRijklaar ? `${formatNumber(v.massaRijklaar)} kg rijklaar` : undefined}
            />
          </div>
        </ResultCard>

        <ResultCard title="Afschrijving" icon={<TrendingDown className="h-3.5 w-3.5" />}>
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted">Verdampt</div>
              <AnimatedNumber value={val.totalDepreciation} format={formatEuro} delay={0.3} className="mt-1 block font-mono text-4xl font-bold tracking-tight text-white" />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-xs text-muted">
                <span>Restwaarde</span>
                <span>{formatPercent(val.retainedPercentage, 0)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: `${val.retainedPercentage}%` }}
                  transition={{ delay: 0.5, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan to-neon"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-neon/20 bg-neon/[0.06] p-4">
              <Gauge className="h-5 w-5 shrink-0 text-neon" />
              <div className="text-sm">
                <div className="text-muted">Maximaal bod</div>
                <div className="font-mono text-xl font-semibold text-neon">{formatEuro(data.maxBid)}</div>
              </div>
            </div>
          </div>
        </ResultCard>
      </div>

      <LuukVerdict title="Luuk's Commentaar" text={data.verdict} source={data.verdictSource} />
      <ActionBar report={carReport(data)} />
    </ResultStack>
  );
}

function cap(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w) => (/\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");
}

/** RDW zet het merk soms voor de handelsbenaming ("VOLKSWAGEN GOLF"). */
function modelName(merk: string, handelsbenaming: string): string {
  const upper = handelsbenaming.toUpperCase();
  return cap(upper.startsWith(merk.toUpperCase()) ? handelsbenaming.slice(merk.length).trim() : handelsbenaming);
}
