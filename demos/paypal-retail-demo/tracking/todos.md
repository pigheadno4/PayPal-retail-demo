# Todos

## Planning
- [x] Review and approve `DEMO.md` for Milestone 1 scaffold.
- [x] Review and approve `DESIGN.md` for Milestone 1 scaffold.
- [x] Review and approve `IMPLEMENTATION_PLAN.md` for Milestone 1 scaffold.
- [x] Review and approve `DATA_MODEL.md` for Milestone 1 scaffold.
- [x] Review and approve `API_CONTRACT.md` for Milestone 1 scaffold.
- [x] Review and approve `ENVIRONMENT.md` for Milestone 1 scaffold.
- [x] Review and approve `PAYPAL_EVIDENCE.md` for Milestone 1 scaffold.
- [x] Review and approve `IMPLEMENTATION_TASKS.md` for Milestone 1 scaffold.
- [x] Review and approve `PLAN.md` for Milestone 1 scaffold.
- [x] Confirm final `wiki-v2` PayPal source references for SDK v6, Pay Later, card fields, Apple Pay, Google Pay, Venmo, vaulting, webhooks, and BOPIS payload fields.
- [x] During dependency install, verify the installed JS SDK v6 / `@paypal/react-paypal-js` v9 types still support `createInstance({ testBuyerCountry })`.
- [x] Confirm Supabase schema/RLS approach before migration files are created.
- [x] Confirm local Supabase project/env setup approach: local CLI for migrations/tests and remote project for stable presentation data.
- [x] Confirm PayPal sandbox app/env setup approach: local env only, no committed secrets.
- [x] Confirm TypeScript strict-mode scaffold approach before Milestone 1.
- [x] Review UI/UX refinements in `DESIGN.md` before scaffold starts.
- [x] Confirm Apple Pay / Google Pay local testing approach: eligibility/debug/manual locally, hosted preview or approved HTTPS tunnel for full wallet verification later.
- [x] Confirm POP MART asset convention under `web/public/assets/popmart/`.

## Implementation
- [x] Complete Milestone 1 scaffold from `PLAN.md` Task 1.
- [x] Prepare Milestone 2 Supabase schema/RLS approach before migration files are created.
- [x] Verify the initial Supabase migration applies against the linked remote Supabase project.
- [ ] Verify the Supabase migrations apply on local Supabase once Docker Desktop/local Supabase is available.
- [x] Build the TypeScript storefront/reference seed runner data for the two demo profiles.
- [x] Build the guarded buyer/account/order seed slice with shared demo users, addresses, reviews, pending orders, completed orders, and lifecycle snapshots.
- [x] Complete Milestone 3 shared business logic helpers with TDD for money, market, catalog, promo, tax, shipping, inventory, cart lifecycle, market switch, pending resume, order numbers, PayPal invoice IDs, and order status transitions.
- [x] Start Milestone 4 PayPal payload/config helpers with local `wiki-v2` evidence and TDD.
- [x] Continue Milestone 4 with PayPal express delivery Create Order builder and server-side shipping callback config.
- [x] Continue Milestone 4 with PayPal BOPIS Create Order builder and mandatory v1 pickup fields.
- [x] Continue Milestone 4 with PayPal SDK config response builder and browser-safe client ID.
- [ ] Continue Milestone 4 with PayPal client token request rules for vault-enabled flows.
