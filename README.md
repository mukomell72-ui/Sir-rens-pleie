# SIR Rens & Pleie

Professional website + admin system for SIR Rens & Pleie.

Current redesign work is developed in the `professional-redesign` branch and reviewed through PR #8 before anything is merged into `main`.

## Current state

- Customer website with NO / EN / RU support.
- Server-backed pricing, travel calculation and order flow.
- Supabase-backed admin, calendar, payments, referrals and technology cards.
- Statens vegvesen vehicle lookup through a server-side Edge Function.
- OWNER / ADMIN / MANAGER / WORKER role model.
- ENK / Regnskap module with private document storage, ledger, mileage, assets, VAT-threshold monitoring and printable invoice support.
- **Pre-ENK mode is active:** the enterprise is not registered as an ENK yet, so preparation/internal records are available while official invoice issuance is blocked both in the UI and at database level until registration and legal identity are completed.

See `docs/ENK_ACCOUNTING.md` and the PR #8 description for implementation and launch notes.
