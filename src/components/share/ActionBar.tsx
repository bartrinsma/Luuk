"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, Loader2, Mail, MessageCircle, Send, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { rise } from "@/components/ResultCard";
import { shareUrl, whatsappText, whatsappUrl, type ShareReport } from "@/lib/report";
import type { EmailShareResponse, LuukErrorResponse } from "@/lib/types";
import { useToast } from "./Toast";

type ActionState = "idle" | "busy" | "done";
type ActionId = "pdf" | "mail" | "whatsapp";

/** "Export & Share": PDF, e-mail en WhatsApp onder elke resultatenkaart. */
export function ActionBar({ report }: { report: ShareReport }) {
  const toast = useToast();
  const [state, setState] = useState<Record<ActionId, ActionState>>({ pdf: "idle", mail: "idle", whatsapp: "idle" });
  const [mailOpen, setMailOpen] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const set = (id: ActionId, s: ActionState) => setState((prev) => ({ ...prev, [id]: s }));
  const flash = (id: ActionId) => {
    set(id, "done");
    timers.current.push(setTimeout(() => set(id, "idle"), 2200));
  };
  const url = () => shareUrl(window.location.origin, report);

  const downloadPdf = async () => {
    set("pdf", "busy");
    try {
      // Lazy: de PDF-engine (~1 MB) laadt pas bij de eerste klik.
      const [{ pdf }, { ReportPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./ReportPdf")]);
      const blob = await pdf(<ReportPdf report={report} url={url()} generatedAt={new Date()} />).toBlob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `luuk-si-${slug(report.subject)}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      flash("pdf");
      toast("Rapport gedownload. De waarheid op papier. Sí.");
    } catch (err) {
      console.error(err);
      set("pdf", "idle");
      toast("De drukpers hapert. Probeer het nog een keer. Sí.", "info");
    }
  };

  const shareWhatsapp = () => {
    window.open(whatsappUrl(whatsappText(report, url())), "_blank", "noopener,noreferrer");
    flash("whatsapp");
    toast("Doorgestuurd naar WhatsApp. Luuk out.");
  };

  return (
    <motion.div variants={rise} className="flex flex-col gap-3">
      <div className="panel flex flex-col gap-3 rounded-3xl p-3 sm:flex-row sm:items-center sm:justify-between sm:p-2 sm:pl-5">
        <span className="px-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted sm:px-0 sm:pt-0">Export & Share</span>
        <div className="flex flex-wrap gap-2">
          <ActionPill icon={Download} state={state.pdf} onClick={downloadPdf}>
            Download PDF
          </ActionPill>
          <ActionPill icon={Mail} state={state.mail} active={mailOpen} onClick={() => setMailOpen((o) => !o)}>
            Stuur naar jezelf (of je partner)
          </ActionPill>
          <ActionPill icon={MessageCircle} state={state.whatsapp} onClick={shareWhatsapp} tone="whatsapp">
            WhatsApp
          </ActionPill>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mailOpen && (
          <EmailPanel
            report={report}
            onClose={() => setMailOpen(false)}
            onBusy={(busy) => set("mail", busy ? "busy" : "idle")}
            onSent={(preview) => {
              setMailOpen(false);
              flash("mail");
              toast(preview ? "Demo-modus: mail klaargezet, niet echt verstuurd (geen RESEND_API_KEY). Luuk out." : "Verzonden. Luuk out.", preview ? "info" : "success");
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActionPill({
  icon: Icon,
  state,
  onClick,
  children,
  active,
  tone = "default",
}: {
  icon: LucideIcon;
  state: ActionState;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  tone?: "default" | "whatsapp";
}) {
  const done = state === "done";
  const base =
    tone === "whatsapp"
      ? "border-emerald-400/20 text-emerald-600 hover:border-emerald-400/40 hover:bg-emerald-400/10"
      : `border-ink/10 text-ink/85 hover:border-cyan/40 hover:text-ink ${active ? "border-cyan/40 bg-cyan/10 text-ink" : ""}`;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={state === "busy"}
      whileTap={{ scale: 0.96 }}
      animate={done ? { boxShadow: ["0 0 0 0 rgb(16 185 129 / 0)", "0 0 28px 2px rgb(16 185 129 / 0.45)", "0 0 0 0 rgb(16 185 129 / 0)"] } : {}}
      transition={{ duration: 1.4 }}
      className={`glass flex h-11 items-center gap-2 rounded-full! px-4 text-sm font-medium transition-colors disabled:opacity-60 ${
        done ? "border-neon/50! text-neon!" : base
      }`}
    >
      {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
      {children}
    </motion.button>
  );
}

function EmailPanel({
  report,
  onClose,
  onBusy,
  onSent,
}: {
  report: ShareReport;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
  onSent: (preview: boolean) => void;
}) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S{2,}$/.test(to.trim())) {
      setError("Dat e-mailadres klopt niet. Zelfs een postduif heeft een adres nodig. Sí.");
      return;
    }
    setBusy(true);
    onBusy(true);
    try {
      const res = await fetch("/api/share/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: report.kind, query: report.query, to: to.trim(), message }),
      });
      const json = (await res.json().catch(() => null)) as (EmailShareResponse & Partial<LuukErrorResponse>) | null;
      if (!res.ok || !json || json.luukError) {
        setError(json?.luukError ?? "De postbode is even zoek. Probeer het zo nog eens. Sí.");
        onBusy(false);
      } else {
        onSent(json.status === "preview");
      }
    } catch {
      setError("Geen verbinding. Zelfs ik kan niet mailen zonder internet. Sí.");
      onBusy(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) send();
      }}
      className="overflow-hidden"
    >
      <div className="panel flex flex-col gap-3 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-ink">Stuur deze analyse per e-mail</div>
          <button type="button" onClick={onClose} aria-label="Sluiten" className="rounded-full p-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">Ontvanger e-mail</span>
          <input
            type="email"
            required
            autoFocus
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="jij@voorbeeld.nl"
            className="h-11 rounded-xl border border-ink/10 bg-ink/[0.03] px-3.5 text-ink placeholder:text-ink/30 focus:border-cyan/50 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">Optioneel bericht</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="Schat, moeten we dit doen?"
            className="resize-none rounded-xl border border-ink/10 bg-ink/[0.03] px-3.5 py-2.5 text-ink placeholder:text-ink/30 focus:border-cyan/50 focus:outline-none"
          />
        </label>
        {error && <p className="text-sm text-ink/80">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy || !to.trim()}
            className="flex h-11 items-center gap-2 rounded-full bg-cyan px-5 font-semibold text-white transition-shadow hover:shadow-[0_0_28px_-4px_rgb(14_165_233/0.5)] disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Versturen
          </button>
        </div>
      </div>
    </motion.form>
  );
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
