import "server-only";

/** Melding naar de eigenaar via Resend (REST). Zonder RESEND_API_KEY gebeurt er niets. */
export async function notifyOwner(subject: string, text: string, replyTo?: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL || "rentalmonteamigo@gmail.com";
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Monte Amigo <onboarding@resend.dev>",
        to: [to],
        subject,
        text,
        reply_to: replyTo,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Een mislukte melding mag de aanvraag zelf niet laten mislukken; die staat al in de database.
  }
}
