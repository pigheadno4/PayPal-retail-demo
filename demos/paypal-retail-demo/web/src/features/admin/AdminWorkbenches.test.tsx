// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../../api/client";
import { App } from "../../app/App";

import { AdminDiagnosticsWorkbench } from "./AdminDiagnosticsWorkbench";
import { AdminFilters } from "./AdminFilters";
import { AdminInventoryWorkbench } from "./AdminInventoryWorkbench";
import { AdminLifecycleWorkbench } from "./AdminLifecycleWorkbench";
import { AdminOrdersWorkbench } from "./AdminOrdersWorkbench";
import { AdminShell } from "./AdminShell";
import { AdminWebhooksWorkbench } from "./AdminWebhooksWorkbench";

const readyRequest = {
  status: "ready" as const,
  totalCount: 1,
  nextCursor: null,
  errorMessage: null,
  lastUpdatedAt: "2026-07-13T02:30:00.000Z",
};

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("Admin post-purchase workbenches", () => {
  it("renders one route heading and active navigation for every workbench", () => {
    const workbenches = [
      [
        "orders",
        <AdminOrdersWorkbench request={readyRequest}>
          Orders row
        </AdminOrdersWorkbench>,
      ],
      [
        "lifecycle",
        <AdminLifecycleWorkbench request={readyRequest}>
          Lifecycle row
        </AdminLifecycleWorkbench>,
      ],
      [
        "inventory",
        <AdminInventoryWorkbench
          stockRequest={readyRequest}
          pickupRequest={readyRequest}
          stockContent="Stock row"
          pickupContent="Pickup row"
        />,
      ],
      [
        "webhooks",
        <AdminWebhooksWorkbench request={readyRequest}>
          Webhook row
        </AdminWebhooksWorkbench>,
      ],
      [
        "diagnostics",
        <AdminDiagnosticsWorkbench
          paymentRequest={readyRequest}
          runtimeRequest={readyRequest}
          paymentContent="Payment row"
          runtimeContent="Runtime row"
        />,
      ],
    ] as const;

    for (const [section, workbench] of workbenches) {
      const view = render(
        <AdminShell
          section={section}
          sessionId="session-1"
          lastUpdatedAt="2026-07-13T02:30:00.000Z"
          onRefresh={() => undefined}
          onLogout={() => undefined}
        >
          {workbench}
        </AdminShell>,
      );

      const expectedHeading =
        section.slice(0, 1).toUpperCase() + section.slice(1);
      expect(
        screen.getByRole("heading", { name: expectedHeading, level: 2 }),
      ).toBeTruthy();
      expect(
        screen
          .getByRole("link", { name: expectedHeading })
          .getAttribute("aria-current"),
      ).toBe("page");
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
      expect(view.container.querySelector(".admin-workbench")).toBeTruthy();
      view.unmount();
    }
  });

  it("restores URL filters and applies edited desktop values", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AdminFilters
        section="orders"
        search="?order_number=DO-42&status=processing&timezone=Asia%2FShanghai"
        onApply={onApply}
        onClear={() => undefined}
      />,
    );

    const form = screen.getByRole("form", { name: "Orders filters" });
    const orderNumber = within(form).getByLabelText("Order number");
    expect(orderNumber.getAttribute("value")).toBe("DO-42");
    expect(
      (within(form).getByLabelText("Order status") as HTMLSelectElement).value,
    ).toBe("processing");
    expect(
      (within(form).getByLabelText("Timezone") as HTMLSelectElement).value,
    ).toBe("Asia/Shanghai");

    await user.clear(orderNumber);
    await user.type(orderNumber, "DO-99");
    await user.click(
      within(form).getByRole("button", { name: "Apply filters" }),
    );

    expect(onApply).toHaveBeenCalledWith(
      "/admin/orders?order_number=DO-99&status=processing&timezone=Asia%2FShanghai",
    );
  });

  it("opens an editable mobile filter Sheet with the restored values", async () => {
    const user = userEvent.setup();

    render(
      <AdminFilters
        section="webhooks"
        search="?event_type=CHECKOUT.ORDER.APPROVED&verification_status=valid"
        onApply={() => undefined}
        onClear={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filters" }));
    const dialog = await screen.findByRole("dialog");

    expect(
      (within(dialog).getByLabelText("Event type") as HTMLInputElement).value,
    ).toBe("CHECKOUT.ORDER.APPROVED");
    expect(
      (
        within(dialog).getByLabelText(
          "Verification status",
        ) as HTMLSelectElement
      ).value,
    ).toBe("valid");
    expect(
      within(dialog).getByRole("button", { name: "Apply filters" }),
    ).toBeTruthy();
    await user.click(
      within(dialog).getByRole("button", { name: "Apply filters" }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("turns Admin time presets into explicit server ranges and timezone", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AdminFilters
        section="orders"
        search=""
        onApply={onApply}
        onClear={() => undefined}
      />,
    );

    const form = screen.getByRole("form", { name: "Orders filters" });
    await user.selectOptions(within(form).getByLabelText("Time range"), "24h");

    expect(
      (within(form).getByLabelText("Created from") as HTMLInputElement).value,
    ).not.toBe("");
    expect(
      (within(form).getByLabelText("Created to") as HTMLInputElement).value,
    ).not.toBe("");
    expect(
      (within(form).getByLabelText("Timezone") as HTMLSelectElement).value,
    ).toBe("UTC");

    await user.click(
      within(form).getByRole("button", { name: "Apply filters" }),
    );
    expect(onApply).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/admin\/orders\?created_from=.+&created_to=.+&timezone=UTC$/,
      ),
    );
  });

  it("distinguishes filtered-empty from true-empty and exposes recovery", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    const view = render(
      <AdminOrdersWorkbench
        request={{ ...readyRequest, totalCount: 0 }}
        activeFilterCount={2}
        onClearFilters={onClearFilters}
      />,
    );

    expect(screen.getByText("No orders match these filters.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);

    view.rerender(
      <AdminOrdersWorkbench
        request={{ ...readyRequest, totalCount: 0 }}
        activeFilterCount={0}
      />,
    );
    expect(screen.getByText("No orders are available yet.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });

  it("announces failures and retries the affected workbench", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <AdminWebhooksWorkbench
        request={{
          ...readyRequest,
          status: "error",
          totalCount: 0,
          errorMessage: "Webhook events could not be loaded.",
        }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Webhook events could not be loaded.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps Inventory and Diagnostics datasets in distinct subtabs", async () => {
    const user = userEvent.setup();

    const view = render(
      <AdminInventoryWorkbench
        stockRequest={readyRequest}
        pickupRequest={readyRequest}
        stockContent="Stock row"
        pickupContent="Pickup row"
      />,
    );

    expect(screen.getByRole("tab", { name: "Stock" })).toBeTruthy();
    expect(screen.getByText("Stock row")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Pickup capacity" }));
    expect(screen.getByText("Pickup row")).toBeTruthy();

    view.rerender(
      <AdminDiagnosticsWorkbench
        paymentRequest={readyRequest}
        runtimeRequest={readyRequest}
        paymentContent="Payment row"
        runtimeContent="Runtime row"
      />,
    );
    expect(screen.getByRole("tab", { name: "Payment" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Runtime logs" }));
    expect(screen.getByText("Runtime row")).toBeTruthy();
  });

  it("uses restored URL filters for requests and reloads on apply and popstate", async () => {
    const user = userEvent.setup();
    const apiClient = createAdminApiClient();
    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "admin-filter-token",
    );

    render(
      <App
        apiClient={apiClient.client}
        initialPathname="/admin/orders?order_number=DO-42&status=processing"
      />,
    );

    const form = await screen.findByRole("form", { name: "Orders filters" });
    await waitFor(() => {
      expect(apiClient.getPaths).toContain(
        "/api/admin/orders?order_number=DO-42&status=processing",
      );
    });

    const orderNumber = within(form).getByLabelText("Order number");
    await user.clear(orderNumber);
    await user.type(orderNumber, "DO-99");
    await user.click(
      within(form).getByRole("button", { name: "Apply filters" }),
    );

    await waitFor(() => {
      expect(window.location.pathname + window.location.search).toBe(
        "/admin/orders?order_number=DO-99&status=processing&timezone=UTC",
      );
      expect(apiClient.getPaths).toContain(
        "/api/admin/orders?order_number=DO-99&status=processing&timezone=UTC",
      );
    });

    window.history.pushState(
      null,
      "",
      "/admin/orders?order_number=DO-42&status=processing",
    );
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => {
      expect(
        apiClient.getPaths.filter((path) => path.includes("DO-42")),
      ).toHaveLength(2);
    });
  });

  it("loads Lifecycle from its dedicated filtered endpoint", async () => {
    const apiClient = createAdminApiClient();
    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "admin-lifecycle-token",
    );

    render(
      <App
        apiClient={apiClient.client}
        initialPathname="/admin/lifecycle?actionable=true&next_action=shipped"
      />,
    );

    await screen.findByRole("heading", { name: "Lifecycle", level: 2 });
    await waitFor(() => {
      expect(apiClient.getPaths).toContain(
        "/api/admin/lifecycle?next_action=shipped&actionable=true",
      );
    });
    expect(
      apiClient.getPaths.some((path) => path.startsWith("/api/admin/orders")),
    ).toBe(false);
  });

  it("retries the active workbench after a request failure", async () => {
    const user = userEvent.setup();
    const apiClient = createAdminApiClient({ failOrdersOnce: true });
    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "admin-retry-token",
    );

    render(
      <App apiClient={apiClient.client} initialPathname="/admin/orders" />,
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Orders could not be loaded.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(
        apiClient.getPaths.filter((path) => path === "/api/admin/orders"),
      ).toHaveLength(2);
      expect(screen.getByText("No orders are available yet.")).toBeTruthy();
    });
  });

  it("moves the active route to the server-provided next cursor", async () => {
    const user = userEvent.setup();
    const apiClient = createAdminApiClient({
      ordersNextCursor: "orders-cursor-2",
      ordersTotalCount: 30,
    });
    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "admin-pagination-token",
    );

    render(
      <App apiClient={apiClient.client} initialPathname="/admin/orders" />,
    );

    await user.click(await screen.findByRole("button", { name: "Next page" }));
    await waitFor(() => {
      expect(window.location.pathname + window.location.search).toBe(
        "/admin/orders?cursor=orders-cursor-2",
      );
      expect(apiClient.getPaths).toContain(
        "/api/admin/orders?cursor=orders-cursor-2",
      );
    });
  });
});

function createAdminApiClient(
  options: {
    readonly failOrdersOnce?: boolean;
    readonly ordersNextCursor?: string;
    readonly ordersTotalCount?: number;
  } = {},
): { readonly client: ApiClient; readonly getPaths: string[] } {
  const getPaths: string[] = [];
  let failedOrders = false;
  const pageInfo = {
    total_count: 0,
    next_cursor: null,
    timezone: "UTC",
  };

  const client: ApiClient = {
    async get(path) {
      getPaths.push(path);
      if (path === "/api/admin/state") {
        return {
          authenticated: true,
          session: {
            session_id: "session-admin-workbench",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        } as never;
      }
      if (path.startsWith("/api/admin/orders")) {
        if (options.failOrdersOnce && !failedOrders) {
          failedOrders = true;
          throw new Error("Orders could not be loaded.");
        }
        return {
          orders: [],
          page_info: {
            ...pageInfo,
            total_count: options.ordersTotalCount ?? pageInfo.total_count,
            next_cursor: options.ordersNextCursor ?? pageInfo.next_cursor,
          },
        } as never;
      }
      if (path.startsWith("/api/admin/lifecycle")) {
        return { lifecycle: [], page_info: pageInfo } as never;
      }
      if (path.startsWith("/api/admin/inventory")) {
        return { inventory: [], page_info: pageInfo } as never;
      }
      if (path.startsWith("/api/admin/pickup-dates")) {
        return { pickup_dates: [], page_info: pageInfo } as never;
      }
      if (path.startsWith("/api/admin/webhooks")) {
        return { webhooks: [], page_info: pageInfo } as never;
      }
      if (path.startsWith("/api/admin/payment-debug")) {
        return { payment_sessions: [], page_info: pageInfo } as never;
      }
      if (path.startsWith("/api/admin/debug-logs")) {
        return { debug_logs: [], page_info: pageInfo } as never;
      }
      throw new Error(`Unexpected GET ${path}`);
    },
    async delete() {
      return {} as never;
    },
    async patch() {
      return {} as never;
    },
    async post() {
      return {} as never;
    },
  };

  return { client, getPaths };
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}
