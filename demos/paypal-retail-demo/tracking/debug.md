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
