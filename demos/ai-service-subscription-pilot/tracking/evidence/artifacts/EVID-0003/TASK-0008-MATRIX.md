# TASK-0008 Sanitized Browser Artifact Matrix

- focused_mockup_sha256: `9a7e8650227bd3b2a8689426a0b2cad49b2b05627a299d244bcfd7c05fa03def`
- focused_mockup_approval: `user:TASK-0008:2026-08-30:focused-mockup-approved`
- runtime: local production Node/Vite build
- provider_level: labeled simulated-provider interception
- viewports: desktop Chrome and exact 390px mobile
- themes: light and dark
- evidence_run: 28/28 Playwright cases passed

| State | Customer-visible result | Desktop artifacts | Exact 390px artifacts |
| --- | --- | --- | --- |
| Review | Recurring consent precedes the labeled simulated provider control | `chromium-task-0008-review-light.png`, `chromium-task-0008-review-dark.png` | `mobile-chromium-task-0008-review-light.png`, `mobile-chromium-task-0008-review-dark.png` |
| Cancellation | Returns to the valid review without access | `chromium-task-0008-cancel-light.png`, `chromium-task-0008-cancel-dark.png` | `mobile-chromium-task-0008-cancel-light.png`, `mobile-chromium-task-0008-cancel-dark.png` |
| Definitive failure | Shows retryable failure and grants nothing | `chromium-task-0008-failure-light.png`, `chromium-task-0008-failure-dark.png` | `mobile-chromium-task-0008-failure-light.png`, `mobile-chromium-task-0008-failure-dark.png` |
| Funding pending | Shows `Confirming your payment` for the same operation | `chromium-task-0008-pending-light.png`, `chromium-task-0008-pending-dark.png` | `mobile-chromium-task-0008-pending-light.png`, `mobile-chromium-task-0008-pending-dark.png` |
| Vault pending | Funding is verified, reusable readiness is pending, access is not granted | `chromium-task-0008-vault-pending-light.png`, `chromium-task-0008-vault-pending-dark.png` | `mobile-chromium-task-0008-vault-pending-light.png`, `mobile-chromium-task-0008-vault-pending-dark.png` |
| Vault ready | Funding and reusable readiness are verified while access remains not granted | `chromium-task-0008-vault-ready-light.png`, `chromium-task-0008-vault-ready-dark.png` | `mobile-chromium-task-0008-vault-ready-light.png`, `mobile-chromium-task-0008-vault-ready-dark.png` |

Each captured state passed keyboard focus, visible focus, 44px target, horizontal-overflow, theme, and page-error checks. Expected intercepted HTTP 409/503 or aborted-request browser network messages were allowlisted only in the failure/uncertainty behavior tests; no application console error was accepted. The Go-active comparison panel is excluded because it remains TASK-0004-owned.

Ten additional non-screenshot behavior cases ran in the same production-browser matrix: create-order abort, HTTP 5xx, malformed JSON, unknown response shape, and definitive-failure fresh retry on both desktop and exact 390px mobile. Uncertainty retained one operation and never reached capture; the definitive retry used a different operation identifier.

These artifacts contain sanitized demo copy only. They do not retain bearer/cookie values, emails, raw FraudNet attempt IDs, merchant identity, provider tokens, signatures, or full provider customer/order/vault/event identifiers. They are not PayPal sandbox or hosted proof.
