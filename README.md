# Luuk.si — Ask Luuk? Sí!

Een minimalistische 'Super Intelligence' tool die weet wat dingen waard zijn. Huizen, auto's en websites: Luuk geeft je harde getallen en een ongezouten mening.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Framer Motion · Lucide · Anthropic SDK

```bash
npm install
cp .env.example .env.local   # optioneel — zonder keys draait alles in demo-modus
npm run dev                  # http://localhost:3000
```

## Modules

| Route | Wat het doet | Backend |
| --- | --- | --- |
| `/` | De Alles-Weter: open vragen, Luuk antwoordt. Herkent kentekens/postcodes/URL's en stuurt door. | `POST /api/chat` |
| `/huizen` | WOZ, bouwjaar, m², historische vraagprijzen, maandlasten (4,2% annuïtair, 30 jaar) en verdict "Koopje of Miskoop?". Postcode, straat + plaats **of een Funda-link**, met slimme detectie. Gevelfoto (Street View → Funda → PDOK-luchtfoto) en foto-upload met AI-beoordeling van de staat. | `POST /api/huizen`, `POST /api/huizen/fotos`, `GET /api/huizen/streetview` (+ ruwe data: `POST /api/kadaster`) |
| `/autos` | Geel kenteken-invoerveld, RDW-specs, dagwaarde via `V = P × (1 − r)^t` en Luuk's commentaar. | `POST /api/autos` (+ ruwe data: `GET /api/rdw?kenteken=`) |
| `/roast` (ook `/web`) | Laadtijd, mobiele score, meta-tags/H1/alt-checks en een harde roast. | `POST /api/seo` |

## Huizen: Funda, gevelfoto en foto-upload

- **Funda-link** — het adres wordt uit de URL zelf gehaald (werkt altijd). Daarna probeert Luuk de advertentie één keer te lezen voor vraagprijs, m², bouwjaar en hoofdfoto. Funda blokkeert geautomatiseerde verzoeken vaak; dan blijft het bij het adres uit de URL. Is de vraagprijs bekend, dan vergelijkt het verdict díe met Luuk's eerlijke prijs. Let op: check of dit past binnen de gebruiksvoorwaarden van Funda voordat je het breed inzet.
- **Gevelfoto** — Google Street View Static API via een server-proxy (`GOOGLE_MAPS_API_KEY` blijft op de server; eerst een gratis metadata-check of er beeld is). Zonder key: de Funda-foto, of een luchtfoto van PDOK (gratis, geen key). Bronnen die niet laden verdwijnen stil.
- **Foto-upload** — tot 6 foto's, in de browser verkleind tot max 1280 px JPEG (EXIF/GPS verdwijnt daarmee). Claude beoordeelt via vision de staat (structured output: score 1–10, correctie −15% … +15%, bevindingen) en de code rekent de aangepaste eerlijke prijs uit. Foto's worden niet opgeslagen. Zonder `ANTHROPIC_API_KEY`: demo-modus, eerlijk gelabeld.

## Export & Share

Onder elke analyse (huis, auto, website) staat een actiebalk:

- **Download PDF** — printklaar A4-rapport via `@react-pdf/renderer`, volledig in de browser en lazy geladen bij de eerste klik.
- **Stuur naar jezelf (of je partner)** — `POST /api/share/email` verstuurt een HTML-mail via **Resend**. De client stuurt alleen `{ kind, query, to, message }`; de server draait de analyse opnieuw en bouwt de mail zelf, zodat de route niet als open relay te misbruiken is. Rate-limit: 5 per IP en 3 per ontvanger per 10 minuten (in-memory). Zonder `RESEND_API_KEY` draait dit in demo-modus: er wordt niets verstuurd en de toast zegt dat ook.
- **WhatsApp** — `https://wa.me/?text=…` met emoji-opmaak en een deel-link (`/autos?q=…`, `/huizen?q=…`, `/roast?q=…`) die de analyse direct opnieuw draait.

Eén isomorf rapportmodel (`src/lib/report.ts`) voedt alle drie de kanalen.

## Admin & analytics (`/admin`)

Achter `ADMIN_PASSWORD` (HttpOnly-sessiecookie, 7 dagen; zonder variabele staat `/admin` dicht).

- **Dashboard** — aanvragen per onderdeel en per dag, unieke bezoekers, deel-acties, ongeldige invoer, koopje/miskoop-verdeling, piekuren, top woonplaatsen/automerken/websites. Periode: 7/30/90/365 dagen of alles.
- **Provincies** — ranglijst op *nieuwsgierigheid* (aanvragen per 100.000 inwoners, CBS 2024), absolute aanvragen en gezochte huizen per provincie, met gemiddelde WOZ en miskoop-aandeel.
- **Aanvragen** — elke ingevoerde postcode/Funda-link, elk kenteken en elke URL, met resultaat en status. Filters op onderdeel, status, provincie, periode en zoekterm; CSV-export (Excel-klaar).
- **Blog-inzichten** — automatisch geschreven feitjes in Luuk's toon ("De Utrechters zijn het nieuwsgierigst…") met onderbouwing en een *te weinig data*-label, klaar om te kopiëren.

**Hoe er gemeten wordt.** Elke API-route logt na het antwoord (`next/server` `after`) één event in `luuk_events`. Er wordt geen IP-adres en geen e-mailadres opgeslagen; bezoekers worden geteld met een dagelijks wisselende hash (zoals Plausible). De *bezoekersprovincie* komt uit de geo-header van Netlify (`x-nf-geo`) en werkt dus alleen live; de *woningprovincie* uit PDOK of de postcode. Let op: kentekens en adressen die bezoekers invoeren worden wél bewaard — vermeld dat in je privacyverklaring.

**Opslag.** Zet `DATABASE_URL` (of gebruik Netlify DB, dat `NETLIFY_DATABASE_URL` zet). Zonder database gebruikt Luuk PGlite: lokaal in `.data/pglite`, op serverless in `/tmp` — dat laatste is **niet blijvend**, het dashboard waarschuwt daarvoor.

## Architectuur

```
src/
├─ app/                     pagina's (server) + *Client.tsx (interactief) + api/ route handlers
├─ components/              Header, NavigationTabs, SearchInput (Omnibar), LicensePlateInput,
│                           ResultCard, AnimatedNumber, LuukVerdict, LuukMessage, Background
├─ components/share/       ActionBar, ReportPdf, Toast
├─ lib/
│  ├─ analyses.ts           volledige analyse per module (gedeeld door routes en e-mail)
│  ├─ report.ts             rapportmodel + WhatsApp-tekst + deel-links
│  ├─ email.ts              HTML/tekst-template voor de mail
│  ├─ ai/llm.ts             provider-switch (Anthropic / OpenAI / mock) met automatische fallback
│  ├─ ai/prompts.ts         system prompts — data gaat als JSON de prompt in
│  ├─ ai/mockLuuk.ts        gesimuleerde Luuk-antwoorden zolang er geen API-key is
│  ├─ services/rdw.ts       RDW Open Data (voertuigen + brandstof) met demo-fallback
│  ├─ services/kadaster.ts  externe WOZ-API → PDOK-adres → Fallback Mocking Service
│  ├─ services/seo.ts       eigen fetch + HTML-analyse, optioneel PageSpeed, SSRF-guard
│  ├─ validation.ts         kenteken-sidecodes, postcodes, adressen, URL's — met Luuk-foutmeldingen
│  └─ analysis.ts           eerlijke huizenprijs, maximaal bod op een auto
└─ utils/
   ├─ calculateCarValue.ts  exponentiële afschrijving (r = 15%)
   └─ calculateMortgage.ts  annuïteitenformule
```

### Data-principes

- **Nooit "Error fetching data".** Elke externe bron heeft een fallback. Faalt de RDW, PDOK of de AI-provider, dan levert Luuk deterministische demo-data (dezelfde input geeft altijd hetzelfde antwoord). De UI toont via een badge of data live of gemodelleerd is.
- **Getallen komen uit code, niet uit het LLM.** Dagwaarde, maandlasten en eerlijke prijs worden berekend; het LLM schrijft alleen de opinie. Alleen als de RDW geen catalogusprijs kent, schat het LLM de nieuwprijs (met sanity-check en een heuristisch vangnet).
- **Ongeldige input krijgt een Luuk-antwoord**, geen 404 of "Invalid input" — zowel client-side (direct) als server-side (zelfde validators).

### AI aansluiten

Zet `ANTHROPIC_API_KEY` (standaardmodel `claude-opus-5-5`, lage effort voor korte antwoorden, server-side fallback bij refusals) of `OPENAI_API_KEY` in `.env.local`. Zonder key gebruikt Luuk `mockLuuk.ts`.
