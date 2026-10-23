/* Monte Amigo – gegevens die je zelf kunt bijwerken.
   Pas dit bestand aan om tarieven of bezette periodes te wijzigen;
   de agenda, de tarieventabel en het reserveringsformulier lezen hieruit. */

window.MONTE_AMIGO = {
  email: "rentalmonteamigo@gmail.com",

  /* Optioneel: URL van een formulierdienst (bijv. Formspree of een eigen endpoint)
     die een POST met JSON accepteert. Leeg = het formulier opent een
     vooringevulde e-mail naar het adres hierboven. */
  formEndpoint: "",

  maxGuests: 5,
  minNights: 2,
  maxNights: 10,
  cleaningFee: 125,
  deposit: 200,

  /* Prijs per week en per nacht, januari t/m december. */
  rates: [
    { month: "Januari",   week: 665, night: 95 },
    { month: "Februari",  week: 665, night: 95 },
    { month: "Maart",     week: 665, night: 95 },
    { month: "April",     week: 735, night: 105 },
    { month: "Mei",       week: 735, night: 105 },
    { month: "Juni",      week: 840, night: 120 },
    { month: "Juli",      week: 945, night: 140 },
    { month: "Augustus",  week: 945, night: 140 },
    { month: "September", week: 840, night: 120 },
    { month: "Oktober",   week: 840, night: 120 },
    { month: "November",  week: 665, night: 95 },
    { month: "December",  week: 665, night: 95 }
  ],

  /* Bezette periodes: van = aankomstdag, tot = vertrekdag (JJJJ-MM-DD).
     De vertrekdag is weer vrij als aankomstdag voor de volgende gast. */
  bookings: [
    { van: "2026-07-25", tot: "2026-09-03" },
    { van: "2026-09-04", tot: "2026-09-06" },
    { van: "2027-07-24", tot: "2027-08-15" },
    { van: "2027-08-27", tot: "2027-08-28" }
  ]
};
