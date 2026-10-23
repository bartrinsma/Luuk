import { addDays, nightsBetween } from "./dates";

export const CONTACT_EMAIL = "rentalmonteamigo@gmail.com";
export const MAX_GUESTS = 5;
export const MIN_NIGHTS = 2;
export const MAX_NIGHTS = 10;
export const CLEANING_FEE = 125;
export const DEPOSIT = 200;

/** Prijs per week en per nacht, januari t/m december. */
export const RATES = [
  { month: "Januari", week: 665, night: 95 },
  { month: "Februari", week: 665, night: 95 },
  { month: "Maart", week: 665, night: 95 },
  { month: "April", week: 735, night: 105 },
  { month: "Mei", week: 735, night: 105 },
  { month: "Juni", week: 840, night: 120 },
  { month: "Juli", week: 945, night: 140 },
  { month: "Augustus", week: 945, night: 140 },
  { month: "September", week: 840, night: 120 },
  { month: "Oktober", week: 840, night: 120 },
  { month: "November", week: 665, night: 95 },
  { month: "December", week: 665, night: 95 },
];

/** Hele weken tegen weektarief (maand van de eerste nacht van die week), de rest per nacht. */
export function priceFor(a: Date, b: Date) {
  const nights = nightsBetween(a, b);
  let stay = 0;
  let d = a;
  let left = nights;
  while (left >= 7) {
    stay += RATES[d.getMonth()].week;
    d = addDays(d, 7);
    left -= 7;
  }
  while (left > 0) {
    stay += RATES[d.getMonth()].night;
    d = addDays(d, 1);
    left -= 1;
  }
  return { nights, stay, cleaning: CLEANING_FEE, deposit: DEPOSIT, total: stay + CLEANING_FEE };
}

export const euro = (v: number) => "€" + v.toLocaleString("nl-NL");
