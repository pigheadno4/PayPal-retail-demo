# Post-Purchase Operations And Account Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing catch-all Admin Portal and Account order history into the approved route-separated post-purchase demo loop with server-side filtering, atomic lifecycle changes, genuine webhook inspection, persistent sanitized diagnostics, and buyer-safe Account refresh.

**Architecture:** Keep the existing Admin passcode/session and profile-market context, but make `AppRoute` choose one of five Admin workbenches so each route loads only its own API data. Extend existing repositories with typed filter/cursor inputs and route-specific envelopes, move lifecycle mutation behind one atomic repository operation, and persist the existing sanitized structured logger through a best-effort runtime-log sink. Account continues to read canonical account order/timeline APIs and never reads Admin diagnostics.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Express 5, Supabase/Postgres, Vitest, Testing Library, shadcn/Radix primitives, Playwright CLI.

## Global Constraints

- Preserve the existing Admin passcode/session access model; do not add an Admin user switcher.
- Preserve Delivery lifecycle `paid -> processing -> shipped -> delivered` and Pickup lifecycle `paid -> preparing_pickup -> ready_for_pickup -> picked_up`.
- A lifecycle request changes exactly one allowed next status, accepts an optional merchant note, writes one `actor_type = admin` lifecycle event atomically, and returns `409` for stale or invalid state.
- Lifecycle and inventory mutations never create synthetic PayPal webhook rows.
- Webhooks and Diagnostics are read-only and show only genuine received webhook records plus canonical payment/order evidence.
- Runtime-log persistence is sanitized, allowlisted, best effort, non-recursive, non-blocking, and retained for 7 days.
- Account displays no debug, PayPal, payment-session, capture, webhook, database, or Admin-session IDs.
- Filters are URL-backed, server-executed, cursor-paginated, and timezone-explicit for time ranges.
- Mobile workbenches have no page-level horizontal overflow and all interactive targets are at least 44px.
- Keep code, `IMPLEMENTATION_TASKS.md`, `PLAN.md`, and `tracking/{todos,test-cases,progress}.md` synchronized task by task.

---

### Task 1: Route-Isolated Admin Shell

**Files:**

- Modify: `web/src/app/routes.ts`
- Modify: `web/src/app/routes.test.ts`
- Modify: `web/src/app/App.tsx`
- Modify: `web/src/app/App.interactions.test.tsx`
- Modify: `web/src/styles/global.css`
- Modify: `IMPLEMENTATION_TASKS.md`
- Modify: `PLAN.md`
- Modify: `tracking/todos.md`
- Modify: `tracking/test-cases.md`
- Modify: `tracking/progress.md`

**Interfaces:**

- Consumes: existing `AdminShellGate`, Admin passcode token, `ApiClient`, and existing `/api/admin/*` endpoints.
- Produces: `AdminSection = "orders" | "lifecycle" | "inventory" | "webhooks" | "diagnostics"`; Admin `AppRoute` includes `section: AdminSection`; each route renders one workbench and calls only its required list APIs.

- [x] **Step 1: Write the failing route-resolution test**

```ts
expect(resolveAppRoute("/admin")).toEqual({
  scope: "admin",
  page: "admin",
  section: "orders",
});
expect(resolveAppRoute("/admin/lifecycle")).toEqual({
  scope: "admin",
  page: "admin",
  section: "lifecycle",
});
expect(resolveAppRoute("/admin/inventory")).toEqual({
  scope: "admin",
  page: "admin",
  section: "inventory",
});
expect(resolveAppRoute("/admin/webhooks")).toEqual({
  scope: "admin",
  page: "admin",
  section: "webhooks",
});
expect(resolveAppRoute("/admin/diagnostics?tab=runtime")).toEqual({
  scope: "admin",
  page: "admin",
  section: "diagnostics",
});
```

- [x] **Step 2: Run the route test and confirm the expected failure**

Run: `npm test -- web/src/app/routes.test.ts`

Expected: FAIL because current Admin routes return no `section`.

- [x] **Step 3: Write the failing API-isolation interaction test**

```ts
const cases = [
  ["/admin/orders", ["/api/admin/orders"]],
  ["/admin/lifecycle", ["/api/admin/orders"]],
  ["/admin/inventory", ["/api/admin/inventory", "/api/admin/pickup-dates"]],
  ["/admin/webhooks", ["/api/admin/webhooks"]],
  ["/admin/diagnostics", ["/api/admin/payment-debug", "/api/admin/debug-logs"]],
] as const;

for (const [pathname, expectedPaths] of cases) {
  window.localStorage.setItem("paypal-retail-demo:admin-session", "route-token");
  const apiClient = createRecordingApiClient({
    getResponseByPath: createAdminRouteIsolationResponses(),
  });
  const view = render(<App apiClient={apiClient} initialPathname={pathname} />);
  await screen.findByRole("heading", { name: adminHeadingForPath(pathname) });
  expect(adminDataGetPaths(apiClient.calls)).toEqual(expectedPaths);
  view.unmount();
  window.localStorage.clear();
}
```

- [x] **Step 4: Run the interaction test and confirm the expected failure**

Run: `npm test -- web/src/app/App.interactions.test.tsx -t "loads only the active Admin workbench data"`

Expected: FAIL because the current catch-all `AdminShell` preloads orders, inventory, pickup dates, webhooks, payment debug, and runtime logs on every Admin route.

- [x] **Step 5: Implement the route contract**

```ts
export type AdminSection =
  | "orders"
  | "lifecycle"
  | "inventory"
  | "webhooks"
  | "diagnostics";

function resolveAdminSection(path: string): AdminSection {
  const candidate = path.slice("/admin/".length);
  return candidate === "lifecycle" ||
    candidate === "inventory" ||
    candidate === "webhooks" ||
    candidate === "diagnostics"
    ? candidate
    : "orders";
}
```

Update the Admin route branch to return `section: resolveAdminSection(path)`.

- [x] **Step 6: Gate effects and visible workbench by `route.section`**

```ts
const isOrdersRoute = route.section === "orders";
const isLifecycleRoute = route.section === "lifecycle";
const isInventoryRoute = route.section === "inventory";
const isWebhooksRoute = route.section === "webhooks";
const isDiagnosticsRoute = route.section === "diagnostics";
```

Orders and Lifecycle may call `/api/admin/orders`; Inventory calls only inventory and pickup-date APIs; Webhooks calls only webhooks; Diagnostics calls only payment-debug and debug-log APIs. Render one route heading and one workbench body, keep shared profile/market/session/logout/navigation in the shell, add Diagnostics to navigation, and set `aria-current="page"` on the active link.

- [x] **Step 7: Run focused green verification**

Run: `npm test -- web/src/app/routes.test.ts web/src/app/App.interactions.test.tsx web/src/app/App.test.tsx`

Expected: PASS with all route, interaction, and static App tests green.

- [x] **Step 8: Run type/style verification and commit**

Run: `npm run typecheck && npm run lint && npm run format:check && git diff --check`

Expected: all commands exit `0`.

Commit: `git commit -m "feat: isolate admin workbench routes"`

---

### Task 2: Typed Server Filters And Cursor Pagination

**Files:**

- Create: `server/src/routes/adminQuery.ts`
- Create: `server/tests/adminQuery.test.ts`
- Modify: `server/src/repositories/adminRepository.ts`
- Modify: `server/src/routes/admin.ts`
- Modify: `server/tests/adminRepository.test.ts`
- Modify: `server/tests/adminRoutes.test.ts`
- Create: `web/src/features/admin/adminQuery.ts`
- Create: `web/src/features/admin/adminQuery.test.ts`

**Interfaces:**

- Consumes: route query strings, signed Admin session, existing Admin repository rows.
- Produces: `AdminCursorPage<T>` and typed Orders, Lifecycle, Inventory, Webhooks, Payment Diagnostics, and Runtime Logs query objects.

```ts
export interface AdminCursorPage<T> {
  readonly items: readonly T[];
  readonly page_info: {
    readonly total_count: number;
    readonly next_cursor: string | null;
    readonly timezone: string;
  };
}

export interface AdminOrdersQuery {
  readonly orderNumber?: string;
  readonly status?: OrderStatus;
  readonly fulfillment?: "delivery" | "pickup";
  readonly paymentStatus?: AdminOrderPaymentStatus;
  readonly createdFrom?: string;
  readonly createdTo?: string;
  readonly cursor?: string;
  readonly limit: number;
}
```

- [x] **Step 1:** Add failing parser tests for allowed values, ISO boundaries, `limit` clamping to `1..100`, invalid cursor rejection, and `Asia/Shanghai`/`UTC` timezone echo.
- [x] **Step 2:** Run `npm test -- server/tests/adminQuery.test.ts`; expect missing parser failures.
- [x] **Step 3:** Implement pure parsers in `adminQuery.ts` that return a normalized query or a `400 INVALID_ADMIN_FILTERS` detail object.
- [x] **Step 4:** Add failing repository tests that assert Supabase query chains receive `eq`, `gte`, `lte`, ordered cursor, and `limit + 1` operations instead of client-side filtering.
- [x] **Step 5:** Extend `SupabaseAdminQuery` with `gte`, `lte`, `lt`, `or`, and `range` methods and implement repository list methods that return `AdminCursorPage<T>`.
- [x] **Step 6:** Map route-specific envelopes as `{ orders, page_info }`, `{ lifecycle, page_info }`, `{ inventory, page_info }`, `{ webhooks, page_info }`, `{ payment_sessions, page_info }`, and `{ debug_logs, page_info }`.
- [x] **Step 7:** Implement `buildAdminQuery(location, section)` in the web module so URL parameters map one-to-one to backend query names and `Clear all` returns the section pathname.
- [x] **Step 8:** Run `npm test -- server/tests/adminQuery.test.ts server/tests/adminRepository.test.ts server/tests/adminRoutes.test.ts web/src/features/admin/adminQuery.test.ts` and `npm run typecheck`.
- [x] **Step 9:** Commit with `git commit -m "feat: add admin server filters and pagination"`.

**Review checkpoint:** Closed after the initial review findings were repaired with endpoint-bound cursors, bounded Central/Store Inventory keysets, required Runtime log IDs, independent multi-resource cursors, and correct Stock/Pickup availability ownership. Final independent re-review reported no Critical, Important, or Minor findings.

---

### Task 3: Workbench Filters, Results, And Drill-Down UI

**Files:**

- Create: `web/src/features/admin/AdminShell.tsx`
- Create: `web/src/features/admin/AdminFilters.tsx`
- Create: `web/src/features/admin/AdminOrdersWorkbench.tsx`
- Create: `web/src/features/admin/AdminLifecycleWorkbench.tsx`
- Create: `web/src/features/admin/AdminInventoryWorkbench.tsx`
- Create: `web/src/features/admin/AdminWebhooksWorkbench.tsx`
- Create: `web/src/features/admin/AdminDiagnosticsWorkbench.tsx`
- Create: `web/src/features/admin/AdminWorkbenches.test.tsx`
- Modify: `web/src/app/App.tsx`
- Modify: `web/src/styles/global.css`

**Interfaces:**

- Consumes: Task 1 route section and Task 2 query/envelope types.
- Produces: shared Admin header/navigation, URL-backed desktop filters and mobile shadcn `Sheet`, result counts/chips/clear action, loading/failure/filtered-empty/true-empty states, and route-specific results.

```ts
export interface AdminWorkbenchRequest<TData> {
  readonly status: "idle" | "loading" | "ready" | "empty" | "error";
  readonly data: TData | null;
  readonly errorMessage: string | null;
  readonly lastUpdatedAt: string | null;
}
```

- [x] **Step 1:** Write failing component tests for the five headings, active navigation, URL filter restoration, editable mobile Sheet, filtered-empty clear action, retry action, and no page-level overflow classes.
- [x] **Step 2:** Run the focused test and confirm the mockup-required UI is absent.
- [x] **Step 3:** Extract the shared shell and filter components without changing Admin authentication ownership.
- [x] **Step 4:** Implement Orders master/detail, Lifecycle queue, Inventory Stock/Pickup tabs, Webhooks table/detail, and Diagnostics Payment/Runtime tabs with existing shadcn primitives.
- [x] **Step 5:** Wire filter submit through `history.pushState`, `popstate`, and a route-local reload; active filters remain deterministic across refresh/back.
- [x] **Step 6:** Run `npm test -- web/src/features/admin/AdminWorkbenches.test.tsx web/src/app/App.interactions.test.tsx web/src/styles/global.test.ts` plus `npm run typecheck`.
- [x] **Step 7:** Commit with `git commit -m "feat: build admin post-purchase workbenches"`.

---

### Task 4: Atomic Lifecycle Mutation And Account Visibility

**Files:**

- Create: `supabase/migrations/20260713090000_admin_lifecycle_transition.sql`
- Create: `server/src/lifecycleNote.ts`
- Modify: `server/src/repositories/adminRepository.ts`
- Modify: `server/src/repositories/accountRepository.ts`
- Modify: `server/src/routes/admin.ts`
- Create: `server/tests/lifecycleNote.test.ts`
- Modify: `server/tests/adminRepository.test.ts`
- Modify: `server/tests/accountRepository.test.ts`
- Modify: `server/tests/adminRoutes.test.ts`
- Modify: `server/tests/accountRoutes.test.ts`
- Modify: `web/src/app/App.tsx`
- Modify: `web/src/app/App.interactions.test.tsx`
- Modify: `web/src/features/admin/AdminLifecycleWorkbench.tsx`
- Modify: `web/src/features/admin/AdminWorkbenches.test.tsx`

**Interfaces:**

- Consumes: canonical `planOrderStatusTransition`, current persisted status, optional merchant note, Admin session.
- Produces: `transitionOrderLifecycle({ orderId, expectedStatus, nextStatus, note, occurredAt })`, returning updated detail or typed stale/not-found result.

```ts
export type AdminLifecycleTransitionResult =
  | { readonly status: "updated"; readonly order: AdminOrderRow }
  | { readonly status: "stale"; readonly currentStatus: OrderStatus }
  | { readonly status: "not_found" };
```

- [x] **Step 1:** Write failing repository tests proving the order update and one Admin lifecycle event are one RPC transaction.
- [x] **Step 2:** Write failing route tests for optional note, stale `expected_status`, `409`, canonical reload detail, and unchanged webhook count.
- [x] **Step 3:** Add the Postgres function with `UPDATE ... WHERE id = p_order_id AND status = p_expected_status`, one lifecycle insert, and a single returned row; grant execution only to the service-role path used by the server.
- [x] **Step 4:** Replace the route's separate `updateOrderStatus`/`createLifecycleEvent` calls with the atomic repository method.
- [x] **Step 5:** Add the confirmation Dialog, merchant note, saving/success feedback, and stale-state reload behavior to Lifecycle.
- [x] **Step 6:** Prove Account order detail returns the new status/timeline through its existing API and no Diagnostics source is used.
- [x] **Step 7:** Run focused server/web tests, `npm run typecheck`, and `npm run db:lint` when local Supabase is available; document any local Supabase or sandbox blocker otherwise.
- [x] **Step 8:** Commit with `git commit -m "feat: make admin lifecycle transitions atomic"`.

---

### Task 5: Persistent Sanitized Runtime Diagnostics

**Files:**

- Modify: `server/src/debug/logger.ts`
- Modify: `server/tests/debugLogger.test.ts`
- Modify: `server/src/repositories/adminRepository.ts`
- Modify: `server/tests/adminRepository.test.ts`
- Modify: `server/src/server.ts`
- Modify: `server/src/routes/admin.ts`
- Modify: `server/tests/adminRoutes.test.ts`

**Interfaces:**

- Consumes: sanitized `DebugLogEntry`, existing `runtime_debug_logs` table, route/query contract from Task 2.
- Produces: best-effort persistent sink, bounded in-memory fallback, 7-day cleanup throttle, allowlisted Admin response mapper.

```ts
export interface RuntimeDebugLogPersistenceRepository {
  readonly insertRuntimeDebugLog: (entry: DebugLogEntry) => Promise<void>;
  readonly deleteRuntimeDebugLogsBefore: (cutoff: string) => Promise<void>;
}
```

- [x] **Step 1:** Write failing logger tests for recursive redaction, event-specific allowlists, async sink rejection, non-recursion, and unchanged business-call resolution.
- [x] **Step 2:** Write failing repository tests for insert mapping, query boundaries, and cleanup no more than once per 24 hours.
- [x] **Step 3:** Add a fire-and-forget downstream sink that receives only already-sanitized entries and swallows persistence errors without logging them through itself.
- [x] **Step 4:** Add the 7-day cleanup throttle and preserve the in-memory limit plus JSON console sink.
- [x] **Step 5:** Add only the approved correlated events for lifecycle, inventory/capacity, webhook outcomes, Account load failure, and payment amount-guard outcomes.
- [x] **Step 6:** Run `npm test -- server/tests/debugLogger.test.ts server/tests/adminRepository.test.ts server/tests/adminRoutes.test.ts` and `npm run typecheck`.
- [x] **Step 7:** Commit with `git commit -m "feat: persist sanitized runtime diagnostics"`.

---

### Task 6: Buyer Account Post-Purchase Polish

**Files:**

- Modify: `web/src/features/account/AccountPage.tsx`
- Modify: `web/src/features/account/AccountPage.test.tsx`
- Modify: `web/src/app/App.tsx`
- Modify: `web/src/app/App.interactions.test.tsx`
- Modify: `web/src/styles/global.css`

**Interfaces:**

- Consumes: existing `/api/account/orders` and `/api/account/orders/:orderNumber` canonical responses.
- Produces: `AccountOrderFilter = "all" | "in_progress" | "completed"`, explicit refresh/last-updated state, buyer-safe current-stage-first timeline, and preserved review eligibility.

```ts
export type AccountOrderFilter = "all" | "in_progress" | "completed";

export function matchesAccountOrderFilter(
  order: AccountOrderView,
  filter: AccountOrderFilter,
): boolean {
  if (filter === "all") return true;
  const completed =
    order.status === "delivered" || order.status === "picked_up";
  return filter === "completed"
    ? completed
    : !completed && order.status !== "cancelled";
}
```

- [x] **Step 1:** Write failing tests for All/In progress/Completed mapping, cancelled visibility only under All, refresh loading/error/retry, latest-update copy, current stage prominence, Delivery/Pickup detail, and absence of technical IDs.
- [x] **Step 2:** Run focused Account tests and confirm the missing controls/states fail.
- [x] **Step 3:** Add filter state and pure mapping helper, then render counts and filtered orders.
- [x] **Step 4:** Expose an App-owned `onRefreshOrders` callback that reruns the canonical account request and updates `lastUpdatedAt` only on success.
- [x] **Step 5:** Apply the approved buyer mockup hierarchy while preserving review submission/edit/delete behavior.
- [x] **Step 6:** Run Account/App/style tests plus typecheck and commit with `git commit -m "feat: polish account post-purchase orders"`.

**Independent-review correction:**

- [x] Map the canonical buyer-safe fulfillment address subset into the Account order view and render Delivery recipient/locality plus Pickup store name/locality without street, provider, payment, or technical identifiers.
- [x] Add visible Completed, Current stage, and Upcoming text to timeline rows so state is not color-only.
- [x] Cover both behaviors failing-first in Account component and App canonical-response tests; correction-focused GREEN passes `88` tests and full `npm run verify` passes `715` tests across `77` files plus typecheck, lint, and format check.
- Deferred boundary: shipping-option and pickup-window/date detail are unavailable until the canonical Account list/detail API adds explicit allowlisted fields. That API expansion, with contract and buyer-safety tests, is the trigger for follow-up work and is not a Task 6 blocker.

---

### Task 7: End-To-End Evidence, Review, And Tracking Closure

**Files:**

- Create: `tools/post-purchase-operations-evidence.playwright.js`
- Modify: `package.json`
- Modify: `IMPLEMENTATION_TASKS.md`
- Modify: `PLAN.md`
- Modify: `tracking/test-cases.md`
- Modify: `tracking/todos.md`
- Modify: `tracking/progress.md`
- Modify: `tracking/learnings.md`

**Interfaces:**

- Consumes: Tasks 1-6 and a running API-backed demo.
- Produces: local evidence metrics/screenshots, independent review disposition, and synchronized canonical status.

- [x] **Step 1:** Add a failing static evidence-script test requiring route rows for 375, 768, 1024, and 1440; filter persistence; drill-down; lifecycle-to-Account refresh; zero webhook growth; Diagnostics tabs; keyboard operation; and loading/error/empty states.
- [x] **Step 2:** Implement the Playwright evidence script and `npm run evidence:post-purchase-operations` command.
- [x] **Step 3:** Run `npm run verify`, `npm run build`, `git diff --check`, and `scripts/check-agent-system.sh` from the repository root.
- [x] **Step 4:** Run the API-backed evidence script, record `failedRows: []`, no console errors, no page-level overflow, and no sticky/fixed occlusion.
- [x] **Step 5:** Spawn an independent read-only reviewer with the plan path, base/head SHAs, diff, test output, and design contract; resolve every Critical/Important finding and rerun affected verification.
- [x] **Step 6:** Reconcile every open Post-Purchase checklist row with complete/deferred/blocked disposition; do not close the milestone for shell-only behavior.
- [x] **Step 7:** Commit with `git commit -m "test: close post-purchase operations evidence"`.

**2026-07-15 closure note:** The explicitly approved deterministic fixture adds Alice-owned paid Delivery order `DO-20260714-900001`; seed SQL deletes mutable lifecycle rows only for deterministic seeded order IDs before restoring canonical lifecycle events, so evidence reruns start from the same paid state without touching unrelated orders. The existing atomic lifecycle migration is applied to the linked Supabase project. Final evidence passes `17/17` rows with `missingRows: []`, `failedRows: []`, no actionable console/response issues, no page overflow, no sticky/fixed occlusion, and 44px minimum targets. The real paid-to-processing mutation is visible in Account with exact status, current timeline stage, and merchant note; the genuine received-webhook count remains `1 -> 1`, while method-aware Diagnostics proof reports no non-read Admin requests. Final review corrections enforce the exact fixture, paid pre-state, exact `Mark Processing` action, processing result, and accurate test-case closure. Independent re-review found no remaining P0/P1/P2 findings in scope. The earlier forced-kill residue risk for the mode-0600 temporary authentication helper remains an accepted documented residual because normal and failing runs clean it in `finally` and the passcode stays out of child argv. Fresh pre-commit `npm run verify` passes `720` tests across `77` files; build, deterministic seed summary, agent-system, and diff checks pass. The user explicitly approved staging and committing, closing Step 7 with this Task 7 commit.

**2026-07-15 post-deploy timing correction:** The first hosted rerun exposed two helper-only timing false negatives: the Account detail response arrived before its React commit, and the Orders refresh completed before the loading frame was sampled. Failing-first corrections now bind lifecycle mutation, Account API, and rendered detail identities to `DO-20260714-900001`; wait for exact Processing status/current-stage/timeline/note UI state; and hold only the exact real Orders-list GET through a preserved loading screenshot before fulfilling the untouched response. Exact HTTP `200`, final `ready`, and route cleanup are mandatory. A reject-by-default reviewer initially returned DECLINE for identity, status, static-test, and endpoint-matching gaps; all were fixed, the final hosted matrix passes `17/17`, and re-review returns ACCEPT with no P0/P1/P2 findings. Fresh full verification passes `721` tests across `77` files plus typecheck/lint/format and production build.

## Self-Review

- Spec coverage: Tasks 1-3 cover route separation, URL/server filters, page states, mobile filters, and data density; Task 4 covers lifecycle atomicity, Account visibility, stale recovery, notes, and zero synthetic webhooks; Task 5 covers persistent sanitized diagnostics and retention; Task 6 covers buyer Account polish; Task 7 covers browser evidence and tracking closure.
- Placeholder scan: every implementation step names its concrete behavior, files, command, and expected result; no placeholder instructions remain.
- Type consistency: Task 1's `AdminSection` feeds Task 3; Task 2's query/page contracts feed Task 3 and Task 5; Task 4's transition result is confined to server route/repository plus Lifecycle UI; Task 6 consumes existing Account response types without Diagnostics coupling.
- Scope control: provider-simulated webhooks, carrier APIs, bulk/reverse lifecycle changes, background Account polling, realtime subscriptions, saved Admin views, exports, and a new analytics store remain excluded.
