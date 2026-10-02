"use client";

import { motion } from "framer-motion";
import { Check, Globe, ListChecks, Timer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { LuukMessage, Thinking } from "@/components/LuukMessage";
import { LuukVerdict } from "@/components/LuukVerdict";
import { PageHero } from "@/components/PageHero";
import { ResultCard, ResultStack, SourceBadge, Stat, rise } from "@/components/ResultCard";
import { SearchInput } from "@/components/SearchInput";
import type { SeoResponse } from "@/lib/types";
import { useLuuk } from "@/lib/useLuuk";
import { normalizeUrl } from "@/lib/validation";

const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")}s`;
const formatScore = (v: number) => String(Math.round(v));

export function RoastClient({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const { data, message, loading, run, setMessage } = useLuuk<SeoResponse>("/api/seo");
  const started = useRef(false);

  const submit = (q = query) => {
    const parsed = normalizeUrl(q);
    if (!parsed.ok) return setMessage(parsed.error);
    run({ url: parsed.value.href });
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
        eyebrow="Website Roast"
        title="Hoe slecht is die site?"
        subtitle="Laadtijd, mobiele score en ontbrekende meta-tags. Luuk vertelt je zonder suikerlaagje waarom je klanten lekt."
        compact={loading || !!data}
      >
        <SearchInput
          value={query}
          onValueChange={setQuery}
          onSubmit={() => submit()}
          loading={loading}
          icon={Globe}
          inputMode="url"
          autoCapitalize="none"
          autoFocus
        />
        <p className="mt-3 text-center text-xs text-white/35">Bijv. jouwconcurrent.nl</p>
      </PageHero>

      <div className="mt-8 w-full">
        <LuukMessage message={message} />
        {loading && <Thinking label="Luuk zet de site op de grill" />}
        {data && !loading && <RoastResult data={data} />}
      </div>
    </div>
  );
}

function RoastResult({ data }: { data: SeoResponse }) {
  const r = data.report;
  const passed = r.checks.filter((c) => c.pass).length;
  const scoreColor = r.mobileScore >= 90 ? "#39FF88" : r.mobileScore >= 50 ? "#00E5FF" : "#FB7185";
  const stamp =
    r.mobileScore >= 90 ? { label: "Irritant goed", tone: "good" as const } : r.mobileScore >= 50 ? { label: "Lekt", tone: "neutral" as const } : { label: "Vergiet", tone: "bad" as const };

  return (
    <ResultStack key={r.url}>
      <motion.div variants={rise} className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold text-white">{r.hostname}</div>
          <div className="truncate text-sm text-muted">{r.title ?? "Geen title-tag"}</div>
        </div>
        <SourceBadge tone={data.dataSource === "demo" ? "demo" : "live"}>
          {data.dataSource === "pagespeed" ? "Live + PageSpeed" : data.dataSource === "live" ? "Live gemeten" : "Luuk-model (demo)"}
        </SourceBadge>
      </motion.div>

      <div className="grid gap-4">
        <ResultCard title="Mobiele score" icon={<Timer className="h-3.5 w-3.5" />}>
          <div className="flex items-center gap-6">
            <ScoreRing score={r.mobileScore} color={scoreColor} />
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted">Laadtijd</div>
                <AnimatedNumber value={r.loadTimeMs} format={formatSeconds} className="block font-mono text-4xl font-bold tracking-tight text-white" />
              </div>
              <div className="text-sm text-muted">
                <span className="font-mono text-white">{r.pageSizeKb} KB</span> HTML · {r.httpStatus ?? "—"}
              </div>
            </div>
          </div>
        </ResultCard>

        <ResultCard title="SEO-basics" icon={<ListChecks className="h-3.5 w-3.5" />} aside={<span className="font-mono text-xs text-muted">{passed}/{r.checks.length} geslaagd</span>}>
          <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {r.checks.map((c, i) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                className="flex items-center gap-2.5 text-sm"
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${c.pass ? "bg-neon/15 text-neon" : "bg-rose-400/15 text-rose-300"}`}>
                  {c.pass ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="text-white/85">{c.label}</span>
                <span className="ml-auto truncate text-xs text-white/35">{c.detail}</span>
              </motion.li>
            ))}
          </ul>
        </ResultCard>
      </div>

      <motion.div variants={rise} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="H1-tags" value={r.h1Count} accent={r.h1Count === 1} />
        <Stat label="Afbeeldingen" value={r.imageCount} sub={`${r.imagesWithoutAlt} zonder alt`} />
        <Stat label="Title" value={r.title?.length ?? 0} sub="tekens (10–65)" />
        <Stat label="Description" value={r.metaDescription?.length ?? 0} sub="tekens (50–165)" />
      </motion.div>

      <LuukVerdict title="Luuk's Roast" text={data.verdict} source={data.verdictSource} stamp={stamp} />
    </ResultStack>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="7" />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedNumber value={score} format={formatScore} className="font-mono text-4xl font-bold" />
        <span className="text-[10px] uppercase tracking-widest text-muted">/ 100</span>
      </div>
    </div>
  );
}
