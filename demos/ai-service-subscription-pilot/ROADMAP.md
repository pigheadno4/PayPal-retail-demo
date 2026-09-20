# AI Service Subscription Pilot Roadmap

## Current scope override — 2026-09-19

The approved REQUIREMENTS email-OTP-only amendment supersedes temporary-account promises in the historical material below. The current customer demo uses persistent real-email OTP only, reusing the approved email form and C3-G light/dark styling; no temporary selector, alias or reveal-code action is supported. TC-0003 current UI execution and TC-0015 temporary acceptance are **deferred, not passed**. Persistent same-intent resume, refresh and non-mutation obligations are now explicitly part of TC-0014. Retained backend temporary-session/security tests and account data remain unchanged.

Temporary expiry remains unresolved; prior failures and evidence remain historical, not fixed or relabeled. This does not defer unrelated subscription temporary-recovery concepts. Local fixture results do not prove hosted OTP delivery/login, allowance database invariance or payment. EVID-0006 remains partial; EVID-0003/EVID-0005 and TASK-0009 payment/full-slice gates remain separate. Implementation detail and pending candidate/review gates: `tracking/tasks/TASK-0005/email-otp-only-plan.md` and `tracking/tasks/TASK-0005/email-otp-only-execution.md` (demo-relative paths).


This is a derived milestone view. `REQUIREMENTS.md`, `DESIGN.md`, `IMPLEMENTATION_PLAN.md`, and approved slice charters remain authoritative.

## Goal

Deliver a merchant-facing web demo that explains AI-service subscription, vaulting, recurring funding, usage, credits, lifecycle management, and PayPal-versus-Stripe evidence without inventing provider capability. Mobile research and implementation follow the approved web gates.

## Current Milestone

- Slice: `SLICE-001`
- Outcome: Go Monthly acquisition through Supabase identity, exact Seattle quote, PayPal Wallet vaulting evidence, 100-unit activation, and one 10-unit Generate Answer debit
- Status: active slice; execution state requires reconciliation before another task is dispatched
- Confirmed completed work: `TASK-0001`, `TC-0001`, and `EVID-0001` are recorded reviewed/passing in implementation and evidence history
- Reconciliation gap: local `AGENTS.md`, `PLAN.md`, `tracking/todos.md`, and `slices/README.md` still describe TASK-0001 as active or incomplete
- Next eligible work: `TASK-0002` only after those canonical/derived status files agree and its bounded plan passes the new user approval gate

## Existing Slice Sequence

| Slice | Theme | Current roadmap treatment |
| --- | --- | --- |
| SLICE-001 | Go Monthly PayPal Wallet thin slice | active; reconcile before continuing |
| SLICE-002 | Full AI Product routing | proposed |
| SLICE-003 | Provider Lane Breadth | proposed |
| SLICE-004 | Credits and Billing Lifecycle | proposed |
| SLICE-005 | Persistent Identity and Admin Lifecycle | proposed |
| SLICE-006 | Integration Lab | proposed |
| SLICE-007 | Hosted Merchant Web Closure | proposed |
| SLICE-008 | US iOS H5 Credit Pilot | proposed after web gates |
| SLICE-009 | US iOS H5 Subscription Pilot | proposed after web gates |

Future ordering changes require canonical requirement and slice reconciliation plus user approval. This file does not authorize implementation.
