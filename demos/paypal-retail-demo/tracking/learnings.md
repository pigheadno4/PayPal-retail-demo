# Learnings

Reusable implementation lessons from this demo should be added here during milestones.

## PayPal JS SDK v6 Sandbox Market Testing
- Keep market buyer country and sandbox test buyer country as separate config values.
- `buyer_country` / `paylater_buyer_country` describe buyer-facing market behavior and Pay Later messaging context.
- `sandbox_test_buyer_country` is a sandbox-only simulation knob for PayPal JS SDK v6 and should be omitted or ignored in production.
- The local `wiki-v2` PayPal JS source snapshot shows SDK v6 `CreateInstanceOptions` includes `testBuyerCountry?: string`, so the frontend should map backend `sandbox_test_buyer_country` to `createInstance({ testBuyerCountry })`.
- Before coding the PayPal provider, verify the installed `@paypal/react-paypal-js` v9 / JS SDK v6 package types still match the wiki snapshot.
