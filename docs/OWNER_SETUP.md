# SIR first OWNER setup

The production Supabase project currently has no active OWNER account.

## Current state

- `claim_initial_owner(text)` is available only to `authenticated`, not `anon`.
- The claim requires a one-time SHA-256-hashed bootstrap token stored in the private schema.
- A fresh one-time token has been generated for the owner and expires after 24 hours.
- The plaintext token is intentionally not committed to GitHub.
- After the first successful claim, remaining bootstrap tokens are invalidated and `EXECUTE` on `claim_initial_owner(text)` is revoked from `authenticated`.
- The admin signup/login UI supports the bootstrap flow in `admin/setup.js`.

## Owner action

1. Open the SIR Admin page from the preview/released site.
2. Under **Создать первый аккаунт OWNER**, enter the owner-controlled name, email and a new password.
3. Enter the current one-time OWNER code supplied separately.
4. If Supabase requires email confirmation, confirm the email, then sign in above using the same password and OWNER code.
5. Confirm the badge shows `OWNER` and that **ENK / Regnskap** is available.

Do not store the OWNER password or one-time code in the repository, screenshots, public issues or documentation.
