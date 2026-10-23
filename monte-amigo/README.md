# Monte Amigo – website

Statische nabouw van de voorkant van monte-amigo.nl (zonder WordPress). Gewone HTML/CSS/JS:
upload de inhoud van deze map naar elke webhost (of Netlify met publish-map `monte-amigo`).
De URL's zijn hetzelfde als op de oude site (`/over-ons/`, `/reserveren/`, enz.).

## Pagina's
| Pad | Inhoud |
| --- | --- |
| `/` | Home: video, welkomsttekst, registratienummers |
| `/over-ons/` | Vakantiehuis: beschrijving + fotogalerij (met vergroting) |
| `/tarieven/` | Tarieventabel + voorwaarden |
| `/agenda/` | Beschikbaarheidskalender |
| `/reserveren/` | Reserveringsformulier |
| `/recensies/` | Recensies van gasten |
| `/een-homepage-sectie/` | Wat te doen in de omgeving (in het menu: "Omgeving") |

## Zelf bijwerken
Alles staat in **`assets/data.js`**:
- `bookings`: bezette periodes (`van` = aankomstdag, `tot` = vertrekdag). De agenda en het formulier lezen dit.
- `rates`: prijzen per maand (gebruikt voor de prijsindicatie in het formulier). De tabel op `/tarieven/` staat los in de HTML; pas die ook aan.
- `formEndpoint`: optioneel. Leeg = het formulier opent een vooringevulde e-mail naar `rentalmonteamigo@gmail.com`.
  Vul een URL in van een formulierdienst (bijv. Formspree) die een JSON-POST accepteert, dan wordt het formulier direct verstuurd.

## Verbeteringen ten opzichte van het origineel
- **Agenda**: eigen kalender in plaats van een externe widget: wisseldagen, weeknummers, vorige dagen grijs, bladeren.
  Klik op een aankomst- en vertrekdatum en ga direct door naar het formulier met de datums al ingevuld.
- **Formulier**: aantal gasten, keuze van datums in de kalender, controle op bezette nachten, minimaal 2 nachten,
  melding bij meer dan 10 nachten en bij juli/augustus niet zaterdag–zaterdag, live prijsindicatie
  (weektarief + nachten + €125 schoonmaak, borg apart), duidelijke foutmeldingen, spamfilter (honeypot).
- Fotogalerij met vergroting (pijltjes, swipe, Esc), gemiddelde score bij de recensies,
  huidige maand gemarkeerd in de tarieventabel, beschrijvingen voor zoekmachines en alt-teksten bij foto's.

## Nog te doen
- **Foto's**: `img/` bevat uitsneden uit schermafbeeldingen, omdat monte-amigo.nl vanuit de bouwomgeving niet
  bereikbaar was. Vervang ze door de originele bestanden met **dezelfde bestandsnaam** voor scherpere foto's.
- **Video**: zet de homepagevideo neer als `video/monte-amigo.mp4`. Zolang het bestand ontbreekt, wordt het videoblok verborgen.
