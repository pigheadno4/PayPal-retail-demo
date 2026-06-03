# PayPal Retail Demo Evidence Map

## Purpose
This document maps planned PayPal behavior to local `/Users/tengtao/Development/wiki-v2` evidence. It does not replace sandbox testing.

## Rules
- Treat `wiki-v2` as the local PayPal source of truth for this repo.
- If installed package types or sandbox behavior differ from this map, update this file, `API_CONTRACT.md`, and `IMPLEMENTATION_PLAN.md` before coding around the difference.
- Clearly separate PayPal-confirmed behavior from demo-specific contracts.

## Source Map

| Area | Local wiki sources | Demo usage |
| --- | --- | --- |
| JS SDK v6 setup | `wiki/sources/source-paypal-js-sdk-v6-setup.md`, `wiki/sources/source-github-paypal-js.md`, `wiki/sources/source-npm-react-paypal-js-v9.md`, `wiki/analyses/analysis-paypal-sdk-v5-vs-v6-multi-country.md` | Static v6 loader, `createInstance`, components, `findEligibleMethods`, React v9 provider/hooks, provider remount strategy |
| Sandbox buyer simulation | `wiki/sources/source-github-paypal-js.md`, raw type snapshot `raw/github-paypal-js/packages/paypal-js/types/v6/index.d.ts`, `wiki/analyses/analysis-paypal-pay-later-multi-country-integration-guide.md` | Backend stores `sandbox_test_buyer_country`; frontend maps it to SDK v6 `createInstance({ testBuyerCountry })` in sandbox/test only |
| Pay Later | `wiki/sources/source-paypal-pay-later.md`, `wiki/analyses/analysis-paypal-pay-later-multi-country-integration-guide.md`, `wiki/analyses/analysis-paypal-radio-button-payment-wall.md`, `wiki/analyses/analysis-paypal-sdk-v5-vs-v6-multi-country.md` | Pay Later button/message eligibility, buyer country, amount-aware messages, homepage/category non-amount messages, radio wall behavior |
| Delivery express shipping | `wiki/sources/source-paypal-checkout-shipping-module.md`, `wiki/sources/source-paypal-payments-quickstart.md` | PDP/cart/minicart express is delivery-only, uses `GET_FROM_FILE`, server-side shipping callback recalculates shipping/tax/promo/amount |
| BOPIS pickup fields | `wiki/sources/source-paypal-checkout-shipping-module.md`, `wiki/sources/source-paypal-best-practices-one-time-payment.md`, `wiki/sources/source-paypal-fastlane-getting-started.md` | V1 pickup uses `intent: CAPTURE`, `SET_PROVIDED_ADDRESS`, store address, and `shipping.type: PICKUP_IN_STORE` |
| BOPIS demo-specific receiver name | User-provided prior implementation experience captured in `API_CONTRACT.md` and `IMPLEMENTATION_PLAN.md` | Receiver name must be `s2s ${storeName}` for this demo. Treat this as a demo contract, not a general PayPal documentation claim. |
| Card fields | `wiki/sources/source-paypal-card-fields-sdk-v6.md`, `wiki/sources/source-paypal-expanded-checkout-getting-started.md`, `wiki/sources/source-paypal-expanded-checkout-integrate.md` | Card radio expands hosted card fields, save checkbox stays inside card box, capture happens server-side after successful submit/3DS handling |
| Apple Pay | `wiki/sources/source-github-paypal-applepay-component.md`, `wiki/sources/source-paypal-js-sdk-v6-setup.md` | Apple Pay is rendered only when eligible; full local verification may need HTTPS/domain/device prerequisites |
| Google Pay | `wiki/sources/source-github-paypal-googlepay-component.md`, `wiki/sources/source-paypal-js-sdk-v6-setup.md` | Google Pay is rendered only when eligible; `confirmOrder` and possible payer action handling stay in payment integration scope |
| Venmo | `wiki/sources/source-paypal-pay-with-venmo.md`, `wiki/sources/source-paypal-js-sdk-v6-setup.md` | Venmo is runtime-gated, US/USD focused, and sandbox behavior may differ from production desktop/mobile behavior |
| Vaulting and saved payments | `wiki/sources/source-paypal-save-payment-methods.md`, `wiki/sources/source-paypal-save-cards-js-sdk.md`, `wiki/sources/source-paypal-save-paypal-orders-api.md`, `wiki/sources/source-paypal-save-cards-orders-api.md`, `raw/github-paypal-rest-api-specs/openapi/vault_payment_tokens_v3.json` | Guests cannot vault; logged-in buyers can request save-for-future where supported; active/pending states must reconcile through API response and verified webhooks; saved-payment delete uses Payment Method Tokens delete when a vault ID exists |
| Webhooks and security | `wiki/sources/source-paypal-security-guidelines.md`, `wiki/sources/source-paypal-save-payment-methods.md`, `raw/github-paypal-rest-api-specs/openapi/notifications_webhooks_v1.json` | Verify webhook signature before mutation through `POST /v1/notifications/verify-webhook-signature`; store sanitized webhook/debug records; invalid events do not mutate order/payment/saved-payment state |
| Invoice IDs | `wiki/sources/source-paypal-orders-api-troubleshooting.md`, `wiki/sources/source-paypal-rest-api-get-started.md`, `wiki/sources/source-paypal-payments-quickstart.md` | `invoice_id` must be unique per PayPal transaction attempt; buyer-facing DO/PO order number remains stable while retry attempts use suffixes |
| Line items | `wiki/sources/source-paypal-checkout-pass-line-items.md`, `wiki/sources/source-paypal-payments-quickstart.md` | Create Order payload includes detailed item data, item totals reconcile with amount breakdown, discounts stay in breakdown instead of hiding original item detail |

## Open Verification Before Coding
- Confirm installed `@paypal/react-paypal-js` v9 / SDK v6 types still expose `testBuyerCountry`.
- Confirm card fields package/API names after dependency install.
- Confirm Apple Pay and Google Pay local verification strategy after an HTTPS origin is available.
- Confirm BOPIS payload in sandbox with the selected merchant account and the `s2s ${storeName}` receiver-name convention.
- Confirm save-for-future response fields and webhook events for the exact sandbox merchant capabilities.
