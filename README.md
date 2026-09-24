# PolskiRaport

PolskiRaport to niezależny interfejs do publicznych danych o polskich podmiotach.

## Architektura

- frontend: `index.html`
- API: Cloudflare Pages Functions
- endpoint: `GET /api/company/{identifier}`
- KRS: oficjalne Open API Ministerstwa Sprawiedliwości
- NIP/REGON: GUS BIR1 — po uzyskaniu klucza produkcyjnego
- finanse: RDF — kolejny adapter
- cache: nagłówki HTTP; później opcjonalnie Cloudflare KV/D1

## Uruchomienie

Cloudflare Pages obsługuje katalog `functions/` jako backend serverless. Repozytorium można połączyć z Cloudflare Pages przez GitHub.

Ustaw:
- Production branch: `main`
- Build command: brak
- Build output directory: `/`

Dla GUS ustaw sekret:
`GUS_BIR_API_KEY`

Nie umieszczaj klucza GUS w kodzie frontendowym ani w repozytorium.

## Endpoint

`/api/company/0000795513`

Zwraca ustandaryzowany model:
`name, krs, nip, regon, legalForm, address, registrationDate, updateDate, status, pkd, representation, source`.

## Źródła

KRS Open API: https://api-krs.ms.gov.pl/

GUS BIR1: https://api.stat.gov.pl/Home/RegonApi?lang=pl

Projekt nie jest serwisem administracji publicznej.
