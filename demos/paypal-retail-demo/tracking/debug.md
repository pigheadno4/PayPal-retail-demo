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
