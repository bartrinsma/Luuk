const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eurCents = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

export const formatEuro = (v: number) => eur.format(v);
export const formatEuroCents = (v: number) => eurCents.format(v);
export const formatNumber = (v: number) => num.format(v);
export const formatPercent = (v: number, digits = 1) => `${v.toFixed(digits).replace(".", ",")}%`;

/** "€450k" — voor in Luuk's teksten. */
export function formatEuroShort(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(2).replace(".", ",")} mln`;
  if (v >= 10_000) return `€${Math.round(v / 1000)}k`;
  return formatEuro(v);
}
