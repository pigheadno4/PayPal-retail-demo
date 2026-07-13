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

import { ApiClientError, type ApiClient } from "../../api/client";
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
        /^\/admin\/orders\?created_from=.+&created_to=.+&timezone=UTC&time_preset=24h$/,
      ),
    );
  });

  it("shows only the active Diagnostics dataset filters and preserves its URL state", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AdminFilters
        section="diagnostics"
        diagnosticsDataset="runtime"
        search="?dataset=runtime&level=error&logged_from=2026-07-13T00%3A00%3A00.000Z&logged_to=2026-07-13T01%3A00%3A00.000Z&timezone=UTC&time_preset=1h"
        onApply={onApply}
        onClear={() => undefined}
      />,
    );

    const form = screen.getByRole("form", { name: "Diagnostics filters" });
    expect(within(form).getByLabelText("Log level")).toBeTruthy();
    expect(within(form).queryByLabelText("Payment method")).toBeNull();
    expect(
      (within(form).getByLabelText("Time range") as HTMLSelectElement).value,
    ).toBe("1h");

    await user.click(
      within(form).getByRole("button", { name: "Apply filters" }),
    );
    expect(onApply).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/admin\/diagnostics\?dataset=runtime&level=error&logged_from=.+&logged_to=.+&timezone=UTC&time_preset=1h$/,
      ),
    );
  });

  it("converts custom date-times using the selected IANA timezone", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AdminFilters
        section="orders"
        search="?created_from=2026-07-13T00%3A00%3A00.000Z&timezone=Asia%2FShanghai&time_preset=custom"
        onApply={onApply}
        onClear={() => undefined}
      />,
    );

    const form = screen.getByRole("form", { name: "Orders filters" });
    const createdFrom = within(form).getByLabelText(
      "Created from",
    ) as HTMLInputElement;
    expect(createdFrom.value).toBe("2026-07-13T08:00");

    await user.clear(createdFrom);
    await user.type(createdFrom, "2026-07-13T09:30");
    await user.click(
      within(form).getByRole("button", { name: "Apply filters" }),
    );

    expect(onApply).toHaveBeenCalledWith(
      "/admin/orders?created_from=2026-07-13T01%3A30%3A00.000Z&timezone=Asia%2FShanghai&time_preset=custom",
    );
  });

  it("rejects DST gaps and chooses the earlier instant for repeated wall times", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <AdminFilters
        section="orders"
        search="?timezone=America%2FLos_Angeles"
        onApply={onApply}
        onClear={() => undefined}
      />,
    );

    const form = screen.getByRole("form", { name: "Orders filters" });
    const createdFrom = within(form).getByLabelText(
      "Created from",
    ) as HTMLInputElement;
    await user.type(createdFrom, "2026-03-08T02:30");

    expect(within(form).getByRole("alert").textContent).toContain(
      "does not exist in America/Los_Angeles",
    );
    await user.click(
      within(form).getByRole("button", { name: "Apply filters" }),
    );
    expect(onApply).not.toHaveBeenCalled();

    await user.selectOptions(within(form).getByLabelText("Timezone"), "UTC");
    expect(within(form).queryByRole("alert")).toBeNull();
    expect(createdFrom.value).toBe("2026-03-08T02:30");
    await user.click(
      within(form).getByRole("button", { name: "Apply filters" }),
    );
    expect(onApply).toHaveBeenCalledWith(
      "/admin/orders?created_from=2026-03-08T02%3A30%3A00.000Z&timezone=UTC&time_preset=custom",
    );
    onApply.mockClear();

    await user.selectOptions(
      within(form).getByLabelText("Timezone"),
      "America/Los_Angeles",
    );
    expect(within(form).getByRole("alert").textContent).toContain(
      "does not exist in America/Los_Angeles",
    );

    await user.clear(createdFrom);
    await user.type(createdFrom, "2026-11-01T01:30");
    expect(within(form).queryByRole("alert")).toBeNull();
    await user.click(
      within(form).getByRole("button", { name: "Apply filters" }),
    );
    expect(onApply).toHaveBeenCalledWith(
      "/admin/orders?created_from=2026-11-01T08%3A30%3A00.000Z&timezone=America%2FLos_Angeles&time_preset=custom",
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

  it("renders dense route-specific desktop result tables", () => {
    const orderRow = {
      id: "order-1",
      orderNumber: "DO-1001",
      fulfillment: "Delivery",
      status: "Processing",
      paymentStatus: "Captured",
      total: "$42.00",
      placedAt: "Jul 13, 2026",
      updatedAt: "Jul 13, 2026",
      nextAction: "Mark shipped",
    };
    const orders = render(
      <AdminOrdersWorkbench request={readyRequest} rows={[orderRow]} />,
    );
    expect(screen.getByRole("columnheader", { name: "Payment" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open DO-1001" })).toBeTruthy();
    orders.unmount();

    const lifecycle = render(
      <AdminLifecycleWorkbench request={readyRequest} rows={[orderRow]} />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Next action" }),
    ).toBeTruthy();
    expect(screen.getByText("Mark shipped")).toBeTruthy();
    lifecycle.unmount();

    render(
      <AdminWebhooksWorkbench
        request={readyRequest}
        rows={[
          {
            id: "webhook-1",
            eventId: "WH-1001",
            eventType: "PAYMENT.CAPTURE.COMPLETED",
            verificationStatus: "Valid",
            processingStatus: "Processed",
            receivedAt: "Jul 13, 2026",
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Verification" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Inspect WH-1001" }),
    ).toBeTruthy();
  });

  it("keeps secondary datasets reachable when the default subtab is empty or fails", async () => {
    const user = userEvent.setup();
    const view = render(
      <AdminInventoryWorkbench
        stockRequest={{ ...readyRequest, status: "empty", totalCount: 0 }}
        pickupRequest={readyRequest}
        stockContent="Stock row"
        pickupContent="Pickup row"
      />,
    );

    expect(screen.getByRole("tab", { name: "Pickup capacity" })).toBeTruthy();
    expect(screen.getByText("No stock rows are available yet.")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Pickup capacity" }));
    expect(screen.getByText("Pickup row")).toBeTruthy();

    view.rerender(
      <AdminDiagnosticsWorkbench
        paymentRequest={{
          ...readyRequest,
          status: "error",
          totalCount: 0,
          errorMessage: "Payment evidence failed.",
        }}
        runtimeRequest={readyRequest}
        paymentContent="Payment row"
        runtimeContent="Runtime row"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Payment evidence failed.",
    );
    expect(screen.getByRole("tab", { name: "Runtime logs" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Runtime logs" }));
    expect(screen.getByText("Runtime row")).toBeTruthy();
  });

  it("uses dataset-specific active filter counts for Inventory empty states", async () => {
    const user = userEvent.setup();
    render(
      <AdminInventoryWorkbench
        stockRequest={{ ...readyRequest, status: "empty", totalCount: 0 }}
        pickupRequest={{ ...readyRequest, status: "empty", totalCount: 0 }}
        stockActiveFilterCount={1}
        pickupActiveFilterCount={0}
      />,
    );

    expect(screen.getByText("No stock rows match these filters.")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Pickup capacity" }));
    expect(screen.getByText("No pickup dates are available yet.")).toBeTruthy();
  });

  it("does not apply Stock-only URL filters to Pickup empty-state copy", async () => {
    const user = userEvent.setup();
    const apiClient = createAdminApiClient();
    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "admin-inventory-filter-count-token",
    );

    render(
      <App
        apiClient={apiClient.client}
        initialPathname="/admin/inventory?q=MOLLY"
      />,
    );

    expect(
      await screen.findByText("No stock rows match these filters."),
    ).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Pickup capacity" }));
    expect(
      await screen.findByText("No pickup dates are available yet."),
    ).toBeTruthy();
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

  it("keeps Diagnostics dataset, filters, and default runtime window in URL state", async () => {
    const user = userEvent.setup();
    const apiClient = createAdminApiClient();
    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "admin-diagnostics-url-token",
    );

    render(
      <App apiClient={apiClient.client} initialPathname="/admin/diagnostics" />,
    );

    expect(
      (await screen.findByRole("tab", { name: "Payment" })).getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
    expect(screen.getByLabelText("Payment method")).toBeTruthy();
    expect(screen.queryByLabelText("Log level")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Runtime logs" }));
    await waitFor(() => {
      const parameters = new URLSearchParams(window.location.search);
      expect(parameters.get("dataset")).toBe("runtime");
      expect(parameters.get("time_preset")).toBe("24h");
      expect(parameters.get("logged_from")).toBeTruthy();
      expect(parameters.get("logged_to")).toBeTruthy();
      expect(parameters.get("timezone")).toBe("UTC");
    });
    expect(screen.getByLabelText("Log level")).toBeTruthy();
    expect(screen.queryByLabelText("Payment method")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Payment" }));
    await waitFor(() => {
      expect(window.location.search).toBe("?dataset=payment");
    });

    window.history.pushState(
      null,
      "",
      "/admin/diagnostics?dataset=runtime&logged_from=2026-07-12T12%3A00%3A00.000Z&logged_to=2026-07-13T12%3A00%3A00.000Z&timezone=UTC&time_preset=24h",
    );
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => {
      expect(
        screen
          .getByRole("tab", { name: "Runtime logs" })
          .getAttribute("aria-selected"),
      ).toBe("true");
      expect(
        (screen.getAllByLabelText("Time range")[0] as HTMLSelectElement).value,
      ).toBe("24h");
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

  it("confirms one lifecycle step with an optional merchant note", async () => {
    const user = userEvent.setup();
    const apiClient = createAdminApiClient({
      lifecycleOrder: true,
      lifecycleListEmptyAfterFirstLoad: true,
    });
    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "admin-lifecycle-action-token",
    );

    render(
      <App
        apiClient={apiClient.client}
        initialPathname="/admin/lifecycle?status=paid"
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Open DO-20260713-000001" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Mark Processing" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", {
        name: "Confirm lifecycle update",
      }),
    ).toBeTruthy();
    expect(dialog.textContent).toContain("Paid to Processing");
    await user.type(
      within(dialog).getByLabelText("Merchant note (optional)"),
      "Packed at warehouse station A.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Confirm update" }),
    );

    await waitFor(() => {
      expect(apiClient.postCalls).toEqual([
        {
          path: "/api/admin/orders/order_1/lifecycle",
          body: {
            expected_status: "paid",
            next_status: "processing",
            note: "Packed at warehouse station A.",
          },
        },
      ]);
      expect(
        screen
          .getByText("DO-20260713-000001 is now Processing.")
          .getAttribute("role"),
      ).toBe("status");
      expect(
        screen
          .getByText("DO-20260713-000001 is now Processing.")
          .getAttribute("aria-live"),
      ).toBe("polite");
      expect(
        apiClient.getPaths.filter((path) =>
          path.startsWith("/api/admin/lifecycle?status=paid"),
        ),
      ).toHaveLength(2);
      expect(
        screen.queryByRole("button", { name: "Open DO-20260713-000001" }),
      ).toBeNull();
    });
  });

  it("reloads canonical lifecycle detail after a stale 409", async () => {
    const user = userEvent.setup();
    const apiClient = createAdminApiClient({
      lifecycleOrder: true,
      lifecyclePost: "stale",
    });
    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "admin-lifecycle-stale-token",
    );

    render(
      <App apiClient={apiClient.client} initialPathname="/admin/lifecycle" />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Open DO-20260713-000001" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Mark Processing" }),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Confirm update",
      }),
    );

    await waitFor(() => {
      expect(
        apiClient.getPaths.filter(
          (path) => path === "/api/admin/orders/order_1",
        ),
      ).toHaveLength(2);
      expect(screen.getByRole("alert").textContent).toContain(
        "Canonical status reloaded as Shipped.",
      );
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(apiClient.postCalls).toEqual([
      {
        path: "/api/admin/orders/order_1/lifecycle",
        body: {
          expected_status: "paid",
          next_status: "processing",
          note: null,
        },
      },
    ]);
    expect(screen.getByText("Delivery order / Shipped")).toBeTruthy();
  });

  it("keeps a failed lifecycle note available and announces the error inside the dialog", async () => {
    const user = userEvent.setup();
    const apiClient = createAdminApiClient({
      lifecycleOrder: true,
      lifecyclePost: "error",
    });
    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "admin-lifecycle-error-token",
    );

    render(
      <App apiClient={apiClient.client} initialPathname="/admin/lifecycle" />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Open DO-20260713-000001" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Mark Processing" }),
    );
    const dialog = await screen.findByRole("dialog");
    const note = within(dialog).getByLabelText("Merchant note (optional)");
    await user.type(note, "Packed at warehouse station A.");
    await user.click(
      within(dialog).getByRole("button", { name: "Confirm update" }),
    );

    expect((await within(dialog).findByRole("alert")).textContent).toContain(
      "Lifecycle service is unavailable.",
    );
    expect((note as HTMLTextAreaElement).value).toBe(
      "Packed at warehouse station A.",
    );
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

  it("keeps Stock usable when Pickup capacity fails independently", async () => {
    const user = userEvent.setup();
    const apiClient = createAdminApiClient({ failPickup: true });
    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "admin-inventory-independent-token",
    );

    render(
      <App apiClient={apiClient.client} initialPathname="/admin/inventory" />,
    );

    expect(
      await screen.findByText("No stock rows are available yet."),
    ).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Pickup capacity" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Pickup capacity could not be loaded.",
    );
  });
});

function createAdminApiClient(
  options: {
    readonly failOrdersOnce?: boolean;
    readonly failPickup?: boolean;
    readonly lifecycleOrder?: boolean;
    readonly lifecycleListEmptyAfterFirstLoad?: boolean;
    readonly lifecyclePost?: "success" | "stale" | "error";
    readonly ordersNextCursor?: string;
    readonly ordersTotalCount?: number;
  } = {},
): {
  readonly client: ApiClient;
  readonly getPaths: string[];
  readonly postCalls: { readonly path: string; readonly body: unknown }[];
} {
  const getPaths: string[] = [];
  const postCalls: { path: string; body: unknown }[] = [];
  let failedOrders = false;
  let orderDetailLoads = 0;
  let lifecycleListLoads = 0;
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
      if (path === "/api/admin/orders/order_1") {
        orderDetailLoads += 1;
        const status =
          options.lifecyclePost === "stale" && orderDetailLoads > 1
            ? "shipped"
            : "paid";
        return {
          order: adminLifecycleOrderDetail(
            status,
            status === "shipped" ? ["delivered"] : ["processing"],
          ),
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
        lifecycleListLoads += 1;
        const lifecycleOrderIsVisible =
          options.lifecycleOrder &&
          !(options.lifecycleListEmptyAfterFirstLoad && lifecycleListLoads > 1);
        return {
          lifecycle: lifecycleOrderIsVisible
            ? [adminLifecycleOrderSummary("paid", ["processing"])]
            : [],
          page_info: {
            ...pageInfo,
            total_count: lifecycleOrderIsVisible ? 1 : 0,
          },
        } as never;
      }
      if (path.startsWith("/api/admin/inventory")) {
        return { inventory: [], page_info: pageInfo } as never;
      }
      if (path.startsWith("/api/admin/pickup-dates")) {
        if (options.failPickup) {
          throw new Error("Pickup capacity could not be loaded.");
        }
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
    async post(path, body) {
      postCalls.push({ path, body });
      if (
        path === "/api/admin/orders/order_1/lifecycle" &&
        options.lifecyclePost === "stale"
      ) {
        throw new ApiClientError({
          status: 409,
          code: "ADMIN_ORDER_LIFECYCLE_STALE",
          message: "The order changed before this lifecycle update was saved.",
          debugId: "dbg_stale",
          details: { current_status: "shipped" },
        });
      }
      if (
        path === "/api/admin/orders/order_1/lifecycle" &&
        options.lifecyclePost === "error"
      ) {
        throw new ApiClientError({
          status: 503,
          code: "ADMIN_ORDER_LIFECYCLE_UNAVAILABLE",
          message: "Lifecycle service is unavailable.",
          debugId: "dbg_lifecycle_unavailable",
          details: null,
        });
      }
      if (path === "/api/admin/orders/order_1/lifecycle") {
        return {
          order: adminLifecycleOrderDetail("processing", ["shipped"]),
        } as never;
      }
      return {} as never;
    },
  };

  return { client, getPaths, postCalls };
}

function adminLifecycleOrderSummary(
  status: "paid" | "processing" | "shipped",
  nextStatuses: readonly ("processing" | "shipped" | "delivered")[],
) {
  return {
    id: "order_1",
    profile_id: "profile_popmart",
    market_id: "market_us",
    order_number: "DO-20260713-000001",
    fulfillment_mode: "delivery" as const,
    status,
    payment_status: "captured",
    currency_code: "USD",
    total_minor: 2633,
    placed_at: "2026-07-13T01:00:00.000Z",
    updated_at: "2026-07-13T02:00:00.000Z",
    next_statuses: nextStatuses,
  };
}

function adminLifecycleOrderDetail(
  status: "paid" | "processing" | "shipped",
  nextStatuses: readonly ("processing" | "shipped" | "delivered")[],
) {
  return {
    ...adminLifecycleOrderSummary(status, nextStatuses),
    totals: {
      subtotal_minor: 1969,
      discount_minor: 0,
      tax_minor: 165,
      shipping_minor: 499,
      total_minor: 2633,
    },
    items: [
      {
        id: "order_item_1",
        product_sku: "MOLLY-BB-001",
        product_name: "Molly Imaginary Travel Blind Box",
        product_url: "/products/molly",
        product_image_url: "/assets/molly.png",
        unit_price_minor: 1969,
        quantity: 1,
        fulfillable_quantity: 1,
        unavailable_quantity: 0,
        line_subtotal_minor: 1969,
        line_discount_minor: 0,
        line_tax_minor: 165,
        line_total_minor: 2134,
      },
    ],
    addresses: [],
    timeline: [
      {
        id: `lifecycle_${status}`,
        from_status: status === "paid" ? "pending" : "paid",
        to_status: status,
        actor_type: status === "paid" ? "system" : "admin",
        note: status === "paid" ? "Payment captured." : "Merchant update.",
        created_at: "2026-07-13T02:00:00.000Z",
      },
    ],
    payment_sessions: [],
    total_snapshots: [],
    paypal_snapshots: [],
    promo_evaluations: [],
    promo_evaluation_lines: [],
    inventory_effects: [],
    linked_webhooks: [],
  };
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
