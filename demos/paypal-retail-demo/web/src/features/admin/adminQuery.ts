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
    "cursor",
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
    "cursor",
    "limit",
  ],
};

const diagnosticsPaymentParameters = new Set([
  "lookup",
  "method",
  "status",
  "amount_consistency",
  "updated_from",
  "updated_to",
  "timezone",
  "cursor",
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
  "cursor",
  "limit",
]);

export function buildAdminQuery(
  location: AdminQueryLocation,
  section: AdminSection,
): BuiltAdminQuery {
  const allowedParameters = new Set(parametersBySection[section]);
  const requestParameters = Array.from(
    new URLSearchParams(location.search).entries(),
  ).filter(([key]) => allowedParameters.has(key));
  const activeParameters = requestParameters.filter(
    ([key]) => key !== "cursor" && key !== "limit",
  );
  const clearPath = `/admin/${section}`;

  if (section === "diagnostics") {
    return {
      requestPaths: [
        buildRequestPath(
          "/api/admin/payment-debug",
          requestParameters.filter(([key]) =>
            diagnosticsPaymentParameters.has(key),
          ),
        ),
        buildRequestPath(
          "/api/admin/debug-logs",
          requestParameters.filter(([key]) =>
            diagnosticsRuntimeParameters.has(key),
          ),
        ),
      ],
      clearPath,
      activeParameters,
    };
  }

  const basePaths: Readonly<
    Record<Exclude<AdminSection, "diagnostics">, readonly string[]>
  > = {
    orders: ["/api/admin/orders"],
    lifecycle: ["/api/admin/lifecycle"],
    inventory: ["/api/admin/inventory", "/api/admin/pickup-dates"],
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
