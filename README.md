# SIR Rens & Pleie

Production website + admin system for SIR Rens & Pleie.

## Source of truth

- Repository: `mukomell72-ui/Sir-rens-pleie`
- Production branch: `main`
- `main` is the only production source of truth. Do not recreate the project from older snapshots or restore obsolete designs.
- Unrelated projects, bots, game files and foreign Supabase project references must never be committed to `main`.

## Current system

- Customer website with NO / EN / RU support.
- Server-backed pricing, travel calculation and order flow.
- Supabase-backed admin, calendar, payments, referrals and technology cards.
- Statens vegvesen vehicle lookup through a server-side Edge Function.
- OWNER / ADMIN / MANAGER / WORKER role model.
- SIR Guide with the active v13 bundle behind the single public entry point `guide-app/index.html`.
- ENK / Regnskap module with private document storage, ledger, mileage, assets, VAT-threshold monitoring and printable invoice support.
- Pre-ENK mode remains available until the real legal enterprise identity is entered.

## Deployment policy

- GitHub Pages deploys the public site from `main`.
- `Validate SIR production` is the required repository/browser regression suite for production changes.
- Supabase project: `fxdgeizhlhgvybclvmyo`.
- Supabase schema migrations and Edge Functions are managed through authorized Supabase project access. GitHub-side Supabase deploy workflows are intentionally not used because the repository's stored Supabase access token does not have the platform privileges required for deployment.
- `Smoke test SIR Supabase edge functions` verifies the live Edge Function contract, request validation and intended production CORS origins.
- Never weaken a failing deploy workflow with `continue-on-error`; fix the credential/permission path or deploy through authorized Supabase project access and verify the live service.

## Architecture and requirements

See `docs/SIR_PRODUCT_SPEC.md` for the consolidated product and architecture specification. Later approved requirements supersede older notes where they conflict.
