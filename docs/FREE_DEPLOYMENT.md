# SIR — Free launch and later migration

## Free phase

- Hosting: GitHub Pages.
- Source/versioning: GitHub.
- Database/Auth/Storage: dedicated Supabase Free project `twahxojwxxxzwapotdst` while within free limits.
- SMS: `sms:` links open the phone's SMS composer; no paid SMS provider is required for the first launch.
- Master QR: static SVG in `assets/sir-master-qr.svg` encoding the stable GitHub Pages route `/q/`.
- Guide: existing `guide-app/` served from the same repository and integrated into SIR Admin.

## Master QR design

Current encoded URL:

`https://mukomell72-ui.github.io/Sir-rens-pleie/q/`

The QR points to `/q/`, not directly to the home page. `/q/` redirects to the active site root and adds `src=master-qr`.

When SIR later moves to `sir-rens.no`, keep the GitHub Pages `/q/` route available for already printed materials and change only its redirect target to `https://sir-rens.no/`. New permanent QR material can then encode `https://sir-rens.no/q`.

Do not delete the GitHub Pages `/q/` route while old printed QR codes are in circulation.

## Database status

A dedicated SIR Supabase project is now connected and the current migrations in `supabase/migrations/` have been applied during development/testing.

Browser runtime configuration uses:

- project URL: `https://twahxojwxxxzwapotdst.supabase.co`
- a publishable browser key in `assets/config.js`

The publishable key is intentionally public. Service-role credentials must never be stored in browser JavaScript or committed to GitHub.

Before the production merge, perform a final migration/advisor check against the dedicated SIR project and create the first OWNER account using the one-time bootstrap flow.

## Portability

The public domain, hosting, database provider, SMS provider and business email are configuration/infrastructure concerns, not embedded business logic. Business data lives in ordinary PostgreSQL tables and can be exported/migrated.

SIR Admin includes a business-data backup export. Database-level backups and media exports remain separate infrastructure operations.

## Safety rule

Do not expose service-role credentials in GitHub or browser JavaScript. Do not use browser-only localStorage as the source of truth for orders, customers, prices or technology instructions.
