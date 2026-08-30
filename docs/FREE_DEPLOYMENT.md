# SIR — Free launch and later migration

## Free phase

- Hosting: GitHub Pages.
- Source/versioning: GitHub.
- Database/Auth/Storage: dedicated Supabase Free project while within free limits.
- SMS: `sms:` links open the phone's SMS composer; no paid SMS provider required.
- Master QR: static SVG in `assets/sir-master-qr.svg` encoding the stable GitHub Pages route `/q/`.
- Guide: existing `guide-app/` served from the same repository.

## Master QR design

Current encoded URL:

`https://mukomell72-ui.github.io/Sir-rens-pleie/q/`

The QR points to `/q/`, not directly to the current home page. `/q/` redirects to the active site root and adds `src=master-qr`.

When SIR later moves to `sir-rens.no`, keep GitHub Pages and change only `/q/index.html` so old printed QR material redirects to `https://sir-rens.no/`. New permanent QR material can then encode `https://sir-rens.no/q`.

Do not delete the GitHub Pages `/q/` route while old printed QR codes are in circulation.

## Database blocker

The repository currently references Supabase project `rskgbkqtrigtznnksbyp` in `supabase/config.toml`, but the currently connected Supabase account exposes a different unrelated project. Do **not** apply SIR migrations to the unrelated project.

Prepared migrations:

1. `20260830170000_sir_schema.sql`
2. `20260830170100_sir_security.sql`
3. `20260830170200_sir_seed.sql`

Once the correct dedicated SIR Supabase project is connected/created, apply these migrations, obtain its public URL + publishable key, and fill `assets/config.js`. Publishable browser key is not a service-role secret.

## Portability

The public domain, hosting, database provider, SMS provider and business email are configuration/infrastructure concerns, not embedded business logic. Business data lives in ordinary PostgreSQL tables and can be exported/migrated.

## Safety rule

Do not expose service-role credentials in GitHub or browser JavaScript. Do not use browser-only localStorage as the source of truth for orders, customers, prices or technology instructions.
