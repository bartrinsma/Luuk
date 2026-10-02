import { emailSubject, kindLabel, type ShareReport } from "@/lib/report";

/** Strakke, e-mailclient-proof HTML (tabellen + inline styles), in de Luuk dark mode. */
export function renderReportEmail(report: ShareReport, url: string, message?: string) {
  const e = escapeHtml;
  const facts = report.facts.slice(0, 8);

  const factRows = facts
    .map(
      (f) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #222;color:#A1A1AA;font-size:14px;">${f.ok === undefined ? "" : f.ok ? "✅ " : "❌ "}${e(f.label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #222;color:#FFFFFF;font-size:14px;font-weight:600;text-align:right;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${e(f.value)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${e(emailSubject(report))}</title></head>
<body style="margin:0;padding:0;background:#0A0A0A;">
  <div style="display:none;max-height:0;overflow:hidden;">${e(report.headline.label)}: ${e(report.headline.value)} — ${e(report.verdict.slice(0, 120))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;">
        <tr><td style="padding:0 4px 24px;">
          <span style="font-size:26px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">Luuk<span style="color:#00E5FF;">.si</span></span>
          <span style="float:right;margin-top:10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#00E5FF;">${e(kindLabel(report.kind))}</span>
        </td></tr>

        ${
          message
            ? `<tr><td style="padding:0 0 16px;">
          <div style="background:#141414;border:1px solid #262626;border-radius:16px;padding:16px 18px;color:#D4D4D8;font-size:15px;line-height:1.5;">
            <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#71717A;margin-bottom:6px;">Persoonlijk bericht</div>
            ${e(message).replace(/\n/g, "<br>")}
          </div></td></tr>`
            : ""
        }

        <tr><td style="background:#111111;border:1px solid #262626;border-radius:24px;padding:28px;">
          <div style="font-size:18px;font-weight:600;color:#FFFFFF;">${e(report.subject)}</div>
          <div style="font-size:14px;color:#A1A1AA;margin-top:4px;">${e(report.subtitle)}</div>

          <div style="margin-top:24px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A1A1AA;">${e(report.headline.label)}</div>
          <div style="font-size:48px;line-height:1.1;font-weight:800;color:#00E5FF;letter-spacing:-1.5px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;margin-top:6px;">${e(report.headline.value)}</div>
          ${
            report.secondary
              ? `<div style="margin-top:10px;font-size:14px;color:#A1A1AA;">${e(report.secondary.label)}: <strong style="color:#FFFFFF;">${e(report.secondary.value)}</strong></div>`
              : ""
          }
          ${
            report.stamp
              ? `<div style="margin-top:16px;"><span style="display:inline-block;border:2px solid #00E5FF;color:#00E5FF;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${e(report.stamp)}</span></div>`
              : ""
          }

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">${factRows}</table>

          <div style="margin-top:28px;background:#0E1A1C;border:1px solid #0E4A52;border-left:4px solid #00E5FF;border-radius:16px;padding:20px;">
            <div style="font-size:13px;font-weight:700;color:#FFFFFF;margin-bottom:8px;">${e(report.verdictTitle)}</div>
            <div style="font-size:16px;line-height:1.55;color:#E4E4E7;">&ldquo;${e(report.verdict)}&rdquo;</div>
          </div>

          <div style="margin-top:28px;text-align:center;">
            <a href="${e(url)}" style="display:inline-block;background:#00E5FF;color:#0A0A0A;text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border-radius:14px;">Bekijk volledige analyse op Luuk.si</a>
          </div>
        </td></tr>

        <tr><td style="padding:20px 4px 0;text-align:center;font-size:12px;line-height:1.5;color:#52525B;">
          ${e(report.dataNote)} Indicatie, geen financieel advies.<br>
          Gegenereerd door Luuk.si - De waarheid op papier.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Luuk.si — ${kindLabel(report.kind)}`,
    report.subject,
    "",
    message ? `Bericht: ${message}\n` : null,
    `${report.headline.label}: ${report.headline.value}`,
    report.secondary ? `${report.secondary.label}: ${report.secondary.value}` : null,
    report.stamp ? `Oordeel: ${report.stamp}` : null,
    "",
    ...facts.map((f) => `${f.label}: ${f.value}`),
    "",
    `${report.verdictTitle}: "${report.verdict}"`,
    "",
    `Bekijk volledige analyse: ${url}`,
    "",
    "Gegenereerd door Luuk.si - De waarheid op papier.",
  ]
    .filter((l) => l !== null)
    .join("\n");

  return { subject: emailSubject(report), html, text };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
