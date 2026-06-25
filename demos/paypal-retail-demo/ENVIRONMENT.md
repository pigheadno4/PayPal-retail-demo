# PayPal Retail Demo Environment Plan

## Purpose
This document captures the Milestone 0 environment decisions before implementation. It is a planning artifact, not a secrets file.

## Local Tooling Probe
Observed on 2026-05-26:
- Node.js: `v26.0.0`
- npm: `11.12.1`
- Supabase CLI: not installed on PATH

Implications:
- The first implementation pass can scaffold Node/React/Express scripts locally.
- Supabase migration work should wait until the Supabase CLI is installed/configured or an approved remote SQL path is available.
- After installing Supabase CLI, discover commands with `supabase --help` and `supabase <group> --help` before using it.

## Confirmed Milestone 0 Decisions
Confirmed on 2026-05-26:
- Supabase uses both paths: local Supabase CLI for migration/test iteration, plus a remote Supabase project for stable presentation data.
- PayPal sandbox credentials are supplied through local environment variables only. No PayPal or Supabase secrets are committed.
- TypeScript strict mode is the default for web, server, shared modules, tests, and seed tooling.
- Apple Pay and Google Pay do not block the core v1 demo. Local development verifies config, eligibility, fallback display, and Admin debug state; full wallet verification can use hosted preview or an approved HTTPS tunnel later.
- POP MART assets are local app assets under `web/public/assets/popmart/` using the naming convention below.

## Recommended Supabase Strategy
Use migrations and seed files in the repo as the source of truth.

Development options:
- Local Supabase CLI for schema/migration iteration and seed validation.
- Remote Supabase project for presentation-grade shared demo data.
- Use the same migration and seed source for local and remote so demos do not depend on manually edited dashboard state.

Selected approach: both local CLI and remote project.

Security rules:
- Browser uses Supabase publishable/anon credentials for Auth only.
- Express uses server-only Supabase credentials for application data access.
- Never expose service role, database password, or project secrets to the browser.
- If any `app` schema table is exposed later through Supabase Data API, add explicit grants and RLS policies before exposure.

## Recommended PayPal Strategy
Use PayPal sandbox credentials through local environment variables only.

Browser-safe:
- PayPal client ID can be returned by `GET /api/paypal/sdk-config`.
- PayPal environment, currency, locale, buyer country, sandbox test buyer country, components, and provider key can be returned by config APIs.

Server-only:
- PayPal client secret
- PayPal webhook ID
- PayPal webhook verification secrets or signing material
- Supabase service role key

SDK v6 market rules:
- In sandbox/test, backend `sandbox_test_buyer_country` maps to SDK v6 `createInstance({ testBuyerCountry })`.
- In production, omit `testBuyerCountry`.
- Pay Later message country is configured separately as `paylater_buyer_country`.
- Runtime eligibility remains the final rendering gate for PayPal, Pay Later, Venmo, Apple Pay, and Google Pay.

## Apple Pay And Google Pay Local Testing
Recommended v1 split:
- Local development verifies config, eligibility calls, fallback display, and Admin debug state.
- Full Apple Pay / Google Pay wallet verification should use an HTTPS origin such as a hosted preview or approved tunnel.

Selected approach: eligibility/debug/manual verification locally; full wallet verification later through hosted preview or approved HTTPS tunnel.

Reason:
- Apple Pay and Google Pay have browser/device/origin prerequisites that may not be reliable on plain localhost.
- The demo should not block core Delivery/BOPIS PayPal work on local wallet prerequisites.

## Environment Variable Shape
Use this as the first `.env.example` outline during scaffold.

Browser-safe Vite variables:
- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server variables:
- `PORT`
- `APP_BASE_URL`
- `ADMIN_PASSCODE`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYPAL_ENVIRONMENT`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_BN_CODE`
- `PAYPAL_DEFAULT_SANDBOX_TEST_BUYER_COUNTRY`

Optional local testing variables:
- `PUBLIC_HTTPS_ORIGIN`
- `PAYPAL_APPLE_PAY_DOMAIN`
- `PAYPAL_GOOGLE_PAY_MERCHANT_ID`

For PayPal SDK v6 client-token flows, prefer setting `PUBLIC_HTTPS_ORIGIN` to the browser-facing HTTPS preview or tunnel origin. Client tokens are domain-bound, and sandbox may reject localhost origins for vaulting/token authentication.

Delivery express can create local sandbox orders without `PUBLIC_HTTPS_ORIGIN`, but the backend omits PayPal shipping callback config and line-item product/image URLs when the resolved public origin is local HTTP. Set `PUBLIC_HTTPS_ORIGIN` for callback-enabled express shipping updates and provider-visible item links/images.

## Render Web Service Deployment

Use Render as a single Node Web Service when a public HTTPS origin is needed for PayPal sandbox QA.

Dashboard settings:

- Root directory: leave blank when the GitHub repository root is this demo folder; otherwise set `demos/paypal-retail-demo`.
- Build command: `npm ci && npm run build`.
- Start command: `npm start`.
- Health check path: `/api/health`.
- Node version: pin a Node 22.12+ runtime, for example `NODE_VERSION=22.16.0`.

Render environment variables:

- Set `APP_BASE_URL`, `PUBLIC_HTTPS_ORIGIN`, and `VITE_API_BASE_URL` to the exact Render HTTPS URL, for example `https://retail-demo.onrender.com`.
- Copy server-only secrets from the local `.env` into the Render Environment tab: `ADMIN_PASSCODE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_ENVIRONMENT`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_BN_CODE`, and `PAYPAL_DEFAULT_SANDBOX_TEST_BUYER_COUNTRY`.
- Copy browser-safe Supabase values into Render too: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Do not set `PORT`; Render injects it.

The compiled Express server binds to `0.0.0.0:$PORT`, serves `/api/*` as API routes, serves built assets from `web/dist`, and falls back non-API routes to the built Vite SPA.

## Local Asset Convention
POP MART assets are customer-specific and stay local to this demo.

POP MART target paths:
- `web/public/assets/popmart/products/{product-slug}-1.png` for the current generated primary product image.
- `web/public/assets/popmart/products/{product-slug}-{image-index}.png` when generated gallery coverage expands beyond the current one-image runtime MVP.
- `web/public/assets/popmart/categories/{category-slug}.svg`
- `web/public/assets/popmart/homepage/{section-slug}.svg`
- `web/public/assets/popmart/series/{series-slug}.svg`

The current POP MART runtime catalog intentionally seeds one product image per toy so API-backed PDP/gallery data does not point to missing second/third images. Generate additional local PNG gallery images before re-expanding seeded POP MART `product_images` rows to 3-4 images per product.

Generic profile target paths:
- `web/public/assets/generic/products/{product-slug}/01.webp`
- `web/public/assets/generic/categories/{category-slug}.webp`
- `web/public/assets/generic/homepage/{section-slug}.webp`

## Milestone 0 Exit Criteria
- Supabase strategy selected: both local CLI and remote project.
- PayPal sandbox credentials available through local env only.
- TypeScript strict-mode scaffold approach confirmed.
- POP MART asset handoff path and naming convention confirmed.
- `.env.example` created without secrets.
- Apple Pay / Google Pay local testing approach confirmed.
- `scripts/check-agent-system.sh` passes.
