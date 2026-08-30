# TASK-0008 Execution — Round 1

- status: needs_review
- implementation_round: 1
- approved_plan_sha256: `856dad9effdede84a41264c043ca2293d33dd43f955e893dfb91e80926f18843`
- user_approval: `user:TASK-0008:2026-08-30:plan-approved`
- accepted_base: `71b77fd62128cdb475be46a769c9c07571f1accb`
- candidate_commit: pending at report creation; see executor handoff

## Delivered Boundary

- Migrated the retained PayPal contract/domain/repository behavior into active shared and Express paths with injected database access.
- Added bearer-authenticated `/api/v1/paypal/id-token`, `/api/v1/paypal/orders`, and capture adapters plus untouched raw `/webhooks/paypal` handling.
- Corrected the approved RBA order shape and fixed public FraudNet source while keeping merchant configuration server-only.
- Added per-document 128-bit Base64 CSP nonce parity across script/style policy and Vite PayPal/FraudNet placements without `unsafe-inline`.
- Added the bounded Vite consent, official-provider region, locked verification, failure/pending, reusable-pending/ready, and pre-activation handoff. No allowance, entitlement, usage, AI action, mobile client, other PSP, migration, or provider mutation was added.
- Removed only superseded Next payment adapters and the mixed payment checkout after active parity was green.

## Test-First Evidence

1. RED: `npm test -- server/src/domain/paypal/payload.test.ts`
   - 2 assertions failed as intended: retained `fixed_price`/item name and merchant-derived FraudNet source.
2. Focused GREEN:
   - shared/domain: 51 passed
   - Express PayPal/raw-webhook routes: 7 passed
   - production app/CSP: 21 passed
   - Vite PayPal/handoff/checkout: 11 passed
3. Actual configured PostgreSQL:
   - `node --env-file=.env.local node_modules/vitest/vitest.mjs run server/src/domain/paypal/repository.integration.test.ts`
   - 2/2 passed in 51.63s; repository cleanup restored baseline counts.
4. Local production browser:
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e -- tests/e2e/paypal-checkout.spec.ts --grep-invert "@sandbox|@hosted"`
   - 14/14 passed across desktop and exact 390px mobile.
5. Full/static:
   - `npm test`: 180 passed, 4 skipped
   - `npm run typecheck`: passed
   - `npm run lint`: passed
   - `npm run build`: passed; Vite transformed 127 modules
   - `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities
   - `git diff --check`: passed
   - no `supabase/**` diff from accepted base

## Honest Blockers And Limits

- The first browser attempt could not launch Playwright's missing bundled Chromium. The installed Google Chrome executable was then used and the entire local production matrix passed.
- No configured/authorized real PayPal sandbox or hosted listener run was performed. Merchant eligibility, exact provider payload acceptance, actual FraudNet collection, SDK approval/capture, listener subscription/delivery, and delayed vault-event propagation remain blocked in EVID-0003.
- No full provider IDs, raw tokens/signatures, bearer/cookie values, merchant identity, or raw FraudNet attempt value were retained in evidence.
