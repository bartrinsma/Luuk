import { Resend } from "resend";
import { analyzeCarRequest, analyzeHouseRequest, analyzeSeoRequest } from "@/lib/analyses";
import { luukError, OOPS, readJson } from "@/lib/api";
import type { EmailShareResponse } from "@/lib/types";
import { renderReportEmail } from "@/lib/email";
import { carReport, houseReport, seoReport, shareUrl, type ReportKind, type ShareReport } from "@/lib/report";
import { isValidKenteken, kentekenError, normalizeUrl, parseAddressQuery } from "@/lib/validation";

/**
 * POST /api/share/email { kind, query, to, message? }
 *
 * De client stuurt alleen de zoekopdracht mee, niet de cijfers: de server draait de analyse
 * opnieuw en bouwt de mail zelf. Zo kan niemand deze route misbruiken om willekeurige
 * inhoud uit naam van Luuk.si te versturen. Alleen het optionele bericht is vrije tekst (ge-escaped, max 500 tekens).
 */

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const MAX_MESSAGE = 500;

export async function POST(request: Request) {
  const body = await readJson(request);
  const kind = body?.kind;
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";

  if (kind !== "huis" && kind !== "auto" && kind !== "website")
    return luukError("Ik weet niet wát ik moet versturen. Doe eerst een analyse, dan regel ik de rest. Sí.");
  if (!EMAIL_RE.test(to) || to.length > 254)
    return luukError("Dat e-mailadres klopt niet. Zelfs een postduif heeft een adres nodig. Probeer het opnieuw. Sí.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`ip:${ip}`, 5) || !rateLimit(`to:${to.toLowerCase()}`, 3))
    return luukError("Rustig aan. Je hebt net al een paar mails verstuurd. Over tien minuten mag het weer. Sí.", 429);

  try {
    const report = await rebuildReport(kind, query);
    if (typeof report === "string") return luukError(report);

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const { subject, html, text } = renderReportEmail(report, shareUrl(origin, report), message || undefined);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Demo-modus: niets versturen, wel laten zien dat de keten werkt.
      console.info(`[share/email] demo-modus (geen RESEND_API_KEY) — zou "${subject}" sturen naar ${to}`);
      return Response.json({ status: "preview" } satisfies EmailShareResponse);
    }

    const { data, error } = await new Resend(apiKey).emails.send({
      from: process.env.RESEND_FROM || "Luuk.si <onboarding@resend.dev>",
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[share/email] Resend:", error);
      return luukError("De postbode weigert dienst. Mijn analyse klopt, zijn bezorging niet. Probeer het zo nog eens. Sí.", 502);
    }
    return Response.json({ status: "sent", id: data?.id ?? null } satisfies EmailShareResponse);
  } catch (err) {
    console.error("[share/email]", err);
    return luukError(OOPS, 500);
  }
}

async function rebuildReport(kind: ReportKind, query: string): Promise<ShareReport | string> {
  if (kind === "auto") {
    if (!isValidKenteken(query)) return kentekenError(query);
    const car = await analyzeCarRequest(query);
    return car ? carReport(car) : "Dit kenteken bestaat niet in het RDW-register. Niks te versturen. Sí.";
  }
  if (kind === "huis") {
    const parsed = parseAddressQuery(query);
    return parsed.ok ? houseReport(await analyzeHouseRequest(parsed.value)) : parsed.error;
  }
  const url = normalizeUrl(query);
  return url.ok ? seoReport(await analyzeSeoRequest(url.value)) : url.error;
}

// ---------- Simpele in-memory rate limit (per serverinstantie) ----------

const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  return true;
}
