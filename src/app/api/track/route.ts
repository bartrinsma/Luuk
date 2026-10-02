import { track } from "@/lib/analytics/track";
import { readJson } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/track { action: "pdf" | "whatsapp", kind, subject }
 * Voor acties die alleen in de browser gebeuren. Strikte whitelist, geen vrije velden.
 */
const ACTIONS = new Set(["pdf", "whatsapp"]);
const KINDS = new Set(["huis", "auto", "website"]);

export async function POST(request: Request) {
  const body = await readJson(request);
  const action = body?.action;
  const kind = body?.kind;
  const subject = typeof body?.subject === "string" ? body.subject.slice(0, 200) : null;

  if (typeof action !== "string" || !ACTIONS.has(action) || typeof kind !== "string" || !KINDS.has(kind)) return new Response(null, { status: 204 });
  if (!rateLimit(`track:${clientIp(request)}`, 60)) return new Response(null, { status: 204 });

  track(request, { module: "share", action: action as "pdf" | "whatsapp", subject, meta: { kind } });
  return new Response(null, { status: 204 });
}
