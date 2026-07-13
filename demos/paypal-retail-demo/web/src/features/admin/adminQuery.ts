import type { AdminSection } from "../../app/routes";

export interface AdminQueryLocation {
  readonly pathname: string;
  readonly search: string;
}

export interface BuiltAdminQuery {
  readonly requestPaths: readonly string[];
  readonly clearPath: string;
  readonly activeParameters: readonly (readonly [string, string])[];
}

const parametersBySection: Readonly<Record<AdminSection, readonly string[]>> = {
  orders: [
    "order_number",
    "status",
    "fulfillment",
    "payment_status",
    "created_from",
    "created_to",
    "timezone",
    "cursor",
    "limit",
  ],
  lifecycle: [
    "order_number",
    "fulfillment",
    "status",
    "next_action",
    "actionable",
    "updated_from",
    "updated_to",
    "timezone",
    "cursor",
    "limit",
  ],
  inventory: [
    "q",
    "scope",
    "store_id",
    "stock_condition",
    "availability",
    "changed_from",
    "changed_to",
    "timezone",
    "stock_cursor",
    "pickup_cursor",
    "limit",
  ],
  webhooks: [
    "event_id",
    "event_type",
    "verification_status",
    "processing_status",
    "linked_state",
    "received_from",
    "received_to",
    "timezone",
    "cursor",
    "limit",
  ],
  diagnostics: [
    "lookup",
    "method",
    "status",
    "amount_consistency",
    "updated_from",
    "updated_to",
    "level",
    "category",
    "event",
    "logged_from",
    "logged_to",
    "timezone",
    "payment_cursor",
    "runtime_cursor",
    "limit",
  ],
};

const inventoryStockParameters = new Set([
  "q",
  "scope",
  "store_id",
  "stock_condition",
  "availability",
  "changed_from",
  "changed_to",
  "timezone",
  "limit",
]);

const inventoryPickupParameters = new Set([
  "store_id",
  "availability",
  "changed_from",
  "changed_to",
  "timezone",
  "limit",
]);

const diagnosticsPaymentParameters = new Set([
  "lookup",
  "method",
  "status",
  "amount_consistency",
  "updated_from",
  "updated_to",
  "timezone",
  "payment_cursor",
  "limit",
]);

const diagnosticsRuntimeParameters = new Set([
  "lookup",
  "level",
  "category",
  "event",
  "logged_from",
  "logged_to",
  "timezone",
  "runtime_cursor",
  "limit",
]);

export function buildAdminQuery(
  location: AdminQueryLocation,
  section: AdminSection,
): BuiltAdminQuery {
  const parameters = new URLSearchParams(location.search);
  const requestParameters = parametersBySection[section].flatMap((key) =>
    parameters.getAll(key).map((value) => [key, value] as const),
  );
  const requestedDiagnosticsDataset = parameters.get("dataset");
  const diagnosticsDataset =
    requestedDiagnosticsDataset === "runtime" ? "runtime" : "payment";
  const activeSourceParameters =
    section === "diagnostics"
      ? requestParameters.filter(([key]) =>
          (diagnosticsDataset === "runtime"
            ? diagnosticsRuntimeParameters
            : diagnosticsPaymentParameters
          ).has(key),
        )
      : requestParameters;
  const activeParameters = activeSourceParameters.filter(
    ([key]) =>
      !key.endsWith("_cursor") &&
      key !== "cursor" &&
      key !== "limit" &&
      !(
        key === "timezone" &&
        !activeSourceParameters.some(
          ([candidate]) =>
            candidate.endsWith("_from") || candidate.endsWith("_to"),
        )
      ),
  );
  const clearPath =
    section === "diagnostics" &&
    (requestedDiagnosticsDataset === "payment" ||
      requestedDiagnosticsDataset === "runtime")
      ? `/admin/diagnostics?dataset=${requestedDiagnosticsDataset}`
      : `/admin/${section}`;

  if (section === "inventory") {
    return {
      requestPaths: [
        buildRequestPath(
          "/api/admin/inventory",
          resourceParameters(
            requestParameters,
            inventoryStockParameters,
            "stock_cursor",
          ),
        ),
        buildRequestPath(
          "/api/admin/pickup-dates",
          resourceParameters(
            requestParameters,
            inventoryPickupParameters,
            "pickup_cursor",
          ),
        ),
      ],
      clearPath,
      activeParameters,
    };
  }

  if (section === "diagnostics") {
    return {
      requestPaths: [
        buildRequestPath(
          "/api/admin/payment-debug",
          diagnosticsDataset === "payment"
            ? resourceParameters(
                requestParameters,
                diagnosticsPaymentParameters,
                "payment_cursor",
              )
            : [],
        ),
        buildRequestPath(
          "/api/admin/debug-logs",
          diagnosticsDataset === "runtime"
            ? resourceParameters(
                requestParameters,
                diagnosticsRuntimeParameters,
                "runtime_cursor",
              )
            : [],
        ),
      ],
      clearPath,
      activeParameters,
    };
  }

  const basePaths: Readonly<
    Record<
      Exclude<AdminSection, "diagnostics" | "inventory">,
      readonly string[]
    >
  > = {
    orders: ["/api/admin/orders"],
    lifecycle: ["/api/admin/lifecycle"],
    webhooks: ["/api/admin/webhooks"],
  };

  return {
    requestPaths: basePaths[section].map((basePath) =>
      buildRequestPath(basePath, requestParameters),
    ),
    clearPath,
    activeParameters,
  };
}

export function materializeAdminDefaultTimeRange(
  location: AdminQueryLocation,
  section: AdminSection,
  now = new Date(),
): AdminQueryLocation {
  const parameters = new URLSearchParams(location.search);
  const isRuntimeDiagnostics =
    section === "diagnostics" && parameters.get("dataset") === "runtime";
  const rangeKeys =
    section === "webhooks"
      ? (["received_from", "received_to"] as const)
      : isRuntimeDiagnostics
        ? (["logged_from", "logged_to"] as const)
        : null;

  if (
    !rangeKeys ||
    parameters.has(rangeKeys[0]) ||
    parameters.has(rangeKeys[1])
  ) {
    return location;
  }

  const to = new Date(now);
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  parameters.set(rangeKeys[0], from.toISOString());
  parameters.set(rangeKeys[1], to.toISOString());
  parameters.set("timezone", "UTC");
  parameters.set("time_preset", "24h");

  return {
    pathname: location.pathname,
    search: `?${parameters.toString()}`,
  };
}

function resourceParameters(
  parameters: readonly (readonly [string, string])[],
  allowed: ReadonlySet<string>,
  cursorParameter: string,
): readonly (readonly [string, string])[] {
  const selected = parameters.flatMap(([key, value]) => {
    if (key === cursorParameter) {
      return [["cursor", value] as const];
    }
    return allowed.has(key) ? [[key, value] as const] : [];
  });
  const hasTimeBoundary = selected.some(
    ([key]) => key.endsWith("_from") || key.endsWith("_to"),
  );
  return selected.filter(([key]) => key !== "timezone" || hasTimeBoundary);
}

function buildRequestPath(
  basePath: string,
  parameters: readonly (readonly [string, string])[],
): string {
  const searchParameters = new URLSearchParams();
  for (const [key, value] of parameters) {
    searchParameters.append(key, value);
  }
  const search = searchParameters.toString();
  return search ? `${basePath}?${search}` : basePath;
}
