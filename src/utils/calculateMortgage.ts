/**
 * Annuïteitenhypotheek:
 *   M = P × i / (1 − (1 + i)^−n)
 *  P = hoofdsom, i = maandrente (jaarrente / 12), n = aantal maanden
 */
export const DEFAULT_INTEREST_RATE = 0.042; // 4.2% — hardcoded "actuele" rente
export const DEFAULT_TERM_YEARS = 30;

export interface MortgageResult {
  principal: number;
  annualRate: number;
  termYears: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  /** Rente- en aflossingsdeel van de allereerste termijn. */
  firstMonthInterest: number;
  firstMonthPrincipal: number;
}

export function calculateMortgage(
  principal: number,
  annualRate: number = DEFAULT_INTEREST_RATE,
  termYears: number = DEFAULT_TERM_YEARS,
): MortgageResult {
  const n = termYears * 12;
  const i = annualRate / 12;

  const monthlyPayment = i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
  const totalPaid = monthlyPayment * n;
  const firstMonthInterest = principal * i;

  return {
    principal,
    annualRate,
    termYears,
    monthlyPayment: round2(monthlyPayment),
    totalPaid: round2(totalPaid),
    totalInterest: round2(totalPaid - principal),
    firstMonthInterest: round2(firstMonthInterest),
    firstMonthPrincipal: round2(monthlyPayment - firstMonthInterest),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
