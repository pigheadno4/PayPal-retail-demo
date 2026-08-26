# TASK-0003 Execution Report

- status: needs_review
- executor: task0003_executor
- task: TASK-0003
- approved_plan_sha256: `8db3db5791cc9cad84be0fe88d954ff25bc287e9b4601ca812fb09a399525173`
- plan_approval: `user:TASK-0003:2026-08-25:plan-approved`
- focused_visual_approval: `user:TASK-0003:2026-08-24:focused-mockup-approved`
- round_1_candidate_commit: `aa3e969fd14660b73ead988fd26d630b7edbb53a`
- round_2_candidate_commit: `7571e7c4d13ac2e2717e22567ca178618647c51e`
- round_3_candidate_commit: `ef206c47013c9685e20500f3729fbe4294e5c10f`
- round_4_candidate_commit: supplied in the executor handoff after this report is committed
- review_source: `tracking/tasks/TASK-0003/review-quality.md`

## Delivered Boundary

Implemented the direct first-party PayPal Wallet save-with-purchase handoff on the existing checkout route: server-issued user ID token, documented FraudNet/CSP contract, exact Orders v2 payload, stable operation-specific idempotency, authoritative nested capture verification, durable verified-funded arrangement, immediate or delayed reusable-readiness reconciliation, and sanitized pending/ready/cancel/failure UI states. The review corrections serialize distinct operation IDs into exactly one intent/quote owner without holding the repository lock across the provider call, restore that owner during re-entry, persist exact webhook dispositions atomically, and expose only verified funding to the activation handoff. Only a definitive PayPal rejection terminalizes create or capture. Create/capture transport interruption, invalid capture projection, and capture correlation mismatch preserve normalized state and return the existing sanitized unresolved contract; the routes emit HTTP 202 and the client renders `Confirming your payment` rather than claiming non-payment. The official `@paypal/react-paypal-js@10.3.0` wrapper owns approval initiation and receives the supported `dataCspNonce` option.

No migration, entitlement/allowance/usage behavior, later renewal charge, refund, generic PSP abstraction, new page, mobile-app integration, or unrelated refactor was introduced.

## Verification Record

- Review-fix red: 11 assertions failed while 28 passed across the seven focused files, reproducing all four independent findings before production edits.
- Focused green: 40/40 passed across service, webhook, proxy, component, and route coverage.
- Scoped round-3 red: the owner transport-interruption regression failed 1/1 because the service threw `payment_unavailable` while correctly leaving the durable operation unfailed.
- Scoped round-3 green: the exact regression passed 1/1; the affected service, route, capture-classifier, and customer-state group passed 23/23. Existing definitive-failure, concurrent-pending, and verified cases remained green.
- Scoped round-4 red: 5 focused assertions failed while 16 passed, reproducing mismatch mutation, invalid projection, create interruption, create-route status, and client classification gaps.
- Scoped round-4 green: 28/28 passed across the affected create/capture service, routes, classifier, and customer-state files. Every mismatch fixture asserts zero funded and zero failed normalized mutation; definitive create/capture rejection remains terminal.
- Full unit regression: 83 passed, 2 environment-gated tests skipped.
- Actual remote Supabase PostgreSQL: 2/2 passed in 60.01 seconds. TASK-0003 ownership/disposition transitions and the unrelated TASK-0002 repository proof both restored all affected tables to baseline.
- Local Playwright: routine and explicit production-promotion runs each passed 14/14 across desktop and exact 390px mobile with a labeled provider test double; hosted case skipped.
- Typecheck and lint: passed with zero findings.
- Dependency audit: 0 vulnerabilities.
- Default Turbopack build: blocked by the managed-environment internal worker port bind already recorded for this task.
- Approved Webpack fallback: passed and generated every planned route.
- `git diff --check`: passed.

The production CSP keeps both `script-src` and `style-src` nonce-bound without `unsafe-inline` and uses the current directive-specific PayPal SDK origins. Next development requires a style-only `unsafe-inline` exception for framework-injected style blocks; scripts remain nonce-bound in both environments.

Routine Playwright now writes only to the per-test output directory. Tracked evidence changes require `TASK0003_CAPTURE_EVIDENCE=1`; that explicit run uses the production server, rejects any `nextjs-portal`, and promotes only the review, funding-pending, and ready light/dark matrix. The retained matrix covers desktop and exact 390px mobile, keyboard-reachable visible focus, applicable controls at least 44 by 44 pixels, no horizontal overflow, and zero console/page errors. Pre-existing dirty screenshots were not overwritten.

## Evidence Status

`tracking/evidence/EVID-0003.md` is intentionally `blocked`. Local/fake tests prove application behavior only; actual PayPal sandbox merchant eligibility, FraudNet collection, real SDK approval/capture, configured listener subscription, webhook delivery, and Render-hosted behavior were unavailable and were not simulated as provider proof.

## Database Audit And Cleanup

The first remote run exceeded the original 30-second harness timeout. A read-only audit resolved rows only through the exact run-owned markers and found zero surviving operations; the test's `finally` cleanup had completed asynchronously, so no manual deletion occurred. The harness now allows 120 seconds, retains exact FK-safe cleanup in `finally`, and compares all affected table counts before/after.

The review-fix red run then reproduced two distinct operation IDs both becoming owners and separately reproduced the exact webhook disposition insert failure with zero surviving event rows. Each red run restored all affected table counts. The isolated green rerun passed in 37.02 seconds with one owner/one waiter, one arrangement, exact disposition persistence, and baseline restoration. The approved schema prevents constructing two simultaneous pending vault candidates for the same merchant/environment/customer; therefore the ambiguous branch is covered by the in-memory webhook unit test, while actual PostgreSQL directly proves the `ambiguous` disposition write contract. No schema change was made.

Round 4 does not change repository code, SQL, schema, operation persistence, or cleanup. The available rollback-only real PostgreSQL suite was nevertheless rerun and passed 2/2 in 60.01 seconds, including its final baseline assertions. No manual cleanup was required.

## Rollback

Revert the round-4 candidate to restore the previous mismatch/create customer handling and Playwright evidence workflow. Revert earlier candidates only if the complete TASK-0003 feature must be removed. Remote test fixtures were removed and verified against their pre-run counts; no migration, provider, or hosted state requires rollback.
