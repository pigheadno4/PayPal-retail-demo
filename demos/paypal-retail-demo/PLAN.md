# PayPal Retail Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for parallel implementation slices or `superpowers:executing-plans` for inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PayPal Retail Demo as a TypeScript POP MART-style retail payment demo with Delivery, BOPIS, express checkout, PayPal payment methods, Supabase-backed data, account flows, reviews, and Admin Portal.

**Architecture:** `PLAN.md` is the active execution router. `IMPLEMENTATION_TASKS.md` is the canonical detailed implementation plan and milestone backlog. `DEMO.md`, `DESIGN.md`, `DATA_MODEL.md`, `API_CONTRACT.md`, `ENVIRONMENT.md`, and `PAYPAL_EVIDENCE.md` are source-of-truth contracts that implementation must obey.

**Tech Stack:** Vite React with TypeScript, Node.js Express with TypeScript, shared TypeScript domain modules, TypeScript seed tooling, Supabase Auth/Postgres, PayPal JS SDK v6, `@paypal/react-paypal-js` v9.x, local app assets.

---

## Who Owns The Implementation Plan

- `PLAN.md`: active entry point for future Claude/Codex/Superpowers sessions. Start here.
- `IMPLEMENTATION_TASKS.md`: detailed implementation plan and milestone checklist. This is the main execution plan.
- `IMPLEMENTATION_PLAN.md`: architecture, system design, API surface overview, and milestone rationale.
- `tracking/todos.md`: approval gates and current open decisions.
- `tracking/test-cases.md`: acceptance tests and QA checklist.
- `tracking/progress.md`: completed planning and implementation history.

If a milestone becomes too large to execute safely from `IMPLEMENTATION_TASKS.md`, create a focused per-milestone plan under `docs/superpowers/plans/` and link it from this file before coding.

## Current Phase

Current phase: **Milestone 16 QA, UX Review, and Demo Polish remains the active execution stage on `main`, and the supported buyer/admin scope is mostly closed. The shadcn component foundation, shared primitive migration, Home/Category/PDP/Cart/Minicart/Checkout/Express Review/Account polish, checkout compact-summary/payment-action follow-up, Admin passcode/profile/order/inventory/webhook/payment-debug/runtime-log surfaces, mobile responsive gates at 320/375/414/768/1024/1440px, API-backed official PayPal message/button render checks, accessibility/visual sweep, full cart PayPal sandbox approval/capture, delivery-checkout PayPal sandbox approval/capture, hosted HTTPS checkout PayPal plus Pay Later Pay in 4 sandbox approval/capture, PDP Add to cart server-cart persistence, generic MochiToy public-safe placeholder assets, and full local verification have passed. Homepage Reference Polish V3 is closed for real search and lighter typography. Homepage Reference Polish V4 is closed after local full-server verification plus hosted Render smoke testing on 2026-06-29. Category + PDP Reference Polish V5 is locally implemented and verified as of 2026-07-01: Category/PDP screenshots and metrics cover `/products`, `/products?category=blind-boxes`, `/products?q=molly`, released `/products/blind-boxes-2`, and unreleased `/products/blind-boxes-1` at 1440, 1280, 1024, 768, 390, and 320 widths; the primary released PDP now has real seeded review data, review IDs in the catalog API, no React key warning, working mobile Customer reviews tab activation, no page-level horizontal overflow, unreleased PDP payment/action gating, and focused tests/typecheck/lint/format/build passing. Category + PDP Refinement V6 is implemented, verified locally, landed on `main` as `7f1c5d70`, and hosted Render smoke passed against asset `index-DY1tYvnK.js` with Category 1440/390/320, released PDP 1440/390, and hosted unreleased PDP 390 returning 0 failures. Cart + Checkout Round 2 is deployed and smoke-closed, Checkout Round 3 pickup/drawer repair has local implementation slices completed with hosted/API-backed evidence still open, and Round 4 Auth/Minicart/Checkout surface polish is locally closed after a `31`-row JPEG evidence matrix, fresh `599`-test verification, and a read-only `ui-ux-pro-max` review with no P0/P1/P2 findings. The immediate Round 4 next step is hosted Render smoke after deployment. Other standing open work is explicit: hosted Card Fields final sandbox capture after action-time approval, wallet-eligible device/browser capture coverage, final richer gallery/media assets plus true LQIP derivatives, local Supabase migration verification when Docker is available, and optional guest confirmation save-order copy polish. `DESIGN.md` remains the frontend source of truth; `IMPLEMENTATION_TASKS.md` remains the canonical milestone checklist; `tracking/todos.md` is the near-term execution queue.**

2026-07-11 hosted-review correction (supersedes the earlier Round 4 next-step sentence above): the first Render review kept deploy quality open after exposing attached-but-unpainted PayPal geometry, empty checkout contrast proof, hardcoded target reporting, wrapped 320px pickup confirmation, and duplicate payment wordmarks. The correction and its runtime-hydration follow-up are locally implemented; a fresh `31`-row/`40`-image matrix, `602`-test full verification, and read-only review pass with no unresolved P0/P1/P2 findings. The immediate route is commit/deploy, then rerun the strict helper and independent review against the new Render assets.

Current M16 execution guide for the next page-polish slice: `demos/paypal-retail-demo/ROUND4_AUTH_MINICART_CHECKOUT_POLISH_PLAN.md` plus `demos/paypal-retail-demo/mockups/round4-auth-minicart-checkout-polish.html`. Treat `demos/paypal-retail-demo/ROUND3_CHECKOUT_PICKUP_DRAWER_PLAN.md` and the Round 3 section of `demos/paypal-retail-demo/CART_CHECKOUT_A_PLUS_SPEC.md` as prior/open evidence context only. Treat `docs/superpowers/plans/2026-07-02-category-pdp-refinement-v6.md` as the closed Category/PDP baseline, `docs/superpowers/plans/2026-06-29-category-pdp-reference-polish-v5.md` as the older Category/PDP baseline, and `docs/superpowers/plans/2026-06-18-popmart-reference-polish.md` as historical reference-level polish context only.

2026-07-02 update: Category + PDP Refinement V6 is locally closed after the visual companion and `ui-ux-pro-max` sub-agent review. Category is product-first with the large hero removed, a compact desktop control strip, a floating mobile icon Sheet trigger, and a quiet Pay Later strip. PDP support tiles moved out of the purchase rail into lower details, review/rating display is real-data-only with compact SVG/icon stars plus count, and the footer now uses verified local payment-mark SVGs. Final evidence covers `/products`, `/products?category=blind-boxes`, `/products?q=molly`, released `/products/blind-boxes-2`, and local unreleased `/products/vinyl-figures-7` at 1440, 1280, 1024, 768, 390, and 320 widths under `/Users/tengtao/Development/demo-projects/.playwright-mcp/paypal-retail-category-pdp-v6-final-20260702/`; `metrics.json` reports `30` checks and `0` failures.

2026-07-02 hosted update: V6 is live on Render after `main` advanced to `7f1c5d70`. Hosted smoke on `https://retail-demo.onrender.com` verified Category at 1440/390/320, released PDP at 1440/390, and hosted unreleased PDP `/products/blind-boxes-1` at 390 with 0 failures. Evidence screenshots are under `/Users/tengtao/Development/demo-projects/.playwright-mcp/paypal-retail-category-pdp-v6-render-smoke-after-main-20260702/`.

2026-07-03 update: Cart + Checkout A+ Polish is in runtime implementation after the Superpowers visual companion mockup and `ui-ux-pro-max` review. The selected direction is A+ Compact Retail Flow: product-first cart, checkout as the primary action, delivery express PayPal/Pay Later as secondary, calmer checkout steps, thumbnail-backed summaries, mobile-safe sticky actions, and strict payment gating. Cart hierarchy, initial checkout structure, payment readiness guards, app-level provider-scope blocking, and Pay Later amount-message refresh now have focused coverage; selected-provider browser proof, Pickup progression, sticky overlap, and final warning triage remain open. Use `CART_CHECKOUT_A_PLUS_SPEC.md`, `DESIGN.md`, `IMPLEMENTATION_TASKS.md`, and `tracking/test-cases.md` as the contract.

2026-07-07 historical update: Checkout Round 3 pickup and drawer repair was the active Cart/Checkout slice after the user approved Option A. Use `ROUND3_CHECKOUT_PICKUP_DRAWER_PLAN.md` only as prior/open evidence context unless explicitly resuming Round 3. The scope was pickup store-picker/header layering, picker cancel fallback to Pickup location, mobile duplicated order-detail removal through a single bottom drawer, billing-submit optimistic progression, real backend-backed promo activation, selected PayPal/Pay Later action width parity, and a repeatable Round 3 evidence helper.

2026-07-08 update: Round 4 Auth, Minicart, and Checkout surface polish is the active next implementation slice. Use `ROUND4_AUTH_MINICART_CHECKOUT_POLISH_PLAN.md` and `mockups/round4-auth-minicart-checkout-polish.html` as the source-of-truth plan and visual AC reference. Before runtime edits, preserve the sub-agent review tightenings: Register-specific AC, surface-by-width evidence matrix, positive selected PayPal/Pay Later activation proof, mockup comparison metrics, minicart quantity accessible names, full/partial/sold-out pickup inventory proof, and official PayPal runtime boundary evidence.

2026-07-09 update: Round 4 Auth email/password/register and Minicart runtime polish are locally implemented and code-verified. The next Round 4 implementation slice is checkout payment/order-sheet polish or pickup inventory wrapping; Auth/Minicart browser evidence remains open in the Round 4 evidence/review gate rather than blocking the next implementation slice.

Milestone 0 decision gates confirmed on 2026-05-26:

- Supabase strategy: both local CLI and remote project.
- PayPal sandbox strategy: credentials through local env only, no committed secrets.
- TypeScript scaffold: strict mode for app-owned web, server, shared, test, and seed code.
- POP MART assets: local app assets under `web/public/assets/popmart/` with slug-based naming.
- Apple Pay / Google Pay: local eligibility/debug/manual verification; full wallet verification later through hosted preview or approved HTTPS tunnel.

Operational setup status:

- `.env.example` exists and must remain free of secrets.
- Supabase CLI/remote access is configured; local migration verification remains blocked until Docker/local Supabase is available.
- Final PayPal sandbox account capability review is deferred to the Milestone 16 manual sandbox checklist.

## Source Documents

Read these before implementation:

- `DEMO.md`: demo purpose, audience, flow map, boundaries.
- `DESIGN.md`: buyer/admin UX contract, accessibility rules, visual QA gates.
- `DATA_MODEL.md`: Supabase schema draft, seed shape, constraints, indexes.
- `API_CONTRACT.md`: Express routes, PayPal payload contracts, API behavior.
- `ENVIRONMENT.md`: environment variables, secret boundaries, local tooling plan.
- `PAYPAL_EVIDENCE.md`: local `wiki-v2` evidence map for PayPal behavior.
- `IMPLEMENTATION_TASKS.md`: detailed milestone implementation plan.
- `AGENTS.md`: demo guardrails.

## Execution Rules

- Use TypeScript for web, server, shared modules, tests, and seed tooling.
- Start deterministic business logic with tests before UI.
- Use `/Users/tengtao/Development/wiki-v2` for PayPal details before implementing PayPal behavior.
- Do not replace the v1 BOPIS Create Order contract with authorize-at-checkout/capture-at-pickup.
- Keep POP MART assets local and customer-specific.
- Keep buyer UI retail-first; PayPal branding belongs in official payment surfaces only.
- Update tracking files after each milestone or meaningful implementation slice.

## Task 0: Close Milestone 0 Gates

**Files:**

- Modify: `demos/paypal-retail-demo/tracking/todos.md`
- Modify: `demos/paypal-retail-demo/tracking/progress.md`
- Modify only if decisions change: `demos/paypal-retail-demo/ENVIRONMENT.md`
- Modify only if decisions change: `demos/paypal-retail-demo/DESIGN.md`
- Modify only if decisions change: `demos/paypal-retail-demo/IMPLEMENTATION_TASKS.md`

- [x] **Step 1: Review source docs**

Read:

```bash
sed -n '1,220p' demos/paypal-retail-demo/DEMO.md
sed -n '1,460p' demos/paypal-retail-demo/DESIGN.md
sed -n '1,260p' demos/paypal-retail-demo/ENVIRONMENT.md
sed -n '1,220p' demos/paypal-retail-demo/IMPLEMENTATION_TASKS.md
```

Expected: no contradictions with TypeScript, BOPIS v1 semantics, shared market/store/tax/shipping data, or UI/UX review rules.

- [x] **Step 2: Confirm Supabase strategy**

Record the selected approach in `tracking/todos.md` and, if wording changes, `ENVIRONMENT.md`.

Selected v1 approach:

- local Supabase CLI for migrations and deterministic tests
- remote Supabase project for stable demo data when presentation readiness begins

- [x] **Step 3: Confirm PayPal sandbox strategy**

Record where local env values will come from without writing secrets into repo files.

Expected secret boundary:

- browser receives only browser-safe client config from Express
- PayPal client secret, webhook secret, access tokens, and Supabase service role stay server-only

- [x] **Step 4: Confirm wallet testing approach**

Apple Pay and Google Pay remain eligibility/debug/manual verification locally. Full wallet verification can use hosted preview or an approved HTTPS tunnel later.

- [x] **Step 5: Confirm POP MART asset handoff**

Record source folder and filename convention for customer-specific POP MART assets.

Expected target folder:

```text
demos/paypal-retail-demo/web/public/assets/popmart/
```

- [x] **Step 6: Verify planning structure**

Run:

```bash
bash scripts/check-agent-system.sh
```

Expected:

```text
Agent system structure looks good.
```

## Task 1: Prepare Milestone 1 Scaffold

Execute after Task 0 gates are closed.

**Files:**

- Create: `demos/paypal-retail-demo/package.json`
- Create: `demos/paypal-retail-demo/tsconfig.base.json`
- Create: `demos/paypal-retail-demo/.env.example`
- Create: `demos/paypal-retail-demo/README.md`
- Create directories listed in `IMPLEMENTATION_TASKS.md` Milestone 1
- Modify: `demos/paypal-retail-demo/tracking/progress.md`
- Modify: `demos/paypal-retail-demo/tracking/todos.md`

- [x] **Step 1: Scaffold TypeScript workspace**

Follow `IMPLEMENTATION_TASKS.md` Milestone 1. Use strict TypeScript for app-owned code unless a specific exception is documented.

- [x] **Step 2: Add environment example**

Create `.env.example` from `ENVIRONMENT.md` with explicit browser-safe versus server-only variable names. Do not add real secrets.

- [x] **Step 3: Add smoke checks**

Add package scripts for install verification, typecheck, and tests.

Expected commands after scaffold:

```bash
npm install
npm run typecheck
npm test
```

- [x] **Step 4: Update tracking**

Mark completed scaffold work in `tracking/progress.md` and keep remaining gates in `tracking/todos.md`.

## Task 2: Continue Through Detailed Milestones

After Milestone 1, execute `IMPLEMENTATION_TASKS.md` in order:

- Milestone 2: Supabase schema and seed.
- Milestone 3: deterministic domain logic TDD.
- Milestone 4: PayPal payload builders and capture guard TDD.
- Milestone 5: Express API foundation.
- Milestone 6: catalog, cart, and checkout draft APIs.
- Milestone 7: PayPal and payment APIs.
- Milestone 8: web app shell and design system.
- Milestone 9: storefront and catalog UI.
- Milestone 10: cart and minicart UI.
- Milestone 11: checkout UI.
- Milestone 12: payment UI integration.
- Milestone 13: express Review and Confirm.
- Milestone 14: account, guest, and reviews.
- Milestone 15: Admin Portal.
- Milestone 16: QA, UX review, and demo polish.

For each milestone:

- [ ] Write or confirm tests before implementation when behavior is deterministic.
- [ ] Implement only the current milestone or a clearly bounded slice.
- [ ] Run the milestone verification commands.
- [ ] Update `tracking/progress.md`, `tracking/debug.md`, and `tracking/test-cases.md`.
- [ ] Commit a small logical change when the milestone slice is verified.

Current active Milestone 16 polish slice:

- Round 4 Auth, Minicart, and Checkout surface polish is defined in `ROUND4_AUTH_MINICART_CHECKOUT_POLISH_PLAN.md`.
- The visual acceptance reference is `mockups/round4-auth-minicart-checkout-polish.html`.
- Foundation, auth, minicart, checkout/payment/order sheet, and pickup inventory wrapping are locally implemented and locally evidence-closed; deploy the Round 4 commit, then run the hosted Render evidence/review gate.
- Do not change PayPal, promo, checkout-draft, BOPIS, cart lifecycle, or auth semantics during this surface-polish slice.

## Stop Conditions

Stop and ask the user before proceeding if:

- PayPal behavior is not confirmed in `wiki-v2`.
- A PayPal API payload requires a business assumption not already documented.
- A change would alter BOPIS v1 Create Order semantics.
- A change would alter promo/tax/shipping calculation order.
- A change would alter cart sync or pending order resume semantics.
- POP MART assets are missing or too weak for customer presentation quality.
- Verification fails repeatedly.

## Verification Commands

Run from repo root:

```bash
bash scripts/check-agent-system.sh
git status --short --branch
```

Run from the demo folder after Milestone 1 creates scripts:

```bash
npm run typecheck
npm test
```

Use Playwright or browser QA after web pages exist for:

- 375px, 768px, 1024px, and 1440px screenshots
- sticky header and sticky payment bar overlap
- PayPal button/message layout stability
- checkout accessibility and focus behavior
