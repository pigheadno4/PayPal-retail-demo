# TASK-0008 Execution — Round 3

- status: needs_review
- implementation_round: 3
- approved_plan_sha256: `856dad9effdede84a41264c043ca2293d33dd43f955e893dfb91e80926f18843`
- user_approval: `user:TASK-0008:2026-08-30:plan-approved`
- focused_mockup_sha256: `9a7e8650227bd3b2a8689426a0b2cad49b2b05627a299d244bcfd7c05fa03def`
- focused_mockup_approval: `user:TASK-0008:2026-08-30:focused-mockup-approved`
- schema_override_approval: `user:TASK-0008:2026-08-30:duplicate-disposition-schema-extension-approved`
- base_candidate: `acf4fc191505e6e975771bd93d9339ab43941525`
- replacement_candidate: see executor handoff

## Closed Final Quality Findings

- FINDING-007: Create-order abort, transport failure, HTTP 5xx, malformed JSON, and unknown response shape now enter sanitized pending state before the PayPal SDK error callback can terminalize the customer flow. The same operation remains the only application owner; no capture or speculative second provider order is initiated.
- FINDING-008: Invalid-signature evidence is retained under a generated non-authoritative claim key. Its untouched payload still contains the supplied event ID, but it cannot claim or poison that authoritative ID. The later verified delivery with the same ID correlates and promotes once.
- FINDING-009: The approved additive schema records `duplicate_delivery_count` and `last_duplicate_received_at`. A verified duplicate atomically increments both on the one canonical verified event without changing `correlation_result` or duplicating raw payload.
- FINDING-010: Only a verified terminal failure exposes `Try PayPal again`; that action creates a fresh application operation and fresh request-ID pair while preserving the failed original. Pending status checks retain the existing operation.
- FINDING-006: The stale round-2 focused count is corrected below to 66/66.

## Test-First Evidence

1. Focused RED:
   - 9 assertions failed while 22 passed: five create-uncertainty classifications, invalid-signature authoritative-ID isolation, two duplicate-disposition persistence paths, and terminal-retry operation rotation.
2. Focused GREEN:
   - `npm test -- --run server/src/domain/paypal/service.test.ts server/src/domain/paypal/webhook.test.ts web/src/components/checkout/paypal-wallet-button.test.tsx web/src/components/checkout/payment-handoff.test.tsx`
   - 66/66 passed.
   - `npm run typecheck` passed.
3. Supabase migration and configured PostgreSQL:
   - CLI `2.114.0` help was checked before generation. `supabase migration new add_provider_event_duplicate_delivery_evidence` created `20260830115316_add_provider_event_duplicate_delivery_evidence.sql`.
   - Pre-push linked history matched at `20260813141941` and `20260829045606`; dry-run named only the new migration. `supabase db push --linked --skip-vault --yes` applied it, and post-push history shows local/remote parity for all three migrations.
   - `node --env-file=.env.local node_modules/vitest/vitest.mjs run server/src/domain/paypal/repository.integration.test.ts -t "owns one payment per intent" --reporter=verbose`
   - 1/1 exact PayPal/PostgreSQL proof passed in 46.49s; one unrelated repository test was skipped by the focus. It restored its fixture state and proved the fresh terminal retry, invalid-then-valid same event ID, one `matched` plus one `duplicate`, duplicate count/timestamp `1`, one canonical promotion/method, unchanged ownership, and zero allowance/usage.
   - Earlier non-isolated retries overlapped another copy of the same remote fixture and failed only global baseline comparison; the exact isolated proof above is authoritative.
4. Production browser and evidence capture:
   - `TASK0008_CAPTURE_EVIDENCE=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e -- tests/e2e/paypal-checkout.spec.ts --grep-invert "@sandbox|@hosted"`
   - 28/28 passed across desktop and exact 390px mobile. The 10 new focused cases cover the four uncertain create outcomes and fresh terminal retry in both viewports.
   - Matrix: `tracking/evidence/artifacts/EVID-0003/TASK-0008-MATRIX.md` plus 24 sanitized PNGs.

## Remaining Verification And Evidence Limits

- Full regression: 194 passed and 4 environment-gated tests skipped.
- Typecheck and lint passed; the production Node/Vite build passed with 127 transformed modules.
- Production dependency audit found 0 vulnerabilities. Workflow, delivery-loop, and agent-system validators passed.
- `supabase test db --linked supabase/tests/slice001_core_test.sql` is blocked because CLI `2.114.0` attempts to invoke Docker even with `--linked`; Docker Desktop is unavailable. The exact linked migration history and configured-PostgreSQL integration proof verify the added columns and behavior, but no pgTAP pass is claimed.
- No configured or authorized real PayPal sandbox/provider/hosted run was performed. Merchant eligibility, exact sandbox payload acceptance, actual FraudNet collection, real SDK approval/capture, hosted HTTPS, listener subscription/delivery, and delayed provider propagation remain blocked.
- No table, duplicate raw payload, canonical `correlation_result` rewrite, TASK-0004 allowance/activation, native mobile, other PSP, canonical authority, loop-control, or unrelated cleanup change is included.

## Rollback

Revert the round-3 application commit for runtime behavior. The linked database contains the approved additive migration; removing its two evidence columns would require a separately reviewed forward migration and is not performed by reverting application code.
