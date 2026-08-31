# SIR ENK / Regnskap

Internal bookkeeping module for SIR Rens & Pleie. Access is limited to OWNER and ADMIN.

## Current business state

SIR is currently in **pre-ENK mode**: the enterprise has not yet been registered as an ENK. The system therefore allows preparation and internal records, but official invoice issuance is blocked until the owner explicitly marks ENK as registered and completes the legal identity.

## Implemented

- Pre-ENK mode with a server-side guard that blocks official sale invoices before registration.
- 12-month turnover dashboard with a 50,000 NOK VAT-registration indicator.
- Income/expense ledger with category, counterparty, document number, VAT rate, business-use percentage and payment method.
- Private receipt/document storage (PDF/JPG/PNG/WEBP, 15 MB maximum).
- Non-destructive correction of ledger entries by voiding them with a reason.
- Server-numbered invoices generated from completed SIR orders after ENK registration.
- Invoice snapshots preserve seller/buyer, delivery, amount and VAT data after issue.
- Credit notes are issued as new numbered documents; issued invoice content is immutable.
- Payment status is synchronized back to the SIR order.
- Printable invoice page suitable for browser Print / Save as PDF.
- Mileage log with date, vehicle, route, purpose, kilometers and optional order link.
- Equipment/assets register with receipt storage and a configurable capitalization/depreciation review threshold.
- CSV exports for ledger, invoices, mileage and assets.
- Configurable ENK legal identity, organization number, address, bank account, VAT status/rate, invoice terms, tax-reserve percentage, document retention and default vehicle.

## Security

- Accounting tables use RLS and are accessible only to OWNER/ADMIN.
- `anon` has no direct table access.
- Accounting settings are hidden from WORKER/MANAGER reads.
- Accounting documents are stored in a private Supabase Storage bucket with OWNER/ADMIN policies.
- Invoice RPCs are callable only by authenticated clients and enforce an OWNER/ADMIN guard inside the SECURITY DEFINER function.
- A database trigger independently blocks new sale invoices while `enk_registered=false`.
- Invoice numbers come from a locked private counter; users cannot choose an invoice number.

## Compliance boundaries

This module is an internal bookkeeping and reconciliation tool. It does not submit tax returns or VAT returns to Skatteetaten and should not be described as an approved accounting/filing system.

Current rules used for safeguards and warnings were checked against official Norwegian sources on 2026-08-31:

- Skatteetaten: VAT registration is required when VAT-liable turnover exceeds NOK 50,000 during a 12-month period: https://www.skatteetaten.no/bedrift-og-organisasjon/starte-og-drive/ny-som-naringsdrivende/nytt-enk/
- Altinn: invoice numbers must be assigned by the invoicing system and invoices must contain required seller/buyer/sale information: https://info.altinn.no/starte-og-drive/regnskap-og-revisjon/regnskap/faktura-salgsdokumentasjon/
- Bookkeeping material/documentation generally has a five-year retention requirement: https://www.skatteetaten.no/rettskilder/type/handboker/skatte-abc/2021/regnskap--foretak-med-bokforingsplikt/R-3.002/R-3.009/

## When ENK is registered

Open `ENK / Regnskap -> Настройки ENK`, change the ENK status to registered, and enter the real legal business name, 9-digit organization number and business address. Add the bank account if invoices should show it. Mark VAT registration only after the enterprise is actually registered in Merverdiavgiftsregisteret.
