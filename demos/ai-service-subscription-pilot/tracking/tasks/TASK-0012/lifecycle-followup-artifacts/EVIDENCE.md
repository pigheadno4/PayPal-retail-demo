# TASK-0012 lifecycle follow-up — local synthetic evidence

Baseline: `a77413aba0be02b61f6f05479e96afee203be36e`. This evidence is mocked/local only, not hosted PayPal popup, payment, capture, webhook, vault or account recovery proof. No provider replay or database mutation was performed.

## Red / green evidence

- Real mounted application browser tests: four meaningful red failures showed `closed: 1` and `sameScript: false` during deferred capture or creation settlement. After the stable subtree fix, all four passed.
- Eight rejection diagnostic fixtures failed before enrichment because the response record had no `issues` field. They passed after the fixed enum enrichment.
- Duplicate deferred approval regression failed with two capture calls before the private in-flight guard. It passed with exactly one capture. Fake-hook component tests are complementary; actual parent/child mount proof comes from the browser tests.
- Final full mocked browser suite: **46 passed, 2 explicitly skipped hosted/provider tests**. Final focused lifecycle browser suite: **4 passed**.
- Final focused unit selection includes wallet, quote, HTTP gateway and diagnostics files. Full unit results and the unrelated no-database harness failure are recorded in the primary execution report. An unset/skipped integration fixture is not database proof.

For each of the four lifecycle scenarios (desktop and 390px, create and capture): unsettled callback counters are `{constructed:1,closed:0,settled:0,sameScript:true}`; after contained settlement and a read-only status check they are `{constructed:1,closed:0,settled:1,sameScript:true}`. Create is called once. Capture is called zero times for unknown creation and once for the capture scenario. External failed network requests are zero; all provider/auth/FraudNet routes are fulfilled or blocked by the local harness. Progress/result hides the payment subtree with `hidden` and `inert`, excluding its payment button from accessibility/focus. Theme rerender does not recreate the control. Two delayed errors do not replace the pending result. Actual expiry/unmount regressions still pass.

The `green-final` screenshots contain synthetic labels only: desktop/mobile, light/dark contained results, and active capture verification. Focused tests assert visible status focus, 44px minimum action size and no horizontal overflow.

## Safe issue label source mapping

All 36 provider strings below are an observational subset of the **Create order** section of [PayPal Orders v2 error messages](https://developer.paypal.com/api/orders/v2/error-messages), checked 2026-10-08. They are not a new classification policy or a claim about the actual hosted HTTP 422. Any unrecognized, absent, malformed or hostile issue becomes `unknown_issue`; output is deduplicated and bounded to these 36 values plus that one sentinel.

- Request/validation: `PREVIOUS_REQUEST_IN_PROGRESS`, `INVALID_ACCOUNT_STATUS`, `INVALID_ARRAY_MAX_ITEMS`, `INVALID_ARRAY_MIN_ITEMS`, `INVALID_COUNTRY_CODE`, `INVALID_PARAMETER_SYNTAX`, `INVALID_STRING_LENGTH`, `INVALID_PARAMETER_VALUE`, `MISSING_REQUIRED_PARAMETER`, `NOT_SUPPORTED`, `PAYPAL_REQUEST_ID_REQUIRED`, `MALFORMED_REQUEST_JSON`, `PERMISSION_DENIED`, `MALFORMED_REQUEST`, `PAYEE_NOT_CONSENTED`.
- Amount/payment/payee: `AMOUNT_MISMATCH`, `BILLING_AGREEMENTS_CANNOT_BE_USED_FOR_SUBSCRIPTIONS`, `DECIMAL_PRECISION`, `INVALID_CURRENCY_CODE`, `ITEM_TOTAL_MISMATCH`, `ITEM_TOTAL_REQUIRED`, `PAYMENT_DENIED`, `PAYEE_ACCOUNT_INVALID`, `PAYEE_ACCOUNT_LOCKED_OR_CLOSED`, `PAYEE_ACCOUNT_RESTRICTED`, `PAYMENT_ORIGIN_NOT_ENABLED`, `UNSUPPORTED_PAYMENT_SOURCE_FOR_SUBSCRIPTIONS`, `TAX_TOTAL_MISMATCH`, `TAX_TOTAL_REQUIRED`, `UNSUPPORTED_INTENT`, `INSTRUMENT_DECLINED`, `INCOMPATIBLE_PARAMETER_VALUE`.
- Vault instructions/owner: `VAULT_INSTRUCTION_DUPLICATED`, `VAULT_INSTRUCTION_REQUIRED`, `MISMATCHED_VAULT_OWNER_ID`, `VAULT_OWNER_ID_NOT_SUPPORTED`.

Fixed sanitized examples only:

```json
{"stage":"create_response","outcome":"failure","category":"http","httpStatus":422,"issues":["AMOUNT_MISMATCH"]}
{"stage":"create_response","outcome":"failure","category":"http","httpStatus":422,"issues":["INSTRUMENT_DECLINED","AMOUNT_MISMATCH","unknown_issue"]}
```

Rejection JSON is consumed once. Existing initial-create payload/request ID and exception classification are unchanged. Only existing `INSTRUMENT_DECLINED` remains definitive, and a mixed unknown rejection remains uncertain. Capture emits no initial-create diagnostic and keeps the existing policy. Throwing diagnostic sinks cannot affect payment decisions. No raw provider response, customer, order, token, URL, message, stack or header is included.

## Verification limitations

Actual runtime: Node `v26.0.0`, not intended `24.18.0`. Build has the existing large-chunk warning. The first browser attempt used the wrong synthetic auth origin and was not counted as red evidence. A first full browser attempt overlapped a build that rewrote shared `dist` assets; it was invalidated and stopped, then the exact fixture was rebuilt and a fresh full run passed. Those excluded attempts remain untracked, not staged as acceptance evidence. Prior task result folders were preserved.

Observed hosted HTTP 422 remains unexplained until a separately approved hosted attempt produces an allowlisted issue. Retaining the component cannot promise a popup stays open if the SDK legitimately rejects Create Order.
