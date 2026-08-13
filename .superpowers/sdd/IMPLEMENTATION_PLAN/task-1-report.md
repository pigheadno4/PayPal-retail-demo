# TASK-0001 Report — Runtime And Server-Owned Persistence Foundation

Status: complete with one external-verification concern.

## Files changed

- `demos/ai-service-subscription-pilot/.node-version`
- `demos/ai-service-subscription-pilot/package.json`
- `demos/ai-service-subscription-pilot/package-lock.json`
- `demos/ai-service-subscription-pilot/next.config.ts`
- `demos/ai-service-subscription-pilot/tsconfig.json`
- `demos/ai-service-subscription-pilot/postcss.config.mjs`
- `demos/ai-service-subscription-pilot/eslint.config.mjs`
- `demos/ai-service-subscription-pilot/vitest.config.ts`
- `demos/ai-service-subscription-pilot/playwright.config.ts`
- `demos/ai-service-subscription-pilot/.env.example`
- `demos/ai-service-subscription-pilot/src/server/config/env.ts`
- `demos/ai-service-subscription-pilot/src/server/config/env.test.ts`
- `demos/ai-service-subscription-pilot/src/server/db/client.ts`
- `demos/ai-service-subscription-pilot/src/lib/supabase/browser.ts`
- `demos/ai-service-subscription-pilot/src/lib/supabase/server.ts`
- `demos/ai-service-subscription-pilot/src/lib/supabase/proxy.ts`
- `demos/ai-service-subscription-pilot/src/proxy.ts`
- `demos/ai-service-subscription-pilot/supabase/config.toml`
- `demos/ai-service-subscription-pilot/supabase/migrations/20260813141941_slice001_core.sql`
- `demos/ai-service-subscription-pilot/supabase/tests/slice001_core_test.sql`

The runtime/configuration and env test files were preserved from the pre-existing partial implementation and reviewed. The server database and Supabase cookie-client modules were added to complete the documented Task-0001 interface.

## Migration applied

- Linked project: `puwzifjshgfmeregidev`
- Migration: `20260813141941_slice001_core.sql`
- Apply result: successful through `./node_modules/.bin/supabase db push --linked`.
- The migration was created only with `./node_modules/.bin/supabase migration new slice001_core`, then edited with `apply_patch`.
- It creates only the eleven planned `app_private` tables, indexes every foreign key, revokes browser-role schema/table/sequence privileges, and enables and forces RLS as a defense-in-depth boundary.

## Verification evidence

| Command | Result |
| --- | --- |
| `npm test -- src/server/config/env.test.ts` before schema migration | Passed: 1 file, 3 tests. The existing env parser was already green; its schema test counterpart then failed against the empty linked DB with `app_private` absent. |
| `./node_modules/.bin/supabase db query --linked --file supabase/tests/slice001_core_test.sql --agent no` before migration | Failed as expected: SQLSTATE `3F000`, `schema "app_private" does not exist`. |
| `./node_modules/.bin/supabase db push --dry-run --linked` | Passed: would apply only `20260813141941_slice001_core.sql`. |
| `./node_modules/.bin/supabase db push --linked` | Passed: migration applied to linked project. |
| `./node_modules/.bin/supabase db query --linked --file supabase/tests/slice001_core_test.sql --agent no` after migration | Passed: exit 0; final pgTAP result `ok 33 - all persisted instants retain timezone information`. The contract asserts the 11 tables, no browser schema usage, RLS/forced RLS, FK indexes, real `500 + 53 = 553` quote persistence and incorrect-total rejection, provider-event uniqueness rejection, and duplicate pending-vault correlation rejection. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm test -- src/server/config/env.test.ts` | Passed: 1 file, 3 tests. |
| Read-only linked schema diagnostic | Passed: 11 RLS-enabled/forced tables; 0 unindexed foreign keys; no `anon`, `authenticated`, or `public` `app_private` usage; 0 non-`timestamptz` persisted instants. |
| `./node_modules/.bin/supabase advisors --help` | No advisor subcommand is available in project-local Supabase CLI 2.114.0. |

## Remote limitations

- `supabase test db --linked` cannot run: Supabase’s pg_prove runner requires Docker, which is unavailable. The required direct fallback was used for remote contract execution.
- `db push --linked` applied the migration, but warned it could not cache the migrations catalog because that cache/export path requires Docker. This did not prevent the linked migration application.
- An attempted `npm audit --omit=dev --audit-level=high` could not contact npm in the sandbox. The escalation request was rejected because sending the dependency inventory to npm’s audit endpoint was not explicitly authorized. No alternative network workaround was attempted.

## Self-review

- Scope is limited to Task-0001 runtime, private persistence, and Supabase session/database interfaces; no customer flow, PayPal API behavior, or later-slice tables were added.
- All primary IDs are `bigint generated always as identity`; externally visible references are UUIDs; money uses integer cents; stored instants use `timestamptz`.
- `quotes_amounts_balance` enforces the actual cents arithmetic, including tax rounding; the pgTAP contract proves both a valid $5.53 quote and a rejected mismatched total.
- `payment_operations_pending_vault_unique` is a partial unique index on merchant/environment/PayPal-customer when vault status is pending; the pgTAP contract proves a duplicate tuple is rejected.
- `provider_events_provider_event_unique` and the pgTAP duplicate-insert check provide provider-event idempotency.
- `app_private` is absent from the exposed API schemas and explicit grants are revoked from `PUBLIC`, `anon`, and `authenticated`. Server-only Postgres access lives in `src/server/db/client.ts`.

## Concerns for independent review

1. Production dependency audit requires explicit authority to send the dependency inventory to npm; it remains unverified in this environment.
2. Local `supabase test db` remains unavailable without Docker, so pgTAP proof is linked-remote direct-query evidence rather than the CLI’s local pg_prove output.
3. The temporary database test inserts are wrapped in the test file transaction and rolled back; no fixture records persist remotely.

## Fix round 1/5 — environment and SSR session hardening

### Changed files

- `demos/ai-service-subscription-pilot/src/server/config/env.ts`
- `demos/ai-service-subscription-pilot/src/server/config/env.test.ts`
- `demos/ai-service-subscription-pilot/src/lib/supabase/browser.ts`
- `demos/ai-service-subscription-pilot/src/lib/supabase/browser.test.ts`
- `demos/ai-service-subscription-pilot/src/lib/supabase/server.ts`
- `demos/ai-service-subscription-pilot/src/lib/supabase/server.test.ts`
- `demos/ai-service-subscription-pilot/src/lib/supabase/proxy.ts`
- `demos/ai-service-subscription-pilot/src/lib/supabase/proxy.test.ts`
- `demos/ai-service-subscription-pilot/vitest.config.ts`
- `demos/ai-service-subscription-pilot/supabase/tests/slice001_core_test.sql`

### Fixes

- Replaced the browser-secret denylist with an explicit three-name `NEXT_PUBLIC_*` allowlist. Any other browser-prefixed name, including service-role, Resend, and token-style names, now fails validation before Zod can strip it.
- Applied matching `SameSite=Lax` cookie options and production-only `secure: true` behavior to browser, server, and proxy Supabase clients. Development remains `secure: false` for localhost.
- The proxy now accepts the second `setAll` header argument from `@supabase/ssr` 0.12.4 and copies it to the rebuilt `NextResponse`, preserving private/no-store protections with refreshed session cookies.
- Removed the server helper's cookie-writing callback. Server Components cannot safely attach the paired no-store response headers; the proxy is the only refresh writer and therefore owns both cookie and cache-header emission.
- Added pgTAP proof that `app_private` has exactly eleven tables and that `CREATE` is revoked from `PUBLIC`, `anon`, and `authenticated`.

### TDD and verification

| Command | Result |
| --- | --- |
| `npm test -- src/server/config/env.test.ts src/lib/supabase/browser.test.ts src/lib/supabase/server.test.ts src/lib/supabase/proxy.test.ts` before fixes | Failed as expected: three non-allowlisted public names were accepted; all three clients lacked cookie options; proxy did not preserve refresh headers. |
| Same focused test command after fixes | Passed: 4 files, 9 tests. |
| `./node_modules/.bin/supabase db query --linked --file supabase/tests/slice001_core_test.sql --agent no` | Passed: exit 0; final pgTAP result `ok 37 - all persisted instants retain timezone information`. |
| `npm run typecheck && npm run lint && npm test` | Passed: typecheck, lint, 4 files / 9 tests. |

No migration or dependency file changed in this fix round, so no linked migration push or npm audit was required. The existing local-Docker limitation and initial npm-audit authorization concern remain unchanged.
