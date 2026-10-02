"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Building2, Car, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LuukMessage, Thinking } from "@/components/LuukMessage";
import { PageHero } from "@/components/PageHero";
import { ResultStack, rise } from "@/components/ResultCard";
import { SearchInput } from "@/components/SearchInput";
import type { ChatResponse } from "@/lib/types";
import { useLuuk } from "@/lib/useLuuk";

const EXAMPLES = [
  "Wat is een eerlijke prijs per m² in Utrecht?",
  "Is goud een goede investering?",
  "Hoeveel scheelt 0,5% hypotheekrente?",
  "Wie ben jij eigenlijk?",
];

const SUGGESTIONS = {
  autos: { href: "/autos", label: "Waardeer dit kenteken", icon: Car },
  huizen: { href: "/huizen", label: "Taxeer dit adres", icon: Building2 },
  roast: { href: "/roast", label: "Roast deze website", icon: Flame },
} as const;

export function HomeClient({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [asked, setAsked] = useState("");
  const { data, message, loading, run } = useLuuk<ChatResponse>("/api/chat");
  const started = useRef(false);

  const ask = (q: string = query) => {
    if (!q.trim()) return;
    setAsked(q.trim());
    run({ query: q.trim() });
  };

  useEffect(() => {
    if (initialQuery && !started.current) {
      started.current = true;
      ask(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasResult = loading || !!data || !!message;
  const suggestion = data?.suggestion ? SUGGESTIONS[data.suggestion] : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 sm:px-6">
      <PageHero
        eyebrow="De Alles-Weter"
        title={
          <>
            Ask Luuk? <span className="text-cyan [-webkit-text-fill-color:currentColor]">Sí!</span>
          </>
        }
        subtitle="Eén vraag. Eén antwoord. Geen omwegen. Zeker niet als het over geld gaat."
        compact={hasResult}
      >
        <SearchInput value={query} onValueChange={setQuery} onSubmit={() => ask()} loading={loading} autoFocus />
        {!hasResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-5 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setQuery(ex);
                  ask(ex);
                }}
                className="rounded-full border border-ink/[0.08] bg-ink/[0.02] px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-cyan/30 hover:text-ink"
              >
                {ex}
              </button>
            ))}
          </motion.div>
        )}
      </PageHero>

      <div className="mt-8 w-full">
        <LuukMessage message={message} />
        {loading && <Thinking label="Luuk denkt na" />}
        {data && !loading && (
          <ResultStack key={asked}>
            <motion.p variants={rise} className="px-1 text-sm text-ink/40">
              {asked}
            </motion.p>
            <motion.section variants={rise} className="panel rounded-3xl p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan font-black text-white shadow-[0_0_24px_-4px_rgb(14_165_233/0.45)]">
                  L
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-ink">Luuk</div>
                  <div className="text-xs text-muted">{data.source === "mock" ? "demo-modus" : "live"}</div>
                </div>
              </div>
              <TypedAnswer text={data.answer} />
            </motion.section>
            {suggestion && (
              <motion.div variants={rise}>
                <Link
                  href={`${suggestion.href}?q=${encodeURIComponent(asked)}`}
                  className="group flex items-center justify-between rounded-2xl border border-cyan/25 bg-cyan/[0.06] px-5 py-4 text-cyan-ink transition-colors hover:bg-cyan/[0.12]"
                >
                  <span className="flex items-center gap-3 font-medium">
                    <suggestion.icon className="h-5 w-5" />
                    {suggestion.label}
                  </span>
                  <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            )}
          </ResultStack>
        )}
        {!hasResult && <ModuleGrid />}
      </div>
    </div>
  );
}

/** Woord-voor-woord fade-in: voelt als denken, leest als zekerheid. */
function TypedAnswer({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  return (
    <p className="whitespace-pre-line text-lg leading-relaxed text-ink/90 sm:text-xl">
      {words.map((w, i) => (
        <motion.span key={i} initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ delay: i * 0.012, duration: 0.3 }}>
          {w}
        </motion.span>
      ))}
    </p>
  );
}

const MODULES = [
  { href: "/huizen", icon: Building2, title: "Huizen", text: "WOZ, bouwjaar, m² en maandlasten. Plus: koopje of miskoop?" },
  { href: "/autos", icon: Car, title: "Auto's", text: "Kenteken erin, dagwaarde eruit. Live uit het RDW-register." },
  { href: "/roast", icon: Flame, title: "Roast", text: "Laadtijd, SEO en meta-tags. Luuk vertelt waarom je klanten lekt." },
];

function ModuleGrid() {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.45 } } }}
      className="mt-16 grid gap-3 sm:grid-cols-3"
    >
      {MODULES.map(({ href, icon: Icon, title, text }) => (
        <motion.div key={href} variants={rise}>
          <Link href={href} className="panel group flex h-full flex-col rounded-2xl p-5 transition-colors hover:border-cyan/25">
            <div className="mb-4 flex items-center justify-between">
              <Icon className="h-5 w-5 text-cyan" />
              <ArrowUpRight className="h-4 w-4 text-ink/20 transition-colors group-hover:text-cyan" />
            </div>
            <div className="font-semibold text-ink">{title}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
          </Link>
        </motion.div>
      ))}
      <motion.p variants={rise} className="col-span-full mt-4 flex items-center justify-center gap-2 text-xs text-ink/30">
        <Sparkles className="h-3.5 w-3.5" /> Tip: plak een kenteken, postcode of URL hierboven — Luuk stuurt je door.
      </motion.p>
    </motion.div>
  );
}
