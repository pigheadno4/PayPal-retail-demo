# TASK-0008 Execution — Round 2

- status: needs_review
- implementation_round: 2
- approved_plan_sha256: `856dad9effdede84a41264c043ca2293d33dd43f955e893dfb91e80926f18843`
- user_approval: `user:TASK-0008:2026-08-30:plan-approved`
- focused_mockup_sha256: `9a7e8650227bd3b2a8689426a0b2cad49b2b05627a299d244bcfd7c05fa03def`
- focused_mockup_approval: `user:TASK-0008:2026-08-30:focused-mockup-approved`
- base_candidate: `22fedb6e2a1df9487acc242740750ce592bc778a`
- replacement_candidate: see executor handoff

## Closed Review Findings

- FINDING-001: Capture transport failure, HTTP 5xx, malformed data, and unknown errors now retain the same pending operation. Only the sanitized `payment_not_available` endpoint response terminalizes the browser state.
- FINDING-002: Production `frame-src` adds only documented `https://c.paypal.com`, with exact directive coverage.
- FINDING-003: The new 24-artifact matrix covers all six required states in both themes on desktop and exact 390px mobile, bound to the approved focused mockup. Historical Next and incomplete round-1 browser/build proof is explicitly superseded without deletion.
- FINDING-004: The webhook transaction now claims the unique provider event before readiness mutation and returns `duplicate` when a concurrent claim loses. Configured PostgreSQL proved one match, one duplicate, one event, one method/readiness promotion, unchanged ownership, and no allowance/usage.
- FINDING-005: A PayPal-router middleware applies `Cache-Control: private, no-store` before auth, validation, success, and mapped-error branches.

## Test-First Evidence

1. Focused RED:
   - Webhook atomic-loss test returned `matched` instead of `duplicate`.
   - Capture exception classifier was absent in four cases.
   - CSP/no-store assertions failed before implementation; the in-sandbox Supertest run also reproduced the known `listen EPERM` environment restriction.
2. Focused GREEN:
   - `npm test -- server/src/app.test.ts server/src/routes/paypal.test.ts server/src/domain/paypal/webhook.test.ts web/src/components/checkout/paypal-wallet-button.test.tsx`
   - 46/46 passed with local-port permission.
   - `npm run typecheck` passed.
3. Configured PostgreSQL:
   - `node --env-file=.env.local node_modules/vitest/vitest.mjs run server/src/domain/paypal/repository.integration.test.ts --reporter=verbose`
   - 2/2 passed in 50.30s and restored baseline counts. An earlier overlapping duplicate test process caused only a cleanup-baseline mismatch; the isolated rerun passed.
4. Production browser and evidence capture:
   - `TASK0008_CAPTURE_EVIDENCE=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e -- tests/e2e/paypal-checkout.spec.ts --grep-invert "@sandbox|@hosted"`
   - 18/18 passed across desktop and exact 390px mobile.
   - Matrix: `tracking/evidence/artifacts/EVID-0003/TASK-0008-MATRIX.md` plus 24 sanitized PNGs.

## Remaining Verification And Evidence Limits

- Full regression: 186 passed and 4 environment-gated tests skipped.
- Typecheck and lint passed; the production Node/Vite build passed with 127 transformed modules.
- Production dependency audit found 0 vulnerabilities; `git diff --check`, no-schema/protected-path, and sanitized evidence scans passed.
- No configured or authorized real PayPal sandbox/provider/hosted run was performed. Merchant eligibility, exact sandbox payload acceptance, actual FraudNet collection, real SDK approval/capture, hosted HTTPS, listener subscription/delivery, and delayed provider propagation remain blocked.
- No schema, TASK-0004 allowance/activation, mobile, other PSP, canonical authority, loop-control, or unrelated cleanup change is included.

## Rollback

Revert only the round-2 correction commit. No schema or provider-state rollback is required because this round performed no migration or real provider mutation.
