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

Current phase: **Milestone 7 is merged to `main`. Milestone 8 web app shell WIP has been restored from stash `m8-web-shell-wip` onto branch `milestone8-web-shell`; app shell/routing, profile assets, theme tokens, auth modal shell, and minicart shell are in progress. Local Supabase migration verification remains blocked until Docker is available**.

Milestone 0 decision gates confirmed on 2026-05-26:
- Supabase strategy: both local CLI and remote project.
- PayPal sandbox strategy: credentials through local env only, no committed secrets.
- TypeScript scaffold: strict mode for app-owned web, server, shared, test, and seed code.
- POP MART assets: local app assets under `web/public/assets/popmart/` with slug-based naming.
- Apple Pay / Google Pay: local eligibility/debug/manual verification; full wallet verification later through hosted preview or approved HTTPS tunnel.

Operational setup still required during Milestone 1 and before migrations:
- Create `.env.example` without secrets during scaffold.
- Install or configure Supabase CLI before Milestone 2 migrations.
- Verify final PayPal sandbox account capabilities before payment implementation.

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
