# Evidence Register

## Current scope override — 2026-09-19

The approved REQUIREMENTS email-OTP-only amendment supersedes temporary-account promises in the historical material below. The current customer demo uses persistent real-email OTP only, reusing the approved email form and C3-G light/dark styling; no temporary selector, alias or reveal-code action is supported. TC-0003 current UI execution and TC-0015 temporary acceptance are **deferred, not passed**. Persistent same-intent resume, refresh and non-mutation obligations are now explicitly part of TC-0014. Retained backend temporary-session/security tests and account data remain unchanged.

Temporary expiry remains unresolved; prior failures and evidence remain historical, not fixed or relabeled. This does not defer unrelated subscription temporary-recovery concepts. Local fixture results do not prove hosted OTP delivery/login, allowance database invariance or payment. EVID-0006 remains partial; EVID-0003/EVID-0005 and TASK-0009 payment/full-slice gates remain separate. Implementation detail and pending candidate/review gates: `tracking/tasks/TASK-0005/email-otp-only-plan.md` and `tracking/tasks/TASK-0005/email-otp-only-execution.md` (demo-relative paths).

Future EVID-0006 `manifest-email-otp-only.json` uses explicit `persistent_email` validation (11 records, including exactly one observed contained failure); `persistent-review-email-otp-only.png` is its separate screenshot name. Existing `manifest.json` keeps default `legacy_full` validation (19 records), and historical captures are immutable. No new hosted manifest is produced by this implementation.


Evidence IDs use `EVID-0001` through `EVID-9999`, are permanent, and are never reused.

## Evidence Index

| Evidence | Requirements | Slice | Type | Status | Artifact |
| --- | --- | --- | --- | --- | --- |
| EVID-0001 | REQ-0034, REQ-0036, REQ-0037, REQ-0038 | SLICE-001 | static, backend | passing | tracking/evidence/EVID-0001.md |
| EVID-0002 | REQ-0034, REQ-0035, REQ-0038 | SLICE-001 | backend, interaction, hosted, failure | blocked | tracking/evidence/EVID-0002.md |
| EVID-0003 | REQ-0036, REQ-0038 | SLICE-001 | backend, provider, hosted, failure | blocked | tracking/evidence/EVID-0003.md |
| EVID-0004 | REQ-0037, REQ-0038 | SLICE-001 | backend, interaction, responsive, failure | captured | tracking/evidence/EVID-0004.md |
| EVID-0005 | REQ-0034, REQ-0035, REQ-0036, REQ-0037, REQ-0038 | SLICE-001 | static, backend, provider, interaction, responsive, accessibility, typography, hosted, failure | planned | pending |
| EVID-0006 | REQ-0034, REQ-0038 | SLICE-001 | backend, interaction, hosted, security, failure | planned | pending |

### EVID-0001 — Runtime, schema, and authority-boundary proof

- Requirements: REQ-0034, REQ-0036, REQ-0037, REQ-0038
- Slice: SLICE-001
- Type: static, backend
- Status: passing
- Artifact: tracking/evidence/EVID-0001.md
- Captured at: 2026-08-13T14:46:53Z
- Verified by: task1_schema_reviewer independent agent; root controller
- Result: passed: 37 linked pgTAP assertions, 9 runtime tests, typecheck, lint, and production dependency audit

### EVID-0002 — Identity, intent-resumption, and exact-quote proof

- Requirements: REQ-0034, REQ-0035, REQ-0038
- Slice: SLICE-001
- Type: backend, interaction, hosted, failure
- Status: blocked
- Artifact: tracking/evidence/EVID-0002.md
- Captured at: 2026-08-23
- Verified by: pending
- Result: 34 local tests, actual Shared-Pooler repository proof, production build, 4/4 local development and production interactions, 48/48 delivery-loop checks, and static audits pass; hosted Hook/session isolation remains unverified

### EVID-0003 — PayPal funding and reusable-credential proof

- Requirements: REQ-0036, REQ-0038
- Slice: SLICE-001
- Type: backend, provider, hosted, failure
- Status: blocked
- Artifact: tracking/evidence/EVID-0003.md
- Captured at: 2026-09-01
- Verified by: pending
- Result: TASK-0008 local parity remains passing; a direct PayPal sandbox run now proves the corrected order payload, real SDK approval, capture, and immediate reusable-ready handoff. Hosted webhook delivery and delayed APPROVED reconciliation remain blocked.

### EVID-0004 — Allowance and Generate Answer ledger proof

- Requirements: REQ-0037, REQ-0038
- Slice: SLICE-001
- Type: backend, interaction, responsive, failure
- Status: captured
- Artifact: tracking/evidence/EVID-0004.md
- Captured at: 2026-08-31
- Verified by: pending
- Result: configured Supabase Postgres activation/reserve/commit/release/return proof, 17 focused assertions, 213 passed/5 skipped full local assertions, and 4/4 desktop/exact-390px real-API browser cases passed; hosted OTP and real PayPal proof remain unproved

### EVID-0005 — Hosted responsive merchant-safe end-to-end proof

- Requirements: REQ-0034, REQ-0035, REQ-0036, REQ-0037, REQ-0038
- Slice: SLICE-001
- Type: static, backend, provider, interaction, responsive, accessibility, typography, hosted, failure
- Status: planned
- Artifact: pending
- Captured at: pending
- Verified by: pending
- Result: pending

### EVID-0006 — Hosted identity and sanitized identity proof

- Requirements: REQ-0034, REQ-0038
- Slice: SLICE-001
- Type: backend, interaction, hosted, security, failure
- Status: planned
- Artifact: pending
- Captured at: pending
- Verified by: pending
- Result: pending; this evidence is limited to the existing Render service plus Supabase/Resend six-digit persistent OTP and originating-browser `.test` isolation. It cannot complete TC-0011, TC-0012, EVID-0003, or final EVID-0005 provider/slice proof.
