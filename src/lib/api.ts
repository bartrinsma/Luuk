import type { LuukErrorResponse } from "@/lib/types";

/** Server-side helpers voor route handlers. */

export function luukError(message: string, status = 422): Response {
  return Response.json({ luukError: message } satisfies LuukErrorResponse, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const GARBLED_REQUEST = "Daar kon ik geen chocola van maken. Stuur me iets dat op een vraag lijkt. Sí.";
export const OOPS =
  "Even een kortsluiting in m'n superbrein. Gebeurt eens per eeuw — en jij was de gelukkige. Probeer het nog een keer. Sí.";
