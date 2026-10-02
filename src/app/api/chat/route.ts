import { generateLuuk } from "@/lib/ai/llm";
import { mockChat } from "@/lib/ai/mockLuuk";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { GARBLED_REQUEST, luukError, OOPS, readJson } from "@/lib/api";
import type { ChatResponse } from "@/lib/types";
import { detectIntent } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return luukError(GARBLED_REQUEST, 400);
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) return luukError("Een lege vraag. Het antwoord is dus ook leeg. Probeer het met woorden. Sí.");
  if (query.length > 2000) return luukError("Dat is geen vraag, dat is een scriptie. Kort het in tot de kern. Sí.");

  try {
    const { text, source } = await generateLuuk({
      system: CHAT_SYSTEM_PROMPT,
      user: query,
      fallback: () => mockChat(query),
    });
    return Response.json({ answer: text, source, suggestion: detectIntent(query) } satisfies ChatResponse);
  } catch (err) {
    console.error("[api/chat]", err);
    return luukError(OOPS, 500);
  }
}
