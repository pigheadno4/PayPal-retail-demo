# Test Cases

## Acceptance Criteria
- [ ] Demo can run locally.
- [ ] Primary payment scenario can be verified.
- [ ] Requirement traceability matrix maps each important promise to a source doc, implementation task, test case, and evidence type.
- [ ] Evidence ladder is identified for each milestone: shell, interaction, backend/database, PSP/browser, and failure-state evidence.
- [ ] `DESIGN.md` is implementation-grade before customer-facing frontend coding: tokens, component contracts, page specs, UX-flow contracts, state contracts, responsive rules, accessibility, and visual QA gates.
- [ ] Multi-step UI state contracts or virtual mockups are linked from the related test cases.
- [ ] Every visible user action is wired, disabled with a reason, or explicitly deferred in tracking.
- [ ] Rendered UI is paired with interaction or manual verification for the promised user journey.
- [ ] PSP or wallet UI uses the official hydrated SDK/provider surface in every promised placement.
- [ ] API-backed UI covers loading, success, and failure states against the backend contract.
- [ ] Multi-step UI has a state contract or mockup aligned with implementation and tracking.
- [ ] Customer-facing text avoids unsupported PSP claims.
- [ ] Payment flow state is observable in the backend or database when applicable.
- [ ] Platform parity is verified or documented when web, iOS, and Android differ.

## Milestone Close Gate
- [ ] Implementation plan, todos, test cases, and progress agree on what is done.
- [ ] Shell-only work remains unchecked as behavior until the user action is verified.
- [ ] Payment, checkout, webhook, vaulting, or account milestones include backend/database verification when applicable.

## Manual Sandbox Verification
- [ ] Complete primary sandbox checkout or payment flow.
- [ ] Confirm server-side state update.
- [ ] Confirm user-facing success or failure state.
