# SIR Rens & Pleie — Product & Architecture Specification

Status: consolidated design for `professional-redesign`.

## 1. Core principles

- Mobile-first, fast, simple, visually premium, not a long questionnaire.
- Public site, admin application, database and technology guide are separate modules that work as one system.
- No business-critical data may live only in browser `localStorage`.
- No shared PIN such as `1234`; each administrator has an individual account.
- Prices, services, travel fees, discounts, statuses, instructions, chemical data and company settings must be editable from Admin without changing source code.
- Architecture must be portable between email accounts, hosting providers, domains, SMS providers and, if needed, database providers.
- Safety before aggressiveness: when material or risk is uncertain, the system must require inspection/test/STOP rather than suggesting stronger chemistry automatically.

## 2. Public website

### Visual design

- Recreate the approved dark SIR visual composition using real HTML/CSS components, not one screenshot with invisible hotspots.
- Service cards: Car interior, Sofa, Chair, Mattress.
- The whole service card is interactive.
- When tapped, the form opens **inside the same card** as an expanding accordion/wizard.
- Only one logical step is shown at a time.
- NO / EN / RU on the customer site.
- Strong photography, clear trust signals, short copy, no visual overload.

### Car order flow

1. Registration number.
2. Vehicle lookup through Statens vegvesen backend.
3. Autofill available make/model/year/body/seat information; every field remains manually editable.
4. Choose full interior or individual elements.
5. Material.
6. Contamination level.
7. Stains / pet hair / odour / special condition.
8. Extras.
9. Upload photos (target 2–5; allow up to 5 initially).
10. Customer comment.
11. Name, phone, address, mobile service.
12. Personalized work plan, estimated duration and preliminary price.
13. Confirmation that the request is sent for review, not yet a final booking.

### Furniture flow

Use structured choices first, not free-text-first forms: object → size/seats → material → contamination → stains → hair → odour → photos → address/contact → plan/time/preliminary price.

### Contamination model

Use four customer-facing categories:

- Light — one normal gentle cleaning cycle; no intensified treatment expected.
- Medium — pretreatment + main cleaning + local repeat where needed.
- Heavy — multi-stage treatment and more time.
- Special condition — no automatic final price; review photos/manual inspection first.

Avoid customer-facing wording such as “aggressive chemicals”. Use “gentle cleaning”, “enhanced pretreatment” and “multi-stage deep cleaning”.

### Work explanation

Before final confirmation show a personalized “What we will do / Why / Estimated time / What is included / Price” block. The same summary remains available after the request is submitted.

## 3. Pricing engine — initial editable values

All numbers are introductory configuration values and must be editable in Admin. Do not hard-code them into UI components.

### Full car interior

| Seats | Light | Medium | Heavy |
|---|---:|---:|---:|
| 5 | 1690 | 1990 | 2390 |
| 7 | 1990 | 2390 | 2890 |
| 9 | 2290 | 2790 | 3390 |

Full package includes seats, ceiling, floor/carpet, trunk, door cards, interior plastics, dashboard/console, mats, interior glass and normal stain pretreatment.

Full package must always be meaningfully cheaper than selecting the same elements individually.

### Seats separately

Base light price: 250 NOK per seat.

Volume rule: 4th, 7th and 8th seat have a 150 NOK base price.

Complexity surcharge per seat:

- Medium: +50 NOK.
- Heavy: +100 NOK.

Examples: 5 seats = 1150 / 1400 / 1650; 7 seats = 1550 / 1900 / 2250; 8 seats = 1700 / 2100 / 2500; 9 seats = 1950 / 2400 / 2850.

### Ceiling

| Vehicle size | Light | Medium | Heavy |
|---|---:|---:|---:|
| 5-seat | 590 | 750 | 950 |
| 7-seat | 690 | 850 | 1050 |
| 8–9 seat / large | 790 | 950 | 1150 |

Ceiling instructions must carry elevated risk controls because excessive moisture can damage adhesive/backing.

### Other car elements

| Work | Light | Medium | Heavy |
|---|---:|---:|---:|
| Floor/carpet 5-seat | 390 | 490 | 650 |
| Floor/carpet 7-seat | 490 | 590 | 750 |
| Floor/carpet 9-seat | 590 | 690 | 850 |
| Trunk standard | 250 | 350 | 450 |
| Trunk large | 350 | 450 | 550 |
| Door card, one | 100 | 125 | 150 |
| 4 door cards | 350 | 450 | 550 |
| Dashboard + console | 200 | 250 | 300 |
| All interior plastic | 350 | 450 | 550 |
| 4 textile mats | 200 | 250 | 300 |
| Seat belt, one | 75 | 100 | 125 |
| Interior glass | 150 | 200 | 250 |
| Child seat | 250 | 350 | 450 |

Ordinary small stains are included in the relevant element. Unknown/high-risk stains can trigger manual review.

### Furniture

| Sofa seats | Light | Medium | Heavy |
|---|---:|---:|---:|
| 2 | 500 | 600 | 700 |
| 3 | 750 | 900 | 1050 |
| 4 | 900 | 1100 | 1300 |
| 5 | 1150 | 1400 | 1650 |

Other starting values:

- Armchair: 400 / 500 / 650.
- Dining chair seat + back: 200 / 250 / 300.
- Single mattress one side: 450 / 550 / 700.
- Double mattress one side: 650 / 800 / 1000.
- Two sides: approximately +50%, editable.

### Travel

- 0–10 km: 0 NOK.
- 11–20 km: 150 NOK.
- 21–30 km: 250 NOK.
- 31–40 km: 350 NOK.
- Minimum mobile order: 750 NOK.

Distance rules must be editable.

### Price integrity

- Show “preliminary estimate” until admin review.
- Final price cannot increase without explicit customer acceptance.
- Do not display invented crossed-out “regular prices”. Only show a former/reference price when there is a legitimate documented basis.

## 4. Order lifecycle

Recommended states:

- New
- Under review
- Offer sent
- Awaiting customer confirmation
- Confirmed
- Scheduled
- In progress
- Completed

Exceptions:

- Customer requested another time
- Cancelled by customer
- Cancelled by SIR
- No-show / no access

The customer request does not reserve a final slot until the customer confirms the offer.

Admin sends an offer containing service, date, weekday, time, location mode, estimated duration and final agreed price. SMS should contain a secure confirmation link. Customer can Confirm / Request another time / Cancel.

Phase 1 SMS can use `sms:` to open a prepared message for manual sending. Architecture must allow replacement with an SMS provider later without redesigning orders.

## 5. Calendar

- Full month view.
- Every cell shows date + weekday, e.g. “25 Tue”, “27 Thu”.
- Show bookings and free windows.
- Tap booking → order card.
- Tap free window → schedule an existing order or create a manual booking.
- Duration comes from the order estimate and blocks the time range.
- Configurable working hours and buffer between jobs.
- Tentative/awaiting-confirmation slots visually differ from confirmed bookings.

## 6. Admin application

Primary navigation:

Dashboard / Orders / Calendar / Customers / Guide / Finance / Team / Audit / Settings.

### Dashboard

Today: new, awaiting confirmation, scheduled, in progress, completed, revenue, free windows and urgent/high-risk items.

### Order card

Include customer, phone, address, travel, service, registration number, vehicle data, contamination, stains/hair/odour, photos, estimated time, preliminary price, final price, internal notes, assigned worker, status history and customer confirmation history.

Quick actions: Call / SMS / Send offer / Change status / Schedule / Assign worker / Complete.

## 7. Users, roles and audit

Individual authentication through proper Auth, not a shared password.

Roles:

- OWNER — complete control.
- ADMIN — broad operational access.
- MANAGER — orders/calendar/customers within permission set.
- WORKER — assigned jobs and required instructions only.

Owner can invite, disable, change role and force password reset. Passwords are never visible to Owner.

Track security/operational audit events: login/logout, order status changes, price changes, schedule changes, customer data changes, role changes and critical guide edits.

Do **not** build invasive employee surveillance. If session/activity time is retained, make it transparent, limited to administration-system usage and primarily for security/operations. Use inactivity cutoff and distinguish session duration from approximate active use.

## 8. Technology guide (“SIR Guide”)

Move the existing chemical/equipment guide inside Admin while keeping it as its own module.

Each product record:

- image/label;
- product name;
- intended surfaces;
- prohibited surfaces;
- manufacturer dilution/instructions;
- application method;
- dwell time if verified;
- extraction/rinse/follow-up;
- next step;
- risk warnings;
- purchase price and shop link;
- source/verification status;
- version history.

Never invent a dilution or chemical combination. Prefer manufacturer-confirmed instructions.

### Technology card per order

Generate a preliminary instruction from customer photos + description, then require on-site verification.

Show:

- contamination score;
- material confidence;
- risk: LOW / CAUTION / HIGH RISK / STOP;
- estimated time;
- recommended sequence;
- chemistry from approved inventory;
- dilution only when verified;
- number of passes;
- whether a repeat can follow extraction or whether drying/inspection is required;
- mandatory spot-test where applicable;
- clear stop conditions.

High-risk examples: loose headliner, unknown delicate fabric, damaged leather coating, mould/biological contamination, colour transfer during test, unknown old stain.

Owner view additionally shows estimated cost, travel, time and expected margin.

## 9. Customer trust and conversion

Add:

- real Before/After gallery;
- “What is included” clarity;
- realistic limitations (no promise that every old stain/odour can be completely removed);
- process/time explanation;
- privacy notice and consent where required;
- simple order status access;
- Google review request after completion;
- referral program.

Referral starting rule:

- Referrer earns 200 NOK service credit after the referred order is completed and paid.
- New customer gets 100 NOK off first eligible order.
- Minimum referred order: 750 NOK.
- Credit is not cash; balance/history shown in Admin.
- Prevent self-referrals/duplicate new-customer claims.

## 10. QR strategy

- Preserve any already-distributed QR destination where technically controllable; never invalidate printed material unnecessarily.
- For future master QR, use a permanent SIR-owned domain route, e.g. `sir-rens.no/q`.
- The QR should not directly encode GitHub Pages, ChatGPT Site, Supabase or a paid dynamic-QR vendor URL.
- `/q` redirects to the current site destination, so hosting can change while printed QR remains unchanged.
- Separate optional campaign QR routes may exist for Order and Review while the master QR remains stable.

## 11. Portability and ownership

Separate configuration from code. Editable settings include company identity, phones, email, address, radius, working hours, prices, discounts, languages, review link, SMS provider and domain-related public URLs.

Data model should use ordinary PostgreSQL entities such as customers, orders, order_items, appointments, employees/profiles, audit_events, chemicals, procedures, prices, referrals and settings.

Support export/backup of business data and media metadata. Hosting, domain registrar, email, SMS provider and database provider should be replaceable with migration work rather than rewriting the whole product.

Target public domain can later be `.no`. The domain must remain under SIR control even when hosting changes.

## 12. Security / privacy requirements

- Supabase Auth for administrator identity.
- Row Level Security on exposed tables.
- Service-role credentials only server-side.
- Public customer submission endpoint may insert only the minimum allowed order fields and cannot read other orders.
- Confirmation links use unguessable, expiring/revocable tokens.
- Photos stored privately with controlled access.
- Maintain clear privacy information about collected data, purpose, source of vehicle information where applicable, retention and customer rights.
- Define retention periods for photos, order data and logs.

## 13. Remove / avoid from old design

- Browser-only order storage.
- Shared admin PIN `1234`.
- Huge form displayed all at once.
- Form as a separate unrelated block below the service cards.
- Fake discounts or invented “before” prices.
- Automatic final booking before customer acceptance.
- Customer-facing detailed chemical recipes.
- Unverified chemical mixing/dilution.
- Third-party QR dependency as the permanent master QR.
- Excessive employee activity surveillance.

## 14. Build order

1. Database/auth/security model.
2. Public order flow + editable price engine.
3. Admin Orders + audit trail.
4. Calendar + customer confirmation workflow.
5. Photos/private storage.
6. SIR Guide + technology cards/risk gates.
7. Finance/referrals/reviews.
8. Permanent domain/QR and provider portability.
9. Final responsive/UX/accessibility/security testing.

This document is the single source of truth for the professional redesign unless a later approved requirement explicitly supersedes it.
