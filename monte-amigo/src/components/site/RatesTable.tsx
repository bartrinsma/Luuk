"use client";

import { RATES } from "@/lib/rates";
import { useToday } from "@/lib/useClient";

/** Tarieventabel; de huidige maand wordt na het laden gemarkeerd. */
export function RatesTable() {
  const month = useToday()?.getMonth() ?? -1;

  return (
    <table className="rates">
      <thead>
        <tr>
          <th scope="col">Maand</th>
          <th scope="col">Prijs per week</th>
          <th scope="col">Prijs per nacht</th>
        </tr>
      </thead>
      <tbody>
        {RATES.map((r, i) => (
          <tr key={r.month} className={i === month ? "is-current" : undefined}>
            <td>{r.month}</td>
            <td>€{r.week}</td>
            <td>€{r.night}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
