# Monte Amigo – website + beheer

Nabouw van monte-amigo.nl als Next.js-app, met een eigen beheeromgeving op `/admin`.
Losse app in deze map (eigen `package.json`); los van Luuk.si in de rest van de repo.

```bash
cd monte-amigo
npm install
cp .env.example .env.local   # zet minimaal ADMIN_PASSWORD
npm run dev                  # http://localhost:3000
```

## Website
| Pad | Inhoud |
| --- | --- |
| `/` | Home: video, welkomsttekst, registratienummers |
| `/over-ons/` | Vakantiehuis: beschrijving + fotogalerij (met vergroting) |
| `/tarieven/` | Tarieventabel + voorwaarden |
| `/agenda/` | Beschikbaarheid (uit de database) |
| `/reserveren/` | Reserveringsformulier; aanvragen komen in de admin terecht |
| `/recensies/` | Recensies (uit de database) |
| `/een-homepage-sectie/` | Wat te doen in de omgeving (in het menu: "Omgeving") |

## Beheer (`/admin`)
Inloggen met `ADMIN_PASSWORD`.

- **Dashboard**: open aanvragen, komende verblijven, bezetting komende 90 dagen, recensies.
- **Boekingen**: aanvragen van de website bevestigen of afwijzen, zelf periodes toevoegen
  (bevestigd of geblokkeerd), wijzigen en verwijderen. Alleen *bevestigd* en *geblokkeerd* maken de agenda bezet.
  Overlappende periodes worden geweigerd.
- **Recensies**: toevoegen, wijzigen, verbergen/tonen en verwijderen. De 23 recensies van de oude site
  staan er bij de eerste start al in.
- **Bugs melden** (`/admin/bug`): bug invoeren; die wordt automatisch een ticket op de to-do lijst in
  tickets.onlinemetbart.nl. Mislukt doorsturen, dan blijft de bug bewaard met een knop "Opnieuw doorsturen".
- **Instellingen**: adres + API-sleutel van het ticketsysteem, automatisch doorsturen aan/uit, verbinding testen.

## Koppeling met tickets.onlinemetbart.nl
1. In het ticketsysteem: voer `supabase/migrations/0003_api_keys.sql` uit, open de klant en kies
   **API-koppeling → Nieuwe sleutel**.
2. Hier: **Instellingen** → plak de sleutel → **Verbinding testen**.

Elke bug wordt `POST /api/v1/tickets` met titel "Bug: …", de beschrijving, verwachting, pagina en prioriteit.
`external_ref` (`monte-amigo-bug-<id>`) voorkomt dubbele tickets bij opnieuw versturen.
Voor een andere klantsite: dezelfde code met de API-sleutel van die klant.

## Omgevingsvariabelen
Zie `.env.example`. Belangrijk voor productie:
- `ADMIN_PASSWORD`: zonder dit staat `/admin` dicht.
- `DATABASE_URL` (of Netlify DB): blijvende Postgres. Zonder database-URL draait PGlite; dat is lokaal prima,
  maar op serverless hosting **niet blijvend**. De admin waarschuwt hiervoor.
- `RESEND_API_KEY` + `NOTIFY_EMAIL`: e-mail bij een nieuwe reserveringsaanvraag (optioneel).

## Netlify
Nieuwe site uit deze repo met **Base directory** `monte-amigo`; `netlify.toml` regelt de rest.

## Nog te doen
- **Foto's**: `public/img/` bevat uitsneden uit schermafbeeldingen, omdat monte-amigo.nl vanuit de bouwomgeving
  niet bereikbaar was. Vervang ze door de originele bestanden met **dezelfde bestandsnaam**.
- **Video**: zet de homepagevideo neer als `public/video/monte-amigo.mp4`. Zolang die ontbreekt, wordt het
  videoblok verborgen.
- Tarieven staan in `src/lib/rates.ts` (tabel en prijsindicatie gebruiken dezelfde gegevens).
