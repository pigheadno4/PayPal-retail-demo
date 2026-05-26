# Debug

Use this file for implementation investigations, root causes, fixes, and verification notes.

Do not store secrets, credentials, private customer data, raw payment tokens, or sensitive PayPal/Supabase keys here.

## 2026-05-26

- `npm install` produced no output for roughly two minutes in the tool session but completed successfully. Avoid treating a quiet install as failed unless it exits non-zero or leaves no lockfile/modules after enough time.
- Dependency evidence: `@paypal/react-paypal-js@9.2.0` depends on `@paypal/paypal-js@9.7.0`; `node_modules/@paypal/paypal-js/types/v6/index.d.ts` includes `testBuyerCountry?: string` in `BaseCreateInstanceOptions`.
- Adding the Supabase CLI with `npm install supabase --save-dev` required network approval after an initial sandbox DNS failure.
- Supabase CLI `2.101.0` needs access to `~/.supabase` for cache/telemetry files; CLI commands that touch that path require elevated execution in this sandbox.
- `npx supabase db reset --local --no-seed` failed because Docker is not available/running: `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`. Migration apply verification is blocked until Docker Desktop/local Supabase is available.
