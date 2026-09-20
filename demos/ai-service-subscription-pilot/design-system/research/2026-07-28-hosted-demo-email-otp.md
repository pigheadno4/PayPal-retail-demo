# Hosted Demo Email OTP Contract

Date: 2026-07-28
Status: approved product direction; implementation and screen design remain blocked

## Scope

This record defines how the hosted Render Customer Story may demonstrate a genuine Supabase email-OTP account flow without requiring an audience member to own a real inbox. It does not authorize runtime code, Supabase project configuration, Render deployment, database changes, or production authentication claims.

The design preserves three distinct modes:

| Mode | Identity channel | Supabase session | Return-visit treatment |
| --- | --- | --- | --- |
| Local development | `.test` address inspected through local Mailpit | genuine Supabase local email-OTP verification | local test only |
| Hosted Customer Story | high-entropy `.test` alias bound to one Render demo session | genuine hosted Supabase email-OTP verification | temporary and non-recoverable |
| Integration Lab simulation | clearly labeled fixed mock code | none | no application account |

Authentication and recovery for persistent self-registered accounts remain unresolved and are outside this approved `.test` flow.

## Approved Capability Boundary

After Supabase verifies the OTP, the `.test` account is a genuine application account classified as `demo_identity`. While the originating browser session remains available, it can exercise the complete sandbox customer journey:

- create a sandbox subscription through an eligible PayPal or Stripe lane;
- create, assign, and use supported reusable sandbox payment credentials;
- run the simulated AI actions and consume real application-ledger allowance;
- purchase sandbox credit packs and consume purchased credits;
- upgrade or downgrade its tier under the approved lifecycle rules;
- cancel and reactivate;
- add, replace, or change a primary payment method through the approved payment-management flow.

These are genuine demo application and PSP sandbox states, not read-only Lab fixtures. The account remains temporary because its `.test` identity has no private recovery channel. Losing the originating demo session does not erase backend or provider state and does not make the account recoverable.

An authorized administrator can identify `demo_identity` accounts and remove an abandoned one through the provider-cleanup-first permanent-deletion workflow.

Persistent-account signup, sign-in, recovery, and any conversion from `demo_identity` will be designed separately. No requirement for a real email or any other persistent authentication channel is introduced by this decision.

## Approved Session-Expiry Boundary

Each temporary account has a server-owned demo-session expiry timestamp. The backend uses that timestamp rather than browser presence, cookie loss, or client activity as the authoritative lifecycle boundary.

The approved lifecycle is:

- active for a fixed twenty-four hours from temporary-account creation;
- no sliding or activity-based extension;
- automatically suspended at the fixed expiry;
- retained in suspended state for seven days;
- automatically submitted to the existing provider-cleanup-first permanent-deletion workflow after the suspended interval.

These timings apply only to `.test` accounts classified as `demo_identity`. Persistent-account timing remains unresolved.

When the timestamp is reached:

1. The application transitions the account to suspended with a `demo_session_expired` reason.
2. Application access and new sensitive customer operations are blocked.
3. The merchant-controlled billing scheduler suppresses renewals, retries, and other new merchant-initiated charges for the account.
4. Reusable PayPal or Stripe sandbox credentials, normalized state, and immutable provider evidence remain intact for inspection and later cleanup.
5. A provider operation that was already authorized before expiry may finish evidence reconciliation, but its result cannot authorize another retry or charge after suspension.
6. Permanent deletion does not happen at the suspension boundary. It remains a later provider-cleanup-first operation under the authorized admin lifecycle.

Deleting or losing the browser cookie before the server timestamp cannot immediately suspend the backend account because the server cannot reliably observe that browser event. The account becomes inaccessible to that browser immediately, while automatic backend suspension occurs at the recorded expiry.

After seven days suspended, the application automatically creates the same idempotent deletion operation used by authorized provider-cleanup-first deletion. A provider cleanup failure leaves the account suspended in `cleanup_failed` and routes to the existing administrator retry and reconciliation path; it cannot be hidden as successful deletion.

## Approved Customer-Visible Timing

Every merchant-owned signed-in Customer Story surface persistently shows that the current account is temporary and displays the remaining time derived from the server-owned expiry timestamp.

The behavioral states are:

| Remaining time | Customer treatment |
| --- | --- |
| More than one hour | compact temporary-demo identity and remaining-time indicator |
| One hour or less | visible expiry warning while retaining the persistent indicator |
| Ten minutes or less | critical expiry warning that remains visible through merchant-owned navigation |
| Expired | replace active controls with the suspended-session outcome; do not continue from a stale client countdown |

The indicator cannot be dismissed in a way that removes all expiry context. Refresh, internal navigation, and return from a provider approval window re-evaluate authoritative server state. Provider-hosted pages, wallet sheets, redirects, and approval popups are not merchant-owned surfaces and are not described as carrying the indicator.

The display does not extend or restart the twenty-four-hour interval. Visual placement, component styling, motion, and responsive composition remain part of the later UI design gate.

### Final fifteen-minute operation cutoff

At fifteen minutes remaining, the backend stops creating new operations that can move money, establish or change recurring credentials, or alter the billing arrangement. The blocked starts are:

- initial subscription checkout;
- immediate or scheduled tier change;
- purchased-credit checkout;
- reactivation funding;
- add, replace, or change-primary payment-method flows.

Simulated AI usage and read-only account or Integration Lab exploration remain available until the fixed session expiry. The block is server-enforced from the authoritative deadline; disabling buttons alone is insufficient.

This cutoff aligns with the existing fifteen-minute upgrade-quote lifetime.

### Approved in-flight effective-time rule

An operation validly started before the cutoff receives an immutable deadline equal to:

```text
min(ordinary quote or operation expiry, demo-session expiry)
```

The adapter preserves the operation deadline, provider-effective completion timestamp, and evidence-arrival timestamp as distinct facts.

| Verified evidence | Normalized treatment |
| --- | --- |
| Provider-effective completion is on or before the operation deadline | Reconcile the payment and resulting arrangement or credential state exactly once, even if the webhook or retrieval evidence arrives later. The account still suspends at the fixed demo-session expiry. |
| Provider-effective completion is after the operation deadline | Enter `payment_timing_review`; do not grant entitlement, promote a recurring credential, retry, or create another charge. |
| Evidence cannot establish whether completion was on time | Enter `payment_timing_review` under the same fail-closed restrictions. |
| Verified terminal failure before the deadline | Apply the ordinary failure result; session timing does not turn it into success or authorize a replacement charge. |

Example: provider-effective completion at `10:59:58`, demo-session expiry at `11:00:00`, and webhook arrival at `11:00:05` is an on-time payment with delayed evidence. The funded state is reconciled, but the `.test` account is already suspended at `11:00:00`.

Evidence arrival time never replaces the provider-effective completion time. Delayed evidence does not extend the session, and uncertain timing cannot be promoted to on-time success for customer access.

### Cleanup guard and phase-one scope stop

If `payment_timing_review` remains unresolved when the seven-day suspended interval ends, the existing cleanup operation records `cleanup_blocked_pending_evidence` and pauses. The `.test` account remains suspended, billing remains blocked, and account-to-provider mappings remain available for the original operation's reconciliation. Verified terminal evidence allows the ordinary cleanup workflow to continue.

This is a deletion guard and reason code, not a new case-management product. Phase one adds no assignment queue, notification tree, evidence upload, separate service-level agreement, manual override, or additional timing branches for this edge case. Further cleanup exception design is deliberately deferred so the pilot remains focused on merchant-visible payment learning.

## Approved Hosted Flow

1. The browser asks the Render backend to begin a temporary demonstration.
2. Render generates a high-entropy `.test` alias and a signed HttpOnly demo-session cookie. The alias and cookie are random per browser session.
3. The browser calls Supabase `signInWithOtp` for that alias. Supabase may create the email user under the approved account-creation path.
4. Supabase generates the email OTP and calls the configured Send Email Hook. Supabase documents that the hook replaces its built-in email sender and includes the token and token hash in the signed hook payload.
5. Render rejects any hook request whose signature cannot be verified.
6. For an approved `.test` alias, Render associates the OTP with the originating demo session in a private server-side store and applies a five-minute expiry. Delivery for any future non-`.test` identity remains outside this contract.
7. Only a request carrying the matching signed HttpOnly demo-session cookie can retrieve the captured OTP for display. Knowledge of the alias alone is insufficient.
8. The originating browser submits the OTP to Supabase `verifyOtp`. Supabase remains the authority that verifies the OTP and issues the authenticated session.
9. After verified success, the application records `demo_identity` in trusted server-owned state and deletes the captured OTP. Expiry also deletes it.
10. The application restores the selected tier or credit intent and continues the same customer journey.

Supabase's current passwordless email documentation supports six-digit email OTPs, `signInWithOtp`, optional automatic account creation, and `verifyOtp`. The demo's five-minute capture lifetime is a stricter application retention rule; the Supabase project OTP expiry must be configured compatibly and reviewed again before implementation.

## Security and Data Boundary

The temporary capture service may retain only the minimum correlation needed to bind one alias and OTP to one demo session until verification or expiry. The OTP must not appear in:

- application, platform, request, or hook logs;
- error traces or support diagnostics;
- analytics or event payloads;
- URLs or query strings;
- local storage, session storage, IndexedDB, or other browser persistence.

The browser may display the OTP retrieved for its current session, but it does not persist it. The endpoint returns a non-enumerating denial to an unrelated or expired session and does not reveal whether an alias exists.

`demo_identity` is an application-owned classification. It must not depend on Supabase `user_metadata`, because that metadata is user-editable and is not an authorization source.

## Failure and Recovery Branches

| Condition | Customer result | Server result |
| --- | --- | --- |
| Hook signature invalid | generic temporary failure | reject without storing the payload |
| OTP not captured yet | short pending state with bounded retry | reveal neither alias existence nor token data |
| Five-minute capture expiry | request a new code | delete the captured record |
| Different browser requests OTP | use the browser where the demo began | deny without disclosing alias state |
| Supabase verification fails | retry within remaining validity or request a new code | do not create authenticated application state |
| Return after demo session is lost | start a fresh temporary demo | do not recover the old `.test` identity |

No uncertain state may create a session, restore private account data, or classify an unverified user as authenticated.

## Evidence Boundary

Current provider evidence:

- [Supabase Passwordless Email Logins](https://supabase.com/docs/guides/auth/auth-email-passwordless) documents email OTP setup, `signInWithOtp`, optional user creation, six-digit OTP entry, and `verifyOtp`.
- [Supabase Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook) documents that the hook replaces SMTP sending, includes token material in the payload, and verifies hook requests with a generated secret.
- [Supabase Auth default email-provider change](https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider) restricts default SMTP delivery and recommends custom SMTP or a Send Email Auth Hook.
- [Supabase Free-tier email-template change](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier) applies to new Free projects using default SMTP and reinforces that the hosted demo must not rely on default SMTP template customization.

Application policy, not a Supabase product claim:

- high-entropy `.test` alias generation;
- signed HttpOnly browser-session binding;
- five-minute private capture retention;
- server-only deletion and non-enumerating retrieval;
- `demo_identity` classification;
- non-recoverable `.test` return visits;
- fixed-code Lab simulation that never calls `verifyOtp`.

## Remaining Design Gate

The account-entry screen contract must still define how a customer chooses or encounters:

- temporary hosted demo identity;
- persistent self-registered signup, sign-in, and recovery, including its authentication channel;
- an existing authenticated account;
- conversion, if any, from a temporary demo identity to a persistent account.

No account-entry UI or conversion behavior is approved by this record.
