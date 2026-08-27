# ADR-0001 — Vite Web With A Shared Express API

- Status: approved
- Date: 2026-08-27
- User approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-27:adr-0001-vite-express-shared-api-approved
- Scope: SLICE-001 runtime reconciliation only
- Supersedes after approval: the Next.js App Router runtime choice in `IMPLEMENTATION_PLAN.md`
- Does not supersede: product requirements, payment semantics, Supabase ownership, database schema, approved visual behavior, or provider-evidence gates

## Context

The approved design foundation identifies Vite, React, and shadcn/ui as the preferred web stack. The later SLICE-001 implementation plan instead selected a single Next.js App Router service. That change was not isolated as an explicit architecture decision, and the current implementation therefore conflicts with the earlier approved frontend direction.

The pilot is web-first, but its Node.js backend must later serve web, iOS, and Android clients. Keeping business behavior behind client-neutral HTTP contracts is more important than sharing a web framework with the server. The reconciliation must preserve existing payment and identity correctness without turning the demo into a multi-service platform.

The current global environment parser also blocks unrelated routes when any PayPal, webhook, or email setting is absent. Local inspection of a preliminary checkout intent therefore returns an internal error before the route reaches the capability it actually needs. Reconciliation must make configuration failures explicit and capability-scoped.

## Decision

Use one Render Node.js service containing:

```text
Vite React web ───────────────┐
iOS client (future) ──────────┼──> Express /api/v1 ──> domain services ──> Supabase and PSPs
Android client (future) ──────┘

Render Node service
├── /api/v1/*       shared versioned JSON API
├── /webhooks/*     provider and Supabase hook endpoints
└── /*              compiled Vite React application with history fallback
```

Express 5 is the HTTP framework. React Router declarative mode provides browser routing. There is no runtime server rendering. The production Node process serves both the API and the compiled Vite assets, preserving one deployment and one domain.

## Source Boundaries

```text
ai-service-subscription-pilot/
├── web/
│   └── src/                 Vite React UI and browser-only clients
├── server/
│   └── src/
│       ├── routes/          thin Express adapters
│       ├── middleware/      authentication and HTTP concerns
│       └── domain/          payment, quote, identity, and persistence behavior
├── shared/
│   └── src/                 safe request/response schemas and DTO types only
├── supabase/                migrations and database tests
└── package.json             one build, verification, and production-start workflow
```

Only contracts genuinely consumed by both a client and the server belong in `shared/`. Repositories, provider payloads, raw evidence, database clients, environment parsing, and secrets remain server-only. Express routes authenticate, validate, invoke one domain operation, and serialize a sanitized result; domain services do not depend on Express or React.

No workspace manager, package publishing, generic PSP framework, microservice, queue, worker, or second deployable is introduced.

## Client And Route Contract

- New shared endpoints use `/api/v1/*`.
- Web routes retain clean customer URLs such as `/`, `/checkout/:intentId`, and later approved account or lab paths.
- Express returns the compiled `index.html` for non-API browser routes so direct navigation and refresh work.
- During development, Vite proxies `/api/v1` and `/webhooks` to Express. Production requests are same-origin.
- There is no legacy `/api/*` compatibility layer because no external consumer has adopted the current local-only Next routes.
- Future native clients may use only documented JSON contracts. This decision does not authorize iOS, Android, H5, React Native, or native-SDK implementation.

## Authentication Boundary

Persistent real-email users authenticate through Supabase Auth. Vite, future iOS, and future Android clients send the Supabase access token as `Authorization: Bearer <token>` to protected Express endpoints. Authentication middleware verifies the token claims, resolves the Supabase user identifier, and then resolves the application-owned account before any protected operation.

The server never trusts browser-supplied account IDs, `user_metadata`, PSP profiles, or unverified session objects as authorization authority. Supabase remains the application identity owner, while the application database remains the owner of subscription, payment, entitlement, allowance, and usage relationships.

The temporary `.test` OTP flow retains its separate signed, HttpOnly, originating-browser demo-session cookie. That cookie binds OTP retrieval and does not become a replacement application-authentication system.

The Vite client may contain only the Supabase project URL, Supabase publishable key, and approved public PSP client identifiers. Supabase secret keys, database credentials, PSP secrets, webhook secrets, OTP values, and reusable tokens remain server-only.

## Configuration And Failure Boundary

Base server configuration is validated at startup. It contains only dependencies required for the service itself to operate, including the application URL, port, database URL, Supabase project/server credentials, and demo-session signing secret.

PayPal and email/hook configuration are validated at their capability boundaries. A missing optional integration returns a sanitized `503 integration_not_configured` response from that capability instead of causing an unrelated route to throw an unexplained 500. No fake secret is required merely to render and inspect the web application.

`GET /api/v1/health` is the Render health endpoint. It returns only safe readiness state and never echoes configuration values. Local UI availability is not PayPal sandbox, hosted webhook, email-delivery, or production-readiness evidence.

Expected validation, authentication, ownership, conflict, pending, and integration-readiness outcomes use explicit sanitized response contracts. Unexpected errors remain generic to the client and must not expose provider payloads, credentials, customer data, or reusable identifiers.

## Existing Work And History

TASK-0001 and TASK-0002 acceptance history remains immutable. Their database, domain, security, and product-behavior evidence is retained. Next-specific runtime and adapter evidence is marked superseded when replacement evidence is approved; it is not deleted or rewritten as though the prior implementation never existed.

TASK-0003 remains unaccepted. Its PayPal domain behavior, provider projections, idempotency, vault-reconciliation logic, tests, and approved visual behavior are candidates for preservation. Its Next Route Handlers and runtime/browser evidence are not current after migration and require replacement review on the reconciled candidate.

No requirement, PayPal semantic, database migration, quote rule, identity rule, entitlement boundary, or visual design is changed by this decision.

## Reconciliation Tasks

The reconciliation is implemented as two bounded tasks before TASK-0004:

### Runtime Foundation Reconciliation

Owns the Vite scaffold, Express entry point, `/api/v1` and static-history boundaries, base and capability-scoped configuration, health behavior, combined Render build/start workflow, and directly affected foundation tests. It does not migrate customer identity, quote, checkout, or PayPal behavior.

### Existing Journey Migration And Parity

Owns bearer-token authentication, preservation of the `.test` cookie boundary, migration of identity/quote/checkout/PayPal adapters, migration of the approved React surfaces, and replacement regression/browser evidence. It does not redesign the experience or add any new provider, lifecycle, mobile client, allowance, usage, or AI behavior.

Each task must have at most five acceptance criteria and pass the existing planner, independent plan critic, executor, specification reviewer, quality reviewer, and user approval gates. TASK-0004 cannot start until both reconciliation tasks and TASK-0003 acceptance are complete.

## Verification Contract

The reconciled implementation must:

1. Preserve existing domain, repository, PayPal payload, webhook, quote, and identity tests where their behavior is framework-independent.
2. Add focused Express adapter tests for authentication, input validation, status codes, cookies, capability readiness, and sanitized responses.
3. Test shared request/response schemas independently and retain focused React component tests for migrated surfaces.
4. Pass type checking, linting, unit/integration tests, and the combined production build under the pinned Node runtime.
5. Pass Playwright against the combined Node service for homepage and deep links, persistent and `.test` identity boundaries, quote and checkout resumption, PayPal pending/ready/canceled/declined/unresolved states, laptop/mobile layouts, and light/dark presentation.

The applicable frontend visual route is `reuse`: existing approved C3-G artifacts and responsive behavior remain the visual authority. Framework migration must not trigger a redesign or new mockup round unless implementation exposes a genuine behavior or layout conflict.

Hosted Supabase, email-hook, PayPal sandbox, webhook, and provider-control claims remain blocked until exercised in their real configured environments. Local tests, static visuals, and fake gateways cannot satisfy those evidence gates.

## Consequences

### Benefits

- Web, iOS, and Android can consume one explicit API contract.
- The web stack matches the approved Vite and React direction.
- One Render service keeps deployment and same-origin web behavior simple.
- Existing server-domain logic remains reusable and testable outside an HTTP framework.
- Capability-specific configuration produces clearer local and merchant-demo failures.

### Costs

- Next-specific routing, Supabase SSR helpers, proxy behavior, build scripts, and evidence must be replaced.
- Previously reviewed browser and HTTP-adapter evidence must be rerun on the new candidate.
- Clean browser routes require an Express history fallback and a Vite development proxy.

These costs are accepted only to restore the intended shared-backend architecture. They do not authorize adjacent refactoring or future-mobile implementation.

## Approval And Execution Gate

This document records the section-by-section design agreed in conversation and was approved through the reference above. The architecture decision alone does not authorize implementation. After written-spec approval:

1. update `IMPLEMENTATION_PLAN.md`, `IMPLEMENTATION_TASKS.md`, `ROADMAP.md`, and loop tracking with the approved reconciliation and supersession relationships;
2. invoke the writing-plans workflow for the first reconciliation task only;
3. send that bounded plan to the independent plan critic;
4. stop at the user's task-plan approval gate before any implementation.
