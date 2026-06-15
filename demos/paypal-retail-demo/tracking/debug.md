# Debug

Use this file for implementation investigations, root causes, fixes, and verification notes.

Do not store secrets, credentials, private customer data, raw payment tokens, or sensitive PayPal/Supabase keys here.

## 2026-05-26

- `npm install` produced no output for roughly two minutes in the tool session but completed successfully. Avoid treating a quiet install as failed unless it exits non-zero or leaves no lockfile/modules after enough time.
- Dependency evidence: `@paypal/react-paypal-js@9.2.0` depends on `@paypal/paypal-js@9.7.0`; `node_modules/@paypal/paypal-js/types/v6/index.d.ts` includes `testBuyerCountry?: string` in `BaseCreateInstanceOptions`.
- Adding the Supabase CLI with `npm install supabase --save-dev` required network approval after an initial sandbox DNS failure.
- Supabase CLI `2.101.0` needs access to `~/.supabase` for cache/telemetry files; CLI commands that touch that path require elevated execution in this sandbox.
- `npx supabase db reset --local --no-seed` failed because Docker is not available/running: `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`. Migration apply verification is blocked until Docker Desktop/local Supabase is available.
- `npx supabase migration list --linked` failed without `SUPABASE_DB_PASSWORD`, but `npx supabase db push --linked`, `npx supabase db advisors --linked`, and `npx supabase db query --linked ...` worked through the linked project login role.
- Remote advisor pass initially found `app.set_updated_at` mutable search path and public execution on `public.rls_auto_enable()`. Migration `20260526094945_harden_function_search_paths.sql` fixed those; rerun returned `No issues found`.
- First storefront seed apply failed on `products_max_quantity_check` because unreleased products used `max_quantity_per_order = 0`. Fix: keep release blocking in `release_status` and seed a positive demo cap.
- Second storefront seed apply failed with `ON CONFLICT DO UPDATE command cannot affect row a second time`. Root cause: product image IDs were keyed by product slug only, and product slugs repeat across profiles. Fix: include profile slug in generated product image IDs and add a duplicate-ID regression test.
- `npm run seed:summary` can fail in the sandbox with `listen EPERM` on a `tsx` IPC pipe under `/var/folders/...`. Rerun outside the sandbox for seed-runner verification; the generated data is deterministic and does not need network access.
- First guarded auth seed apply failed because `auth.users.confirmed_at` is a generated column in the linked Supabase project. A follow-up generated-column check also showed `auth.identities.email` is generated from `identity_data`. Fix: do not insert generated auth columns and keep regression coverage in seed SQL tests.

## 2026-05-31

- Express app tests cannot bind a TCP listener in this sandbox: `listen EPERM: operation not permitted 0.0.0.0`. Fix: use an in-process `IncomingMessage`/`ServerResponse` harness for API smoke tests instead of opening a local port.
- Avoid `npx tsx ...` probes when `tsx` is already installed locally but `npx` still attempts registry resolution; network-restricted runs can fail with `ENOTFOUND registry.npmjs.org`.

## 2026-06-01

- During the cart repository TDD pass, the first green attempt preserved stale merged cart price snapshots. Fix: run shared cart refresh immediately after guest-to-authenticated merge and persist the refreshed line prices before returning the cart.
- Server typecheck caught that `CartApiResponse` is currently the generic catalog JSON type; nested typed DTOs such as the cart binding need JSON-compatible index signatures or explicit JSON mapping.
- Checkout repository typecheck/lint caught two useful boundaries: Supabase database rows should stay snake_case and map into shared camelCase helpers explicitly, and repository imports should avoid route input types unless they are referenced directly.
- A linked Supabase read query briefly failed with a TLS handshake timeout while initializing the CLI login role; a single retry succeeded and returned `checkout_drafts = 2`.
- Checkout promo implementation caught an `exactOptionalPropertyTypes` issue: build `PromoEvaluationInput` without `selectedCodes` when no explicit selection exists, rather than passing `selectedCodes: undefined`.
- Guest order lookup remote verification hit the same transient Supabase CLI login-role TLS handshake timeout once; a single retry succeeded and returned `orders = 5` and `guest_order_access = 1`.

## 2026-06-03

- M8 web-shell WIP was intentionally parked in Git stash `m8-web-shell-wip` before continuing Milestone 7 webhook/saved-payment work.
- PayPal webhook verification uses the PayPal verification API instead of local signature math because the local API spec source includes `POST /v1/notifications/verify-webhook-signature` with required notification header fields and `webhook_event`.
- Saved-payment capture handling intentionally runs only for authenticated buyers with `vault_requested = true`; guest and one-time captures do not create saved payment records.
- PayPal webhook processing reserves the `provider + event_id` audit row before mutation so PayPal retries do not repeat saved-payment/order state updates.
- M8 web-shell stash `m8-web-shell-wip` was applied after fast-forwarding `milestone8-web-shell` to merged M7; the stash entry is intentionally kept as a recovery point until the M8 slice is committed and reviewed.

## 2026-06-05

- Card Fields SDK v6 uses PayPal-hosted iframes that fill their parent containers. The checkout card box therefore gives number/expiry/CVV containers stable `min-height` and `width` before rendering `PayPalCardNumberField`, `PayPalCardExpiryField`, and `PayPalCardCvvField`.
- Apple Pay and Venmo are available as React SDK v6 components in `@paypal/react-paypal-js@9.2.0`, but their custom elements only render after SDK hydration and real wallet eligibility. Server-rendered tests therefore assert the wrapper/status/required-component metadata, not a hydrated wallet element.
- The installed React SDK v6 package does not export a Google Pay React button component. Google Pay uses the PayPal JS SDK `createGooglePayOneTimePaymentSession()` plus Google's PaymentsClient-controlled button/payment-data flow, so the current checkout surface is runtime-gated until both the PayPal Google Pay session and Google PaymentsClient are available.

## 2026-06-07

- Done-milestone gap root cause: some M9-M12 UI items were marked complete when the screen layout and component tests existed, but the actual buyer actions were still shell-level. Evidence includes checkout address inputs rendered as `readOnly`, checkout option rows rendered as non-changing fixture choices, section buttons without submit behavior, and PDP/cart/minicart action controls that render without completing the promised cart/payment session behavior.
- Prevention rule: do not close a UI milestone unless every visible action is wired, disabled with a buyer-facing reason, or explicitly recorded as deferred. Completion evidence must include interaction tests or manual verification notes, not only render/snapshot coverage.
- M11.5 interaction testing needed DOM helpers that were not present in the existing test stack. `npm install --save-dev @testing-library/react @testing-library/user-event jsdom` first failed in the sandbox with `ENOTFOUND registry.npmjs.org`; rerunning with network approval succeeded. `npm audit --omit=dev` reports 0 production vulnerabilities. Full dev audit reports a critical Vitest `<4.1.0` advisory; fixing requires a breaking Vitest 4 upgrade, so leave it for a dedicated tooling maintenance slice rather than bundling it into M11.5 behavior work.

## 2026-06-14

- Missing official PayPal surfaces root cause: checkout SDK config plumbing had three local-dev issues (`createApiClient()` ignored `VITE_API_BASE_URL`, Vite `root: "web"` did not load the demo-root `.env`, and Express did not emit CORS headers for the Vite origin). PDP/cart/minicart also remained local HTML express buttons from M11.5, so they route to Review and Confirm without mounting official SDK controls or invoking `/api/paypal/orders/express-delivery`.
- Prevention rule: payment-surface milestones must verify the hydrated SDK/runtime element in browser QA for every promised page placement, not only static text/buttons or route transitions. If an entry point is intentionally shell-only, the task must stay open and the UI must say it is deferred or disabled.
- Supabase distinction: `.env` stores the URL and service-role credentials, but checkout/cart/payment flows still depend on the API server reaching Supabase over HTTPS for cart, checkout draft, promo, shipping, tax, and order data. PayPal SDK config can render from PayPal/env config, but section submit and create-order flows can hang or fail if Supabase fetches fail.
- Live UX audit reopened checkout recovery items: initial checkout should not show the PayPal button before Payment is active; Delivery shipping/billing submits take too long and need visible loading/error behavior; saved sections must collapse with Edit controls; shipping options must not start as saved and must recalculate Order Summary; PayPal popup closes with create-order failure when backend data dependencies fail.
- Process root cause: prior tests asserted route transitions, selected labels, or static rendered text, but did not assert hydrated third-party SDK DOM, live backend success/error states, loading affordances, or exact accordion post-submit state. Future payment UI work needs browser QA plus tests that fail on shell-only controls.
- Checkout recovery root causes: `CheckoutPage` previously rendered the selected payment action from the active draft even when the Payment step was collapsed; `App` sent fixture draft IDs such as `draft_delivery_123` to Supabase-backed checkout endpoints instead of creating a live draft UUID first; and `App` caught checkout draft API failures and returned the previous data, causing `CheckoutPage` to mark failed saves as successful.
- Fix: gate all selected payment actions behind the expanded Payment step, create/reconcile a server checkout draft UUID before live PATCH calls, propagate App checkout update failures back into the accordion, and render inline `role="alert"` retry copy while preserving the edited section.
- Remaining open risk: PayPal create-order failure handling still needs the same visible merchant-side failure treatment, including buyer-safe error copy and debug evidence when Supabase or PayPal dependencies fail.
- Agent-system prevention update: the repo-level demo protocol and standard/complex templates now carry the reusable rule, so future generated demos should ask for multi-step state contracts, official SDK browser evidence, and API loading/success/failure verification before closing UI/payment milestones.
- PDP/cart/minicart express recovery root cause: the M11.5 local route buttons were never replaced by SDK-backed payment controls, and the frontend cart model dropped `cart_public_id`, leaving no active cart binding for express create-order. Fix: preserve `cart_public_id` in `CartData`, add a cart-bound express create-order request builder, mount `DeliveryExpressAction` through `PayPalSdkProviderScope` for PDP/cart/open-minicart, and route to Review and Confirm only from the PayPal approval callback. Also fixed `PayPalSdkProviderScope` to use the App-provided API client by default so SDK config requests are testable and consistent.
- Plan alignment finding: existing M13 items covered generic Supabase/create-order failure and popup feedback, but did not explicitly cover browser cart restore, checkout route cart continuity, minicart quantity editing, or Pay Later v6 eligibility/detail gating. Fix: add M13.1 before capture and align `IMPLEMENTATION_TASKS.md`, `PLAN.md`, `tracking/todos.md`, `tracking/test-cases.md`, `UX_STATE_CONTRACT.md`, and `IMPLEMENTATION_PLAN.md`.
- Live browser audit root cause for checkout draft/cart failures: the browser had fixture cart state with `cartPublicId`, but no persisted raw `cart_client_secret`; frontend API calls did not attach paired `x-cart-id` and `x-cart-secret` headers, while the backend guest cart middleware requires both. Result: checkout draft creation and cart quantity sync can fail even though the header visually shows a cart.
- Checkout submit failure path observed in the browser: Delivery shipping submit attempted `POST /api/checkout/drafts?market=US`, returned a failed API request, and correctly kept an inline retry error visible. The open fix is to bind a real server cart before draft creation so the happy path can advance.
- Cart durability audit: adding an item could update the in-memory header count, but navigation/refresh restored the fixture/default cart because the browser did not persist and reload a server cart binding as source of truth.
- Minicart audit: quantity controls are missing from the drawer, so the minicart cannot yet satisfy the same editable-cart contract as the full cart.
- PayPal surface audit: backend SDK config returned browser-safe PayPal config, including sandbox buyer-country data and components, but local SDK script loading could time out. PayPal official button appeared in cart/minicart after SDK hydration; Pay Later reported readiness in the slot but did not render a visible official Pay Later button, so eligibility/details gating and fallback copy remain open.
- Pickup audit: guest Pickup in the US market showed a GB postcode (`W1F 7JL`), default-address behavior, and a preselected POP MART Soho store before ZIP/postcode submit. Fix requires separate guest/logged-in initial states and active-market-only fixture defaults.
- Computer Use note: Computer Use was useful for Chrome visual confirmation and keyboard-level app observation, but element-click interactions were flaky for this audit. Playwright remained the deterministic tool for click/network/console evidence.
- Computer Use reload timing note: immediately after a browser reload, the cart page can briefly show initial static fixture state (`Storefront ready`) before the async server-cart restore finishes. Treat cart persistence as verified only after the live status reaches `Restored saved cart` or `Prepared guest cart`; otherwise a working restore path can look like a false cart reset.
