# SIR Rens & Pleie

Production website + admin system for SIR Rens & Pleie.

## Source of truth

- Repository: `mukomell72-ui/Sir-rens-pleie`
- Production branch: `main`
- `main` is the current source of truth. Do not recreate the project from older snapshots or restore obsolete designs.

## Current system

- Customer website with NO / EN / RU support.
- Server-backed pricing, travel calculation and order flow.
- Supabase-backed admin, calendar, payments, referrals and technology cards.
- Statens vegvesen vehicle lookup through a server-side Edge Function.
- OWNER / ADMIN / MANAGER / WORKER role model.
- SIR Guide with a single current entry point at `guide-app/index.html`.
- ENK / Regnskap module with private document storage, ledger, mileage, assets, VAT-threshold monitoring and printable invoice support.
- Pre-ENK mode remains available until the real legal enterprise identity is entered.

## Architecture and requirements

See `docs/SIR_PRODUCT_SPEC.md` for the consolidated product and architecture specification. Later approved requirements supersede older notes where they conflict.
