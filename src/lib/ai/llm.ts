import Anthropic from "@anthropic-ai/sdk";

/**
 * Eén ingang voor alle LLM-calls. Provider-keuze:
 *  LUUK_AI_PROVIDER = "anthropic" | "openai" | "mock"
 *  (niet gezet → anthropic als ANTHROPIC_API_KEY bestaat, anders openai als OPENAI_API_KEY bestaat, anders mock)
 * Elke fout valt terug op de meegegeven mock-tekst. Luuk zwijgt nooit.
 */

export type LuukSource = "ai" | "mock";

export interface LuukResponse {
  text: string;
  source: LuukSource;
}

interface GenerateOptions {
  system: string;
  user: string;
  /** Wordt gebruikt als er geen provider is of als de call faalt. */
  fallback: () => string;
  maxTokens?: number;
}

type Provider = "anthropic" | "openai" | "mock";

function resolveProvider(): Provider {
  const explicit = process.env.LUUK_AI_PROVIDER?.toLowerCase();
  if (explicit === "anthropic" || explicit === "openai" || explicit === "mock") return explicit;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export function aiEnabled(): boolean {
  return resolveProvider() !== "mock";
}

export async function generateLuuk({ system, user, fallback, maxTokens = 1024 }: GenerateOptions): Promise<LuukResponse> {
  const provider = resolveProvider();
  try {
    const text =
      provider === "anthropic"
        ? await callAnthropic(system, user, maxTokens)
        : provider === "openai"
          ? await callOpenAI(system, user, maxTokens)
          : null;
    if (text && text.trim()) return { text: text.trim(), source: "ai" };
  } catch (err) {
    console.warn(`[llm] ${provider} faalde, Luuk improviseert:`, (err as Error).message);
  }
  return { text: fallback(), source: "mock" };
}

// ---------- Anthropic ----------

let anthropic: Anthropic | null = null;

async function callAnthropic(system: string, user: string, maxTokens: number): Promise<string | null> {
  anthropic ??= new Anthropic();
  const response = await anthropic.beta.messages.create({
    model: process.env.LUUK_ANTHROPIC_MODEL ?? "claude-opus-5-5",
    max_tokens: maxTokens,
    // Korte, stellige antwoorden: lage effort is snel en goedkoop.
    output_config: { effort: "low" },
    // Bij een safety-refusal herhaalt de API het verzoek automatisch op een geschikt fallback-model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: user }],
  });

  if (response.stop_reason === "refusal") return null;
  return response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

// ---------- OpenAI (optioneel, via REST) ----------

async function callOpenAI(system: string, user: string, maxTokens: number): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.LUUK_OPENAI_MODEL ?? "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? null;
}
