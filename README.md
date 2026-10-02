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
| `/huizen` | WOZ, bouwjaar, m², historische vraagprijzen, maandlasten (4,2% annuïtair, 30 jaar) en verdict "Koopje of Miskoop?". Postcode **of** straat + plaats, met slimme detectie. | `POST /api/huizen` (+ ruwe data: `POST /api/kadaster`) |
| `/autos` | Geel kenteken-invoerveld, RDW-specs, dagwaarde via `V = P × (1 − r)^t` en Luuk's commentaar. | `POST /api/autos` (+ ruwe data: `GET /api/rdw?kenteken=`) |
| `/roast` (ook `/web`) | Laadtijd, mobiele score, meta-tags/H1/alt-checks en een harde roast. | `POST /api/seo` |

## Architectuur

```
src/
├─ app/                     pagina's (server) + *Client.tsx (interactief) + api/ route handlers
├─ components/              Header, NavigationTabs, SearchInput (Omnibar), LicensePlateInput,
│                           ResultCard, AnimatedNumber, LuukVerdict, LuukMessage, Background
├─ lib/
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
