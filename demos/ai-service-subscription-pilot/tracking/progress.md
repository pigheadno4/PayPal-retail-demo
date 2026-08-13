# Progress

- Active slice: SLICE-001

## 2026-07-20 — Discovery baseline materialized

- Classified the pilot as complex under `demos/NEW_DEMO_PROTOCOL.md`.
- Materialized the canonical documentation structure without runtime code, dependency installation, database changes, PSP configuration, architecture planning, tasks, tests, evidence, or slice assignment.
- Recorded approved REQ-0001 through REQ-0021 as unassigned promises.
- Recorded unresolved REQ-0022 through REQ-0025 as drafts.
- Preserved the accepted Integration Lab and US-iOS H5 credit-purchase interaction models while keeping the visual design gate open.

## 2026-07-20 — Purchased-credit lifecycle corrected

- Corrected REQ-0008 to distinguish retained ownership from spendability: purchased credits extend metered access while a subscription is active, freeze without balance loss when the subscription becomes inactive, and unfreeze on eligible reactivation.
- Locked the freeze boundary to the authoritative effective service-access end timestamp; a scheduled cancellation does not freeze credits during the remaining paid-access period.

## 2026-07-20 — Tier names approved

- Added approved REQ-0026 for the ordered Go, Plus, Pro, and Pro Max tier names.
- Updated the Go-tier introductory promotion wording while leaving prices, allowances, capabilities, and entitlement differences open in draft REQ-0022.

## 2026-07-20 — Hybrid tier progression approved

- Added approved REQ-0027: each tier increases included allowance and adds meaningful capability or service-limit value, while exact quantities and entitlements remain open.

## 2026-07-20 — Monthly allowance ladder approved

- Added approved REQ-0028 with 100 Go, 300 Plus, 800 Pro, and 2,000 Pro Max included units for a monthly allowance period.
- Kept action weights, annual-plan reset cadence, rollover, proration, and purchased-credit values as separate unresolved decisions.

## 2026-07-20 — AI action catalog approved

- Added approved REQ-0029 for Generate answer, Analyze document, Create image, and Batch-analyze documents.
- Kept the proposed costs, tier eligibility, and action-specific visual treatment open for separate approval.

## 2026-07-26 — Tier and usage economics approved

- Approved REQ-0022 with demo-first monthly prices of $10, $25, $50, and $100; cumulative action unlocks; and no additional model, speed, support, seat, or retention promises.
- Approved REQ-0024 with fixed costs of 10, 30, 80, and 200 units and atomic included-first metering.
- Approved 200/$20, 500/$50, and 1,000/$100 purchased-credit packs plus the uniform $0.10 refund-compensation rate.
- Approved deterministic action-specific fixtures, hybrid Shadcn component roles, tier-locked versus insufficient-usage states, and truthful low, critical, purchased-credit, and exhaustion behavior.
- Kept runtime implementation, visual artifacts, exact allowance-window boundary rules, and provider-specific top-up evidence gated.

## 2026-07-26 — Exact allowance windows and monthly renewal recovery approved

- Expanded REQ-0028 with customer-specific calendar-month anchors, confirmed IANA timezone, 29th-through-31st clamping, daylight-saving behavior, half-open boundaries, and server-authoritative in-flight usage ownership.
- Added approved REQ-0033 for 72-hour ordinary monthly renewal recovery: expired included allowance does not carry, no unfunded allowance is granted, existing credits remain usable, and new top-ups are disabled.
- Approved preservation of the original anchor when funding completed on time but evidence arrived later, and a fresh full paid term at the effective completion timestamp for a genuinely late successful retry.
- Approved the shared web and future mobile-to-H5 timezone confirmation chain while keeping native and React Native implementation research-only.
- Kept provider-specific retry cadence, failure classification, implementation-grade visual artifacts, runtime code, architecture, PSP configuration, and slice assignment gated.

## 2026-07-26 — Conservative hybrid renewal retry cadence approved

- Approved application-owned automatic attempts at T0, T+24 hours, and T+48 hours, with recovery expiry rather than a fourth charge at T+72 hours.
- Approved automatic retry only for a verified terminal failure that current provider evidence explicitly permits retrying; pending or uncertain, customer-action-required, unusable-method, merchant or integration, risk-blocked, and do-not-retry outcomes suppress the scheduler.
- Kept same-request idempotent replay for transport uncertainty separate from a genuinely new scheduled authorization attempt.
- Added merchant-facing and technical Integration Lab evidence requirements for retry scheduling, suppression, manual settlement, race prevention, and provider non-equivalence.
- Kept exhaustive method-by-method response mapping, sandbox proof, notification delivery, visual implementation, architecture, PSP configuration, and slice assignment gated.

## 2026-07-27 — Recurring-primary and normalized renewal mapping approved

- Approved REQ-0021 and REQ-0033 boundaries requiring exactly one recurring primary credential per subscription, with no silent fallback across wallets, cards, Link, Fastlane, or PSPs.
- Approved direct PayPal card and Fastlane as separate acquisition experiences that converge only after verified creation of a PayPal card vault ID; ordinary renewal never reuses a Fastlane single-use token or authentication flow.
- Approved Stripe card-specific Link for the Pro Max persona and kept direct card, Google Pay, Apple Pay, card-specific Link, and native Link as distinct acquisition or Integration Lab scenarios. Each renewal creates a new off-session PaymentIntent against only the assigned reusable PaymentMethod.
- Replaced the older preliminary renewal classes with the approved eight-outcome normalized contract. Only `payment_confirmed` funds entitlement, only `automatic_retry_permitted` enters a scheduled retry, and unknown results fail closed.
- Preserved provider asymmetry: Stripe `try_again_later` can qualify verified terminal evidence, while PayPal business declines remain suppressed unless current exact route-and-error evidence supports an allowlist entry.
- Kept runtime implementation, architecture, PSP configuration, visual implementation, sandbox proof for every lane and outcome, notification timing, and slice assignment gated.

## 2026-07-27 — Renewal recovery experience and notifications approved

- Approved the hybrid customer entry for REQ-0033: a persistent recovery card keeps usable AI-service context visible and opens a dedicated billing-recovery page only for payment detail and decisions.
- Approved customer copy and actions for all eight normalized renewal outcomes, including payment controls disabled during uncertainty and the PayPal-saved Apple Pay default to another one-time method before a separate future-primary setup.
- Approved the REQ-0017 visibility boundary: business-impact and operational-owner summary by default, full raw provider and classification evidence through Integration Details in the Integration Lab, and no raw PSP codes in the normal customer account.
- Approved event-based email notifications with no unchanged T+24-hour duplicate, an access-expiry warning after the failed T+48-hour final attempt, immediate action-required, unusable-method, and T+72-hour messages, and resolution email only after an earlier recovery message.
- Approved a fifteen-minute threshold before sending one uncertain-payment email; earlier resolution cancels it, and unchanged retrieval or webhook evidence cannot duplicate it.
- Kept durable implementation-grade desktop and mobile artifacts, production email delivery and localization, SMS or push, runtime code, architecture, PSP configuration, sandbox proof, and slice assignment gated.

Append progress with stable requirement, slice, task, test, and evidence identifiers. Never rewrite prior entries.

## 2026-07-31 — Pro reference-image creation visuals approved

- Registered durable DESIGN-0111 and DESIGN-0112 artifacts for the complete Pro image-creation conversation and responsive mobile treatment.
- Approved the provided JPG or PNG fixture boundary, Black & White, Sharpen, and Vintage treatments, no-cost large preview, separate 80-unit confirmation, deterministic reservation and commit sequence, and downloadable simulated result.
- Approved the mobile chat-first hierarchy with explicit Before and After controls, warm low-contrast surface hairlines, compact allowance strip, usage-detail sheet, and 44-pixel controls.
- Kept runtime implementation, arbitrary private uploads, live-model transformation, architecture, PSP configuration, and slice assignment gated.

## 2026-07-31 — Pro Max batch-input visuals approved

- Registered durable DESIGN-0113 and DESIGN-0114 artifacts for the Pro Max batch-input source chooser, attachment review, and responsive mobile treatment.
- Approved one explicit Add documents entry with a recommended four-fixture sample batch, selectable three-to-five-file demo catalog, optional recognized downloaded fixtures, and an Integration Lab-only folder route.
- Approved zero-unit selection, removal, reordering, and validation; the 200-unit reservation remains behind the later explicit action confirmation.
- Approved a centered laptop Dialog, mobile bottom Sheet, compact 34-pixel mobile composer visuals inside 44-pixel touch targets, and overflow-free attachment metadata.
- Kept arbitrary or private uploads, runtime file storage, downstream batch processing and results, architecture, PSP configuration, and slice assignment gated.

## 2026-07-31 — Complete Pro Max batch-analysis journey approved

- Registered durable DESIGN-0115 and DESIGN-0116 artifacts for the complete five-stage Pro Max conversation on the shared responsive C3-G workspace shell.
- Approved the sequence from zero-unit file input through exact 200-unit confirmation, reservation and per-document progress, atomic comparison delivery and single commit, or diagnostics-only failure with full reservation release.
- Approved the inline comparison summary, full laptop Dialog and mobile bottom Sheet evidence views, synchronized allowance states, light and dark themes, and overflow-free responsive behavior.
- Kept runtime uploads, arbitrary private documents, live-model processing, downloadable real reports, architecture, PSP configuration, and slice assignment gated.

## 2026-08-08 — Subscription cancellation and reactivation visuals approved

- Registered durable `DESIGN-0136` for the responsive Option A outcome-first Customer Story.
- Approved a three-step cancellation flow: Cancel, Confirm cancellation, and Cancellation scheduled; paid access continues until the effective boundary, and `Keep my subscription` reverses the pending cancellation without payment.
- Approved a separate four-state reactivation journey: Inactive, Review reactivation, Verifying, and Active again.
- Preserved the old-allowance expiry, purchased-credit freeze and once-only unfreeze, retained recurring-primary method, fresh recalculated quote, no back-billing, and server-authoritative funding boundary.
- Kept runtime implementation, live provider behavior, recurring-method replacement sandbox proof, architecture, PSP configuration, accessibility evidence, and slice assignment gated.

## 2026-08-08 — Public seeded-persona one-click entry approved

- Expanded approved `REQ-0030` and registered responsive `DESIGN-0137` for the public `Explore demo accounts` route.
- Approved four ready persona cards with tier, cumulative AI-service access, persistent allowance, masked payment presentation, provider ownership, acquisition provenance, and an explicit shared-state disclosure.
- Approved one `Open workspace` action followed by a brief noninteractive secure-access transition and automatic workspace entry through a short-lived protected Supabase session.
- Kept shared email, password, OTP, recovery factors, reusable payment credentials, and provider tokens outside the visitor experience and preserved the real-email route for independent persistent testing.
- Verified the standalone laptop/mobile C3-G study with synchronized light/dark and three-state controls, 44-pixel mobile tier targets, no horizontal overflow, and no browser console warnings or errors.
- Kept runtime session issuance, sandbox persona provisioning, simultaneous-visitor handling, provider-mark hydration, architecture, PSP configuration, security evidence, accessibility evidence, and slice assignment gated.

## 2026-08-09 — Seeded personas simplified to presenter-only access

- Superseded public self-service `DESIGN-0137` after clarifying the primary sales use: the presenter controls all four seeded personas while the audience watches.
- Added proposed responsive `DESIGN-0138` and a new state board separating Public audience, Presenter personas, and Present workspace.
- Preserved temporary `.test` and persistent real-email Customer Story entry for audience members who want independent hands-on testing.
- Removed the proposed need for public session leases, queues, observer mode, persona-in-use status, or simultaneous shared-account interaction.
- Kept seeded authentication factors and payment credentials outside the visitor experience and retained persistent persona state plus the separate authorized reset boundary.
- Kept revised visual approval, runtime role enforcement, persona switching, provisioning, provider-mark hydration, architecture, PSP configuration, security evidence, accessibility evidence, and slice assignment gated.

## 2026-08-09 — Presenter-controlled persona showcase visual approved

- Registered the user's approval of the responsive `DESIGN-0138` state board covering Public audience, Presenter personas, and Present workspace.
- Approved the public boundary that removes seeded-account entry while preserving temporary `.test` and persistent real-email routes for independent audience testing.
- Approved the protected four-persona selector and the compact presenter context in the otherwise normal customer workspace on laptop and mobile.
- Reconfirmed that the mockup does not prove runtime authorization, persona switching, sandbox provisioning, provider-mark hydration, repair or reset behavior, accessibility, security, architecture, PSP configuration, or slice readiness.

## 2026-08-09 — Presenter reset-all demonstration-cycle visual approved

- Registered responsive `DESIGN-0139` for one protected operation that resets Go, Plus, Pro, and Pro Max together.
- Approved Current state, Confirm reset, Resetting, and Ready again treatments for laptop and mobile in light and dark themes.
- Approved restoration of full tier allowances and predefined purchased-credit baselines while returning active workspaces to their clean service chooser.
- Preserved subscription state, recurring credentials, provider ownership, transactions, webhooks, and immutable prior-cycle usage; excluded all temporary and persistent audience accounts.
- Verified the complete interactive path, unique dialog semantics, selected-tab semantics, final balances, HTTP availability, and zero document or mobile horizontal overflow.
- Kept runtime authorization, persistence guarantees, failure recovery, audit evidence, accessibility proof, architecture, PSP configuration, and slice assignment gated.

## 2026-08-09 — Persistent real-email sign-in-method visual approved

- Registered responsive `DESIGN-0140` for persistent real-email authentication and Account Settings.
- Approved Password not set, Set password from a recent session, Reverify by email code from an older session, Password enabled, returning Password sign-in, and generic Wrong password recovery states on laptop and mobile.
- Preserved email code as the default and recovery route, treated password as additive to the same Supabase identity, and excluded public forgot-password, password removal, email-code disablement, and account enumeration.
- Verified the six-state interaction board, show or hide password behavior, synchronized light and dark themes, alert and status semantics, 44-pixel mobile controls, zero horizontal overflow, HTTP availability, and no browser console warnings or errors.
- Kept live Supabase authentication, security proof, full accessibility evidence, runtime failures, architecture, PSP configuration, implementation planning, and slice assignment gated.

## 2026-08-09 — Temporary demo expiry Option A selected and visual prepared

- Registered proposed `DESIGN-0141` after the user selected the focused expired-outcome direction.
- Prepared a responsive C3-G state board for Active, one-hour Warning, final-fifteen-minute Cutoff, ten-minute Critical, and Expired states.
- Preserved AI usage and read-only history until fixed expiry while visibly pausing new subscription, tier-change, top-up, reactivation, and payment-method operations during the final fifteen minutes.
- Kept the expired outcome focused on two separate fresh starts and explicitly excluded old-account display, `.test` conversion, or copying of subscription, usage, credits, or payment methods.
- Verified all five tabs, light and dark themes, unique identifiers, descriptive disabled controls, 44-pixel mobile buttons, 390-pixel mobile composition, zero horizontal overflow, HTTP availability, and no browser console warnings or errors.
- Awaiting visual approval before promoting the mockup index status; runtime clocks, suspension, billing suppression, provider cleanup, accessibility evidence, implementation planning, and slice assignment remain gated.

## 2026-08-09 — Temporary demo expiry visual approved

- Registered the user's approval of responsive `DESIGN-0141` and promoted the mockup index entry to approved.
- Approved the persistent server-derived countdown, one-hour warning, final-fifteen-minute commercial cutoff, ten-minute critical warning, and focused suspended outcome on laptop and mobile.
- Approved continued AI usage and read-only history before fixed expiry, visibly disabled new commercial operations during the cutoff, and separate temporary-demo or persistent-email fresh starts with no old-state copy or conversion.
- Kept runtime clocks, automatic suspension, billing suppression, provider reconciliation and cleanup, security proof, full accessibility evidence, implementation planning, and slice assignment gated.

## 2026-08-09 — Simplified post-authentication exception visual prepared

- Registered proposed `DESIGN-0142` as a lean visual reference rather than another checkout journey.
- Prepared one suspended persistent-account outcome that follows successful identity verification but exposes no account data, AI, payment, top-up, subscription-management, or PSP controls.
- Kept changed commercial terms inside the approved checkout-review composition through one persistent Alert, a concise $44.22-before versus $55.28-current explanation, and explicit accept-or-change-plan actions before payment selection.
- Verified both responsive states, light and dark themes, Alert semantics, unique identifiers, 44-pixel mobile controls, 390-pixel mobile composition, zero horizontal overflow, and no browser console warnings or errors.
- Awaiting visual approval; runtime lifecycle authorization, recalculation, offer eligibility, tax accuracy, PSP boundaries, accessibility proof, implementation planning, and slice assignment remain gated.

## 2026-08-09 — Simplified post-authentication exception visual approved

- Registered the user's approval of responsive `DESIGN-0142` and promoted the mockup index entry to approved.
- Approved Option A's flatter visual hierarchy: one meaningful surface per outcome, separator-led supporting evidence, understated scenario tabs, one warm filled primary action, and outline secondary actions.
- Preserved the blocked suspended-account authority and the changed-terms $44.22-before versus $55.28-current review without introducing customer-data disclosure, PSP invocation, payment authorization, or entitlement.
- Reverified both states in light and dark themes, 390-pixel mobile composition, 44-pixel mobile actions, unique identifiers, and zero horizontal overflow; the demo workflow validator passes.
- Customer-facing static visual gaps identified in the account-entry review are now covered. A consolidated E2E coverage audit remains next; runtime authorization, PSP evidence, accessibility proof, implementation planning, and slice assignment remain gated.

## 2026-08-09 — Customer Story E2E coverage audit prepared

- Registered proposed `DESIGN-0143` and created a responsive C3-G coverage board with overview, persistent real-email, temporary `.test`, and presenter-persona views.
- Connected the three entry routes to one shared customer lifecycle covering AI usage, account usage history, credit purchase, plan and billing management, renewal recovery, cancellation, reactivation, return sign-in, and safe exception outcomes.
- Distinguished approved visuals from transition-only handoffs and Integration Lab or protected-operations exclusions; the later independent review correction reconciles the existing `DESIGN-0130` recovery approval.

## 2026-08-09 — Critical E2E Coverage Review Corrections Prepared

- An independent critical review returned `approve with small corrections`; it did not identify another top-level journey, account system, or customer page.
- Added a contained customer-safe receipt disclosure to the existing Billing History surface: laptop expands in context and mobile uses a bottom Sheet; raw PSP evidence remains in Integration Lab.
- Corrected the coverage board at true narrow widths by removing the duplicate scaled laptop inspector and retaining only the full-width mobile route inspector with intentionally scrollable route tabs.
- Reconciled the omitted `DESIGN-0128` register row and the already-recorded `DESIGN-0130` approval without promoting unrelated proposed design rows.
- Revised `DESIGN-0143` was held for user review of the corrected coverage board and contained receipt visual, then approved in the following record.
- The corrected audit identifies no missing customer-facing page; runtime claims remain outside this visual approval.
- Verified all four route views, light and dark themes, 390-pixel mobile composition, 44-pixel mobile controls, unique identifiers, and zero horizontal overflow. Runtime behavior, PSP evidence, accessibility proof, implementation planning, and slice assignment remain gated.

## 2026-08-09 — Customer Story E2E Coverage Approved

- User approved the corrected responsive coverage visual for `DESIGN-0143`; the canonical decision remains `proposed` until the repository's formal design-record gates are completed.
- The approved result identifies no missing top-level Customer Story page before Integration Lab design.
- Receipt detail remains a contained Billing History state; raw provider evidence remains outside the Customer Story.
- Runtime, provider, accessibility, slice, and implementation gates remain open.

## 2026-08-09 — Contained Billing Receipt Approved

- User approved the `DESIGN-0133` Billing History receipt interaction.
- Laptop expands the customer-safe receipt beneath the selected history item; mobile uses a bottom Sheet.
- The receipt exposes amount, tax, total, customer-safe reference, payment method, one-time purpose, verified credit fulfillment, and the unchanged recurring primary.
- No new customer route or raw PSP evidence was added; formal design promotion, provider proof, accessibility evidence, and runtime implementation remain gated.

## 2026-08-09 — Integration Lab Investigation Workspace Proposed

- Selected expert-first Option A as the starting Integration Lab shell and registered proposed `DESIGN-0144`.
- Created a responsive C3-G visual covering Start investigation, Configure scenario, Inspect and save, Integration Details, and saved-finding feedback.
- Prioritized the integration expert as phase-one operator while retaining Merchant Summary as a presentation layer over the same run facts.
- Kept the learning loop bounded to lightweight investigation snapshots; folders, assignments, collaboration, evidence upload, workflow automation, and general knowledge publishing remain excluded.
- Browser-checked all three states, theme switching, right and bottom Sheets, saved feedback, 44-pixel mobile controls, unique identifiers, and zero horizontal overflow at the paired-board viewport. Visual approval remains pending.
- Added three switchable Lab-only palette studies—Mineral emerald, Deep emerald, and Cobalt lab—while preserving labeled semantic states and provider-owned colors. Mineral emerald is the current recommendation; selection remains pending.
- User selected Mineral emerald as the Integration Lab page-level identity. Deep emerald and Cobalt lab remain learning references; Customer Story and provider-owned colors remain unchanged.

## 2026-08-09 — Cross-device Lab workspace continuity approved

- Approved application-owned restoration of the last editable Integration Lab workspace for the authenticated Lab operator across supported browsers and devices.
- Kept the operator identity separate from simulated customer identities and retained completed runs as immutable snapshots.
- Updated the launcher visual with explicit market, customer-location, platform, launch-context, customer-state, plan, business-intent, and provider-lane labels plus a signed-in restoration banner.
- Added one bounded start-new decision: reuse the restored shared context or start with empty context; laptop uses a Dialog and mobile uses a bottom Sheet.
- Browser-verified the restored and empty branches, disabled incomplete-run state, dark theme, unique Dialog identifiers, 390-pixel mobile composition, zero document and mobile-card horizontal overflow, and minimum 44-pixel mobile controls.
- Browser-local state remains limited to non-authoritative presentation preferences such as theme. Runtime persistence, authentication enforcement, synchronization, conflict handling, architecture, database design, and implementation planning remain gated.

## 2026-08-09 — Integration Lab Investigation Workspace shell approved

- User approved the complete responsive `DESIGN-0144` shell with Mineral emerald identity, signed-in cross-device draft restoration, explicit reuse-or-empty context choice, lightweight immutable runs, Merchant Summary, and progressive Integration Details.
- Promoted the registered HTML mockup to approved and updated its visible status; the canonical design row remains proposed until the tool-specific Builder, Matched Compare, and Capability Matrix workflows and the repository's formal design gates are complete.
- Runtime synchronization, provider execution, evidence capture, accessibility proof, architecture, implementation planning, and slice assignment remain gated.

## 2026-08-09 — First complete Scenario Builder visual proposed

- Registered proposed `DESIGN-0145` for the user's selected next step: one complete PayPal vaulted-card success investigation inside the approved Integration Lab shell.
- Created five responsive states—Shared facts, PayPal lane, Review and run, Processing, and Result—with one provider-independent $44.22 quote and a visible isolated-fixture boundary.
- Grounded the provider chain in the local payment wiki's PayPal v6 save-card-with-purchase evidence: Card Fields, Orders v2 `CAPTURE`, `store_in_vault: ON_SUCCESS`, `SCA_WHEN_REQUIRED`, immediate `VAULTED`, and delayed `APPROVED` completion through `VAULT.PAYMENT-TOKEN.CREATED`.
- Kept Merchant Summary, normalized state, masked PayPal identifiers, missing sandbox proof, Integration Details, and saved-finding feedback synchronized without mutating any customer account.
- Browser-verified all five states, light and dark themes, saved-finding feedback, unique Integration Details identifiers, 390-pixel mobile composition, minimum 44-pixel mobile controls, and zero document or mobile-card horizontal overflow.
- Visual review is pending; runtime PSP execution, exact sandbox evidence, accessibility proof, architecture, implementation planning, and slice assignment remain gated.

## 2026-08-10 — Staged provider-neutral Matched Compare scope approved

- User selected Option A after reviewing the responsive provider-scope study and the detailed differences among staged lanes, four-provider runnable launch, and fixed pair templates.
- Updated `REQ-0015` so one provider-neutral comparison set locks the target outcome and shared facts before creating provider lanes.
- Approved PayPal and Stripe as the phase-one runnable provider families while Adyen and Braintree begin as source-backed research lanes with explicit capability, constraint, verification-date, evidence-gap, and promotion status.
- Preserved the ability to promote a research lane through configured and sandbox-verified states into runnable without redesigning the comparison set or rewriting completed immutable runs.
- Registered `DESIGN-0146` as proposed and its responsive Mineral Emerald HTML study as approved; Options B and C remain learning references. Formal design promotion waits for the detailed Matched Compare workflow and the remaining design-record gates.
- Kept runnable Adyen and Braintree integrations, provider onboarding, credentials, sandbox execution, architecture, implementation planning, and slice assignment outside the approved phase-one scope.

## 2026-08-10 — Detailed Matched Compare workflow proposed

- Registered proposed `DESIGN-0147` and created a responsive Mineral Emerald workflow with Create, Lock contract, Select lanes, Compatibility, Run available, and Compare states.
- Used Google Pay recurring to demonstrate the critical pre-run gate: seven shared commercial facts remain aligned while the target capability is materially non-equivalent.
- Kept PayPal as a documented buyer-present one-time constraint snapshot instead of fabricating a declined renewal, kept Stripe as a recurring-compatible runnable-lane target with sandbox proof pending, and sent no provider action to Adyen or Braintree research lanes.
- Added sanitized Integration Details that preserve the distinction among provider capability, actual execution, and retained proof without displaying invented provider identifiers or results.
- Browser-verified all six state transitions, light and dark themes, the compatibility alert, the evidence Sheet, the 390-pixel real narrow layout, minimum 44-pixel mobile controls, and zero horizontal document overflow; no console errors were observed.
- This section records the pre-review proposal; the visual approval is recorded below. Provider execution, sandbox evidence capture, architecture, implementation planning, and slice assignment remain gated.

## 2026-08-10 — Detailed Matched Compare workflow approved

- User approved the responsive six-state `DESIGN-0147` visual covering Create, Lock contract, Select lanes, Compatibility, Run available, and Compare.
- Promoted `mockups/integration-lab-matched-compare-workflow.html` to approved and retained its Google Pay recurring capability-versus-proof boundary unchanged.
- Kept the canonical `DESIGN-0147` lifecycle status proposed until the repository's remaining formal design gates are satisfied; the durable approval reference records the accepted interaction direction without claiming runtime or sandbox proof.
- Provider execution, sandbox evidence capture, accessibility proof, architecture, implementation planning, and slice assignment remain gated.

## 2026-08-10 — Outcome-first Capability Matrix visual proposed

- User selected Option A so the Capability Matrix begins with a merchant outcome rather than a provider family or evidence level.
- Registered proposed `DESIGN-0148` and created Choose outcome, Review matrix, and Evidence and handoff states in the approved Mineral Emerald Integration Lab shell.
- Kept capability and demo proof as independent text-labeled statuses; used a semantic comparison table on laptop and equivalent stacked provider cards on mobile.
- Added progressive evidence details for merchant interpretation, exact claim, route, storefront, verification state, source requirements, proof gaps, and bounded Builder or Compare handoffs.
- Preserved the design-fixture boundary: no current provider verification, provider object, transaction, webhook, or sandbox execution is claimed.
- Static script, served-document identity, HTTP 200, responsive-source, and workflow validation passed. Direct browser rendering verification remains blocked by the browser URL policy, so visual approval depends on the user's live review.

## 2026-08-10 — Outcome-first Capability Matrix visual approved

- User approved the responsive `DESIGN-0148` Capability Matrix after live review of the served laptop and mobile study.
- Promoted `mockups/integration-lab-capability-matrix-outcome-first.html` to approved and retained the merchant-outcome-first navigation, separate capability and proof labels, semantic laptop table, stacked mobile cards, and progressive evidence Sheet.
- Kept the canonical `DESIGN-0148` lifecycle status proposed until the evidence-refresh process and the repository's remaining formal design gates are approved; the durable approval reference records the accepted visual and interaction direction without claiming current provider verification or sandbox execution.
- Runtime evidence refresh, provider execution, accessibility proof, architecture, implementation planning, and slice assignment remain gated.

## 2026-08-10 — Capability Matrix evidence-refresh options proposed

- Created responsive visual comparisons for Option A simple hybrid, Option B calendar-only, and Option C manual-only using the same exact-route evidence snapshot and illustrative provider-change event.
- Made the key risk visible as the time a changed provider fact may still look current: immediate after known change for A, until fixed expiry for B, and potentially unbounded for C.
- Preserved immutable historical evidence and operator-reviewed replacement records across all options; excluded automated provider-document monitoring and automatic capability rewriting from phase one.
- Added an overview plus selectable detailed lifecycles, horizontal laptop timelines, vertical mobile timelines, explicit text labels in addition to color, and light and dark themes.
- Static script, served-document identity, HTTP 200, responsive-source, and workflow validation passed. No evidence-refresh policy is selected by this artifact.

## 2026-08-11 — Capability Matrix evidence-refresh Option A approved

- User selected Option A, the simple hybrid evidence-freshness policy, after reviewing the responsive laptop and mobile comparison.
- Every active exact-route snapshot receives one configurable review-due date, while an operator can invalidate it immediately after discovering a material documentation, SDK, API, route, or merchant-configuration change.
- Either trigger removes current-verification wording without rewriting historical claims, sources, verification times, or completed run findings; returning to current requires a separately reviewed replacement snapshot with a new due date.
- Promoted `mockups/integration-lab-evidence-refresh-options.html` to approved and retained Options B and C as learning references. Example day counts remain illustrative exposure, not an approved refresh interval or service level.
- Automated provider-document monitoring, automatic capability rewriting, runtime implementation, provider execution, architecture, and slice planning remain gated.

## 2026-08-11 — Outcome-first Scenario Builder catalog proposed

- User selected Option A so Scenario Builder begins with a bounded merchant-outcome catalog rather than a provider-first tree or blank configuration surface.
- Added Choose outcome, Select route, and Builder ready states that carry signed-in Lab context forward while keeping provider capability, demo proof, and Builder readiness independent.
- Used `Save a card for later` to hand off into the existing PayPal JavaScript SDK v6 Card Fields design fixture without duplicating its five-stage provider configuration, processing, and result workflow.
- Kept source-gap and research routes inspectable without presenting them as runnable; no provider call, sandbox result, or current capability verification is claimed by the visual.
- Excluded template authoring, folders, favorites, assignments, collaboration, arbitrary API construction, runtime implementation, architecture, and slice planning.

## 2026-08-11 — Outcome-first Scenario Builder catalog approved

- User approved the responsive `DESIGN-0150` visual after reviewing its laptop and mobile Choose outcome, Select route, and Builder ready states.
- Promoted `mockups/integration-lab-scenario-catalog-outcome-first.html` to approved and retained the separate provider-capability, demo-proof, and Builder-readiness labels plus the explicit no-provider-call handoff boundary.
- Preserved the bounded phase-one scope: six curated merchant outcomes and reusable context filters, with no template authoring, folders, favorites, collaboration, or arbitrary API construction.
- Kept the canonical design lifecycle status proposed until the first complete PayPal vaulted-card Builder workflow, exact current provider evidence, and remaining formal design gates are approved.
- Runtime implementation, provider execution, sandbox evidence, architecture, implementation planning, and slice assignment remain gated.

## 2026-08-11 — PayPal vaulted-card Builder catalog handoff refined

- Brought the proposed first complete PayPal vaulted-card Builder forward from the approved outcome-first catalog.
- Changed Step 1 from a second editable intake form into a review of inherited merchant outcome, shared context, and provider-independent amount; outcome and route changes return to the catalog and no provider call is implied.
- Preserved the bounded five-stage investigation, documented-versus-sandbox-pending evidence labels, immediate `VAULTED` and delayed `APPROVED` teaching, isolated-account boundary, Merchant Summary, normalized result, Integration Details, and saved-finding feedback.
- Corrected the responsive study so the mobile device column can shrink to its viewport and removed the missing-favicon console request. Visual approval remains pending.

## 2026-08-11 — PayPal vaulted-card Builder visual approved

- User approved the complete responsive `DESIGN-0145` workflow after reviewing the inherited catalog contract, PayPal lane, customer checkout and run contract, guarded processing, normalized result, Integration Details, and saved-finding feedback.
- Promoted `mockups/integration-lab-scenario-builder-paypal-vaulted-card.html` to approved and retained its catalog-return path, light and dark themes, and paired laptop and mobile presentations.
- Kept the canonical `DESIGN-0145` lifecycle status proposed until exact current provider evidence and the repository's remaining formal design gates are satisfied; visual approval does not claim provider configuration, sandbox execution, webhook proof, or reusable-token charging.
- The next bounded gate is the Payment Knowledge Gate for this exact PayPal Card Fields and Orders v2 route before the scenario can advance beyond documented simulated evidence.

## 2026-08-12 — PayPal vaulted-card exact-evidence lifecycle proposed

- Registered proposed `DESIGN-0151` as the visual companion for the exact sandbox evidence gate after the approved PayPal vaulted-card Builder.
- Added a disposable evidence-only identity boundary, one $44.22 initial charge-and-vault, immediate `VAULTED` and ownership proof, one $55.28 merchant-initiated recurring subsequent card charge, and preserve-before-delete cleanup.
- Kept seeded personas, the presenter account, and self-registered audience accounts outside the evidence run. The reusable sandbox token is deleted only after immutable raw evidence and a sanitized finding are retained.
- Made the destructive boundary explicit: cleanup removes future-charge capability but does not refund either proof transaction or erase provider transaction history.
- Added responsive laptop and mobile Mineral Emerald presentations, light and dark themes, a cancelable confirmation dialog, sanitized identifiers, zero mobile page overflow, and at least 44-pixel actions.
- The artifact remains proposed and simulated. It does not claim provider configuration, a successful sandbox call, webhook receipt, reusable-token proof, or token deletion until those actions are actually performed and evidenced.

## 2026-08-12 — PayPal vaulted-card technical-log inspector refined

- User approved stage-linked technical API logs inside the proposed exact-evidence lifecycle instead of a separate trace page or inline payload blocks.
- Added Create Order, Capture and vault, alternative delayed webhook, Subsequent charge, and Delete token fixtures with separate Request and Response tabs.
- Added a non-color-only legend: amber marks behavior-changing fields, blue marks correlation and ownership, emerald marks verified outcomes, and rose marks redacted or sensitive material.
- Kept access tokens, PAN, CVV, private email, and unmasked provider identifiers out of the visual. All request identifiers, provider identifiers, HTTP results, and timings remain illustrative until exact sandbox evidence exists.
- Preserved progressive disclosure with a right Sheet on laptop and a viewport-anchored bottom Sheet on real mobile, while retaining 44-pixel minimum mobile actions and zero horizontal page overflow.

## 2026-08-12 — PayPal vaulted-card exact-evidence visual approved

- User approved the complete responsive `DESIGN-0151` visual, including the disposable evidence boundary, initial charge-and-vault, immediate and delayed vault branches, subsequent recurring charge, preserve-before-delete cleanup, and stage-linked Technical Logs.
- Promoted `mockups/integration-lab-paypal-vaulted-card-evidence-lifecycle.html` to approved and retained the Mineral Emerald light and dark themes, labeled four-color technical legend, sanitized Request and Response tabs, laptop right Sheet, mobile bottom Sheet, and destructive cleanup confirmation.
- Kept canonical `DESIGN-0151` status proposed: visual approval does not claim provider configuration, sandbox execution, webhook receipt, reusable-token charging, token deletion, or retained immutable evidence.

## 2026-08-12 — Stripe saved-card exact-evidence lifecycle proposed

- User accepted the direct Stripe card counterpart as the next bounded Integration Lab direction so the approved PayPal evidence lane can become a fair card-to-card matched comparison.
- Registered proposed `DESIGN-0152` with the same isolated Pro Monthly Seattle contract, $44.22 initial amount, and $55.28 subsequent amount as `DESIGN-0151`.
- Added Stripe-native Customer, Payment Element, initial PaymentIntent with `setup_future_usage: off_session`, succeeded PaymentIntent and Charge, signed-webhook ownership proof, attached PaymentMethod, new confirmed off-session PaymentIntent, and preserve-before-detach stages.
- Added responsive laptop and mobile Mineral Emerald presentations, light and dark themes, Stripe-lane accents, a centered irreversible-detachment confirmation, and a right or bottom technical-log Sheet with five operation fixtures and labeled four-color highlights.
- Kept every ID, request, response, event, timing, and outcome explicitly simulated. No Stripe account configuration, Payment Element submission, sandbox payment, webhook receipt, off-session payment, PaymentMethod detachment, refund, or retained provider evidence is claimed.
- Visual review remains pending before `mockups/integration-lab-stripe-saved-card-evidence-lifecycle.html` can be promoted from proposed to approved.

## 2026-08-12 — Stripe saved-card exact-evidence visual approved

- User approved the complete responsive `DESIGN-0152` visual after reviewing the isolated Customer boundary, Payment Element initial payment, reusable PaymentMethod ownership proof, off-session renewal, preserve-before-detach cleanup, and stage-linked Technical Logs.
- Promoted `mockups/integration-lab-stripe-saved-card-evidence-lifecycle.html` to approved and retained the Mineral Emerald light and dark themes, Stripe-lane accents, labeled four-color technical legend, laptop right Sheet, mobile bottom Sheet, and irreversible-detachment confirmation.
- Kept canonical `DESIGN-0152` status proposed: visual approval does not claim Stripe account configuration, Payment Element submission, sandbox execution, signed-webhook receipt, successful off-session charging, PaymentMethod detachment, or retained immutable evidence.

## 2026-08-12 — Card-vaulting Matched Compare result proposed

- User selected the outcome-first comparison direction after approving both provider-specific card evidence visuals.
- Registered proposed `DESIGN-0153` as a comparison view over the existing PayPal and Stripe evidence authorities rather than a third execution journey.
- Added Merchant outcome, Matched stages, Merchant ownership, and Evidence drill-down sections with the same locked Seattle Pro Monthly amounts and future-use outcome.
- Used a semantic eight-row table on laptop and stacked paired provider cards on mobile so equivalent merchant questions remain aligned without horizontal page overflow.
- Added a synchronized PayPal or Stripe evidence Sheet plus direct links to the two approved source lifecycle visuals. Both lanes remain visual-approved and sandbox-pending.
- Visual review remains pending; no provider configuration, PSP call, webhook, transaction, cleanup, or retained sandbox evidence is claimed.

## 2026-08-12 — Card-vaulting Matched Compare visual approved

- User approved the responsive `DESIGN-0153` outcome-first comparison after reviewing the merchant conclusion, eight aligned stages, shared merchant responsibilities, provider-specific observations, synchronized evidence Sheet, and links to both source lifecycle visuals.
- Promoted `mockups/integration-lab-card-vaulting-matched-evidence-result.html` to approved and retained the semantic laptop table, paired mobile cards, Mineral Emerald light and dark themes, PayPal and Stripe lane accents, and progressive provider-native evidence treatment.
- Kept canonical `DESIGN-0153` status proposed: visual approval does not promote either simulated source lane into sandbox proof and does not declare a universal provider winner.

## 2026-08-12 — Integration Lab E2E coverage audit proposed

- User selected the recommended lean coverage audit before adding another deep provider scenario.
- Registered proposed `DESIGN-0154` with overview, single-scenario, Matched Compare, and return-and-reuse inspections across the approved Integration Lab visuals.
- Distinguished approved visuals, contained interactions, navigation handoffs, genuine missing UX, and runtime or evidence gates so sandbox and persistence work cannot be mistaken for missing pages.
- The audit finds the first-session investigation journey visually covered and identifies one bounded missing surface: a shared completed-Findings destination for recent immutable findings, open, present, and duplicate-to-new-draft.
- Excluded folders, collaboration, sharing, assignments, case management, dashboards, and arbitrary reporting to prevent the pilot from becoming a research-management product.
- Visual review remains pending; the audit claims no provider execution, persistence behavior, cross-device synchronization, security enforcement, or retained evidence.

## 2026-08-12 — Integration Lab E2E coverage audit approved

- User approved the responsive `DESIGN-0154` lean closure audit after reviewing the overview, single-scenario, Matched Compare, Capability Matrix, and return-and-reuse coverage.
- Promoted `mockups/integration-lab-e2e-coverage-audit.html` to approved and retained one bounded next UX gap: a shared completed-Findings destination for recent immutable findings, open, present, and duplicate-to-new-draft.
- Kept canonical `DESIGN-0154` status proposed: visual approval does not prove provider execution, immutable persistence, cross-device synchronization, security enforcement, or retained evidence.
- Preserved the exclusions for folders, sharing, collaboration, assignments, case management, dashboards, and arbitrary reporting so the pilot remains an investigation demo rather than a research-management product.

## 2026-08-12 — Completed Findings Option A proposed

- User selected the recommended dedicated master-detail Findings workspace to close the single UX gap identified by the approved Integration Lab E2E audit.
- Registered proposed `DESIGN-0155` and created a responsive four-state visual covering the combined immutable library, completed result, merchant-safe presentation, and source-linked duplicate-to-new-draft behavior.
- Kept laptop list and result context together while mobile deliberately transitions from the list into one focused finding instead of squeezing both panes onto a narrow screen.
- Preserved the immutability boundary: presentation never changes the finding, and duplication copies only scenario context into a new draft without inheriting old evidence or conclusions as current proof.
- Visual review remains pending; cross-device persistence, access control, evidence retention, and runtime duplication behavior are not claimed.

## 2026-08-12 — Completed Findings Option A visual approved

- User approved the responsive `DESIGN-0155` master-detail Findings workspace after reviewing the library, immutable result, merchant presentation, and duplicate-to-draft states.
- Promoted `mockups/integration-lab-completed-findings-workspace.html` to approved and retained the laptop master-detail composition, mobile list-to-result transition, Mineral Emerald light and dark themes, and progressive Integration Details.
- Preserved the original-finding boundary: presentation remains read-only, and duplication creates a separate provenance-linked draft without inheriting old evidence or conclusions as current proof.
- Kept canonical `DESIGN-0155` status proposed: visual approval does not prove account ownership, cross-device persistence, access control, immutable evidence retention, or runtime duplication behavior.

## 2026-08-12 — Lean product-discovery closure audit prepared

- Reconciled the authoritative requirement register, design router, mockup registry, current plan, and operational TODO queue without creating a new UI surface or implementation plan.
- Confirmed 31 of 33 active requirements are approved. `REQ-0023` remains draft because its product decisions and four exact-route refund evidence obligations are currently coupled; `REQ-0025` remains intentionally draft until the web E2E and US-iOS H5 credit pilot trigger later native and React Native research.
- Confirmed the mockup registry contains 45 approved artifacts and one intentionally superseded artifact, with no proposed visual remaining after approval of `DESIGN-0155`.
- Corrected stale design and TODO summaries: representative Customer Story, account, AI-service, payment-management, Integration Lab, and responsive narrow-screen visuals are approved; Account Usage History is already approved as `DESIGN-0123`.
- Identified the remaining global design gates as real-font typography proof and an implementation-grade shared-component state and accessibility board. Live PSP hydration, sandbox execution, backend state, and accessibility verification remain slice evidence rather than missing-page requirements.
- Kept architecture and implementation planning closed. Supabase boundary research, complete requirement disposition, and an approved first slice charter remain required before implementation planning.
- The workflow validator passed after reconciliation.

## 2026-08-12 — REQ-0023 product behavior approved with separate evidence gates

- User selected closure Option A and approved the documented upgrade, downgrade, cross-cadence replacement, allowance, purchased-credit, primary-method, reconciliation, and compensation rules in `REQ-0023`.
- Promoted `REQ-0023` from draft to approved while retaining planning disposition `unassigned`; this approves the intended product behavior but does not authorize a slice, architecture, implementation, PSP call, or provider claim.
- Kept the four Customer Story exact-route refund snapshots as mandatory execution evidence before PayPal Wallet, PayPal-processed Apple Pay, Stripe-processed Google Pay, or Stripe card acquired through card-specific Link can be labeled `sandbox_proven`.
- Preserved all route-specific Payment Knowledge Gates, failure and reconciliation evidence, and the prohibition against treating provider-family documentation as exact pilot-route proof.

## 2026-08-12 — Design Readiness Option A proposed

- User selected one combined proof board rather than separate typography and component artifacts or modifications to already-approved customer pages.
- Registered proposed `DESIGN-0156` with Typography proof, Component states, and Accessibility contract tabs in paired laptop and 390-pixel mobile compositions.
- Used real plan, allowance, payment, provider-evidence, error, and mobile content; added explicit selected-versus-fallback font roles and a browser-local font-presence diagnostic rather than claiming that fallback rendering proves Fraunces or Source Sans 3.
- Added visual contracts for critical action, field, feedback, progress, disclosure, focus, touch, reduced-motion, opaque-fallback, and provider-controlled boundaries.
- Kept font assets, licensing intake, computed font evidence, layout shift, semantic shadcn behavior, keyboard and screen-reader operation, automated contrast, and hydrated PSP controls as separate runtime gates.
- Render verification covered all three tabs at 1440 and 390 pixels, light and dark theme switching, reduced-motion and opaque-surface toggles, font-status labels, critical state examples, and zero page-level horizontal overflow with no browser console or page errors.
- The current browser reports both local font assets missing; the board therefore labels the selected-family sample as fallback rendering instead of presenting it as completed typography proof.
- Visual review remains pending.

## 2026-08-12 — Design Readiness Option A visual approved

- User approved the responsive `DESIGN-0156` Typography proof, Component states, and Accessibility contract board.
- Promoted `mockups/design-readiness-typography-components-accessibility.html` to approved and retained the warm C3-G light, aubergine dark, Mineral Emerald proof accents, 390-pixel mobile composition, state distinctions, and explicit visual-versus-runtime boundary.
- Closed the remaining static typography and shared-component visual-contract gap. No additional customer or Integration Lab page is required before slice disposition work.
- Kept the observed missing local Fraunces and Source Sans 3 assets honest: fallback hierarchy is visually approved, while font intake, computed-family and weight capture, layout shift, semantic shadcn behavior, keyboard and screen-reader operation, automated contrast, and hydrated PSP controls remain runtime evidence gates.

## 2026-08-13 — SLICE-001 plan approved and TASK-0001 started

- Recorded explicit user approval of the lean `IMPLEMENTATION_PLAN.md` after the separately approved and independently reviewed SLICE-001 charter.
- Activated SLICE-001 and TASK-0001 on branch `codex/ai-subscription-slice-001` without expanding the approved Go Monthly, PayPal Wallet, and Generate Answer boundary.
- Limited current execution to the pinned runtime, server-owned Supabase/Postgres persistence foundation, TC-0001, and EVID-0001. Customer identity UX, PayPal calls, allowance execution, hosted configuration, and later tasks remain gated.
- Completed the runtime environment parser red/green cycle with three passing tests, exact dependency pins, and a generated lockfile; typecheck, lint, unit tests, and workflow validation pass locally.
- Added the TC-0001 pgTAP contract, but did not create the production migration because the local Supabase stack cannot start without Docker or Podman. TASK-0001 and EVID-0001 remain open.

## 2026-08-13 — TASK-0001 remote Supabase foundation reviewed

- Created and linked the dedicated Free Supabase project `puwzifjshgfmeregidev` in Singapore for sandbox/demo data only; its database password remains in macOS Keychain rather than repository or chat state.
- Captured the required empty-database red result, then created `20260813141941_slice001_core.sql` through the project-local Supabase CLI, reviewed a dry run, and applied it to the linked project.
- Passed 37 transaction-bound linked pgTAP assertions covering exactly eleven private tables, browser-role privilege denial, forced RLS, indexed foreign keys, quote arithmetic, provider-event idempotency, and pending-vault uniqueness; the test transaction leaves no fixtures behind.
- Passed nine focused runtime tests, typecheck, lint, and `npm audit --omit=dev --audit-level=high` with zero vulnerabilities.
- Closed all three Important independent-review findings: explicit browser environment allowlist, Supabase refresh-header propagation, and production Secure cookie policy. The pgTAP exact-table-count and schema-CREATE checks were also added; scoped re-review found no new breakage.
- Marked `TASK-0001`, `TC-0001`, and `EVID-0001` reviewed/passing. Local Docker-based pgTAP remains unavailable, but the approved linked-remote direct-query fallback passed. No customer flow, PSP call, hosted callback, or later-slice feature was started.
