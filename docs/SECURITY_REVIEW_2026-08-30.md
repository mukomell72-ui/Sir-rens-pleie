# SIR security review — 2026-08-30

Scope: `professional-redesign` + dedicated Supabase project used by SIR Rens & Pleie.

## Verified controls

- All public business tables have RLS enabled.
- `anon` has no direct access to orders, customers, appointments, photos, technology cards, staff profiles, audit, referrals, chemistry or procedures.
- `anon` has read-only access only to the public price catalog and the public subset of application settings.
- Public customer actions use explicit RPCs with narrow outputs.
- Customer order-status and offer links use random tokens stored only as SHA-256 hashes and checked against expirations.
- Photo upload uses a separate 24-hour order token, private storage, MIME/size checks, five-photo application limit and a database-enforced race-safe five-photo limit.
- Staff browser roles do not have `TRUNCATE`, `REFERENCES` or `TRIGGER` privileges on business tables.
- Worker RLS limits order visibility to assigned orders. A database guard allows only progress fields, permits only valid work-status transitions and only allows a worker to raise risk to `STOP`; workers cannot change price/customer data.
- Initial OWNER bootstrap requires an authenticated account plus a one-time hashed setup code, expires, invalidates remaining setup tokens after use, and revokes its own authenticated execution grant after the first successful claim.
- Technology generation is not executable by `anon`.
- Public order submission enforces privacy consent, server-side price calculation, travel fee, minimum mobile order, referral eligibility/discount and per-phone anti-spam throttling.
- Mobile minimum is applied before referral eligibility/discount.
- `rls_auto_enable()` remains installed as the database event-trigger function but direct `EXECUTE` has been revoked from `public`, `anon` and `authenticated`.

## Transaction and integration tests completed

Tests were performed inside transactions and rolled back unless they were schema/security migrations or explicit release integration tests.

- public request -> private status token -> public status lookup: PASS
- 0 km minimum mobile order: 750 NOK: PASS
- 15 km minimum mobile order: 750 + 150 NOK travel = 900 NOK: PASS
- eligible referral: 750 NOK base -> 100 NOK new-customer discount = 650 NOK: PASS
- offer confirm -> order `confirmed` + tentative appointment becomes non-tentative: PASS
- five photo metadata rows accepted; sixth rejected by DB trigger: PASS
- simulated WORKER can start assigned job and add internal progress note: PASS
- simulated WORKER price change rejected and original price preserved: PASS
- public RPC still works after direct anonymous table privileges were removed: PASS
- live owner-authorized Statens vegvesen lookup through the deployed `vehicle-lookup` Edge Function: PASS
- the live lookup exposed a response-shape bug (`kjoretoydataListe` was not parsed); parser corrected and redeployed; repeat lookup returned non-empty make/model/year/body: PASS
- temporary PostgreSQL `http` extension used to drive the release E2E request was removed immediately after the test: PASS
- latest GitHub static/JS/safety validation after the vehicle parser correction: PASS

## Supabase advisor review

Final direct Security Advisor and Performance Advisor checks were run after the migration and Edge Function work.

Expected Security Advisor warnings remain for these deliberately public `SECURITY DEFINER` RPCs:

- `public_submit_order_v2`
- `public_get_order_status`
- `public_get_offer`
- `public_respond_offer`

These are intentionally public entry points. They do not grant direct table access; the status/offer endpoints require expiring hashed tokens and the submit endpoint returns a deliberately limited response.

The advisor also reports `claim_initial_owner` while the initial OWNER has not yet been claimed. This function is intentionally temporary and self-revokes from `authenticated` after the first successful claim.

`vehicle_lookup_rate_limits` is intentionally RLS-enabled with no end-user policy. It is an internal rate-limit table used through a service-role-only RPC; the no-policy state therefore denies browser roles by default.

Performance Advisor currently reports several unused indexes. The database is new and has not accumulated representative production traffic, so those indexes are retained until real workload statistics exist.

Supabase linter references:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

## Remaining release gates

1. Rotate the Supabase deployment token and Statens vegvesen API key that were exposed during setup, then update the deployment/function secrets.
2. Create the first real OWNER account with an owner-controlled email/password and consume the one-time bootstrap.
3. Perform final manual mobile/browser walkthrough of customer and admin screens.
4. Use only real SIR Before/After assets; no fabricated customer examples.
5. Finalize legal company identity and retention wording before commercial launch.
6. Merge to `main` only after the final release checklist is green.
