# Email-OTP-only plan review — independent critic66

- Reviewed plan: `tracking/tasks/TASK-0005/email-otp-only-plan.md`, TASK-0005 email-OTP-only amendment.
- Round: 5. Date: 2026-09-19. Verdict: `approved` for detailed user plan approval, **not execution authorization**.
- Exact plan SHA-256: `94ff7f34025e30d59fd20a8fe15a37475baa6d09cb178de632654390d509e3c8`.
- Findings: none; zero Critical/Important findings and no residual Minor items. No additional task, infrastructure or budget increase requested.

## Inputs and authority

Read the plan-critic skill, applicable repository/demo guardrails and workflow constraints/configuration, canonical REQUIREMENTS current-demo amendment dated 2026-09-19, relevant design decisions DESIGN-0157/0160 and approved page contract, SLICE-001 scope/evidence routing, ADR-0001, TASK-0005 task entry, TC-0014/0015 and EVID-0006, exact implementation plan, current identity component, local/hosted Playwright configurations, identity-and-quote test, existing manifest sanitizer/tests, and working-tree/index status.

The canonical amendment explicitly authorizes removal of temporary entry/current acceptance while preserving data, backend security and historical failures. It supersedes the older dual-identity scope; the plan names the derived documents requiring reconciliation rather than silently using them to change canonical scope. Persistent authentication still cannot pay, grant allowance or bypass current quote review. Broader temporary identity specifications remain deferred reference, not current-demo claims.

## Readiness assessment

1. **Five bounded, testable acceptance criteria.** UI removal/state preservation, persistent identity interaction, persistent-only hosted selection plus retained backend security, scoped evidence validation, and truthful documentation/candidate provenance each have explicit tests or manual evidence. No product behavior is hidden in an untested catch-all. The changes are one coherent removal/reconciliation task, not an implicit broader redesign.
2. **Exact implementation boundary.** Three named runtime files own the UI change. The test/harness and derived-document allowlists are explicit. Server/shared/schema/provider/client/payment implementations and old evidence are protected. Retaining unused temporary client methods and security tests avoids unrelated cleanup. No new service, schema, endpoint, dependency or generic diagnostic framework is introduced.
3. **Visual route: reuse, justified.** The approved email-entry form and C3-G responsive/theme contract remain the authority; the canonical amendment explicitly permits this reuse. Removing the alternate choice does not authorize replacement visual design. Desktop/390px, light/dark, focus/labels/44px targets, busy/error states and interaction checks remain execution obligations. A visual conflict requires a stop, not invented design. No additional mockup/retrieval round is needed for this removal-only plan.
4. **Payment route: evidence-boundary-only.** No new PSP capability or payment semantic is asserted. Exact quote/consent/stale replacement, allowance comparison and no-payment/activation/usage guards remain. Local mocked OTP is explicitly not hosted authentication, provider delivery, allowance database proof or payment proof. The separate payment-to-workspace and hosted identity gates remain open.
5. **Evidence default is conservative.** Existing legacy manifests still require 19 records by default. Only an explicit `persistent_email` argument permits the exact 11-record set, with one real contained-failure record; unknown scope, duplicates, temporary/extra labels, missing rows and incorrect failure count fail. Existing row privacy/blocked-claim checks remain unchanged. Separate future filenames and explicit scope mapping prevent relabeling or overwriting legacy artifacts. This is a minimal extension of the current validator, not a second evidence system.
6. **Local execution is bounded.** Test-first assertions, retained backend regressions, full local checks, hosted discovery-only and fixture-only browser interactions are specified. The local browser command uses a clean environment and fake public/provider values; nonlocal escape interception, port ownership check, screenshot redirection and no live DB credentials are explicit obligations. Historical temporary browser code remains skipped with a reason; backend security tests stay active. No deployment, live OTP or provider operation is part of execution.
7. **Rollback/review isolation is explicit.** The plan forbids blanket staging and restoring files to HEAD. Baselines, exact task hunks, protected-path comparisons and separate local artifacts preserve existing dirty work. Both independent lanes must review one commit reproduced/tested in an isolated checkout. Working-tree hashes cannot substitute for that gate.

## Execution prerequisites, not findings

- User must approve this detailed plan after critique. Roles67/68/69 fit the configured cap69; critic approval does not authorize extra loops or waive either review lane.
- The current index is empty, but the workspace contains substantial existing modifications and untracked dependencies, including the hosted harness/evidence helpers, hosted config and several governing documents. A runnable isolated candidate may require explicitly approved baseline dependency inclusion. The plan correctly makes this a coordinator-owned disclosure/staging/commit gate; no whole-file or whole-directory approval is inferred from the allowlist. If the candidate cannot be reproduced without extra files, stop at that gate rather than absorbing unrelated work or claiming acceptance.
- Preserve pre-existing historical artifacts against the captured working baseline, not merely HEAD. Some existing artifacts are already dirty; their current bytes remain user-owned.
- Full local success will still leave hosted persistent proof, unresolved/deferred temporary expiry history and full TASK-0005/payment acceptance separate. No historical failure may be changed to passed by this scope amendment.

## Next owner

Coordinator returns the exact hashed plan and this critique to the user for final plan approval. After that approval, executor67 implements only its bounded scope; coordinator resolves explicit candidate staging/commit authority before spec68/quality69 review the same isolated candidate. Only this review report was written by critic66; no implementation, controls, approval records, live calls or delegation were changed/performed.
