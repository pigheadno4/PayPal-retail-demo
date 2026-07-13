import { type FormEvent, useEffect, useMemo, useState } from "react";
import { FilterIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { AdminSection } from "../../app/routes";

interface AdminFiltersProps {
  readonly section: AdminSection;
  readonly search: string;
  readonly onApply: (path: string) => void;
  readonly onClear: () => void;
}

interface FilterOption {
  readonly value: string;
  readonly label: string;
}

interface FilterDefinition {
  readonly name: string;
  readonly label: string;
  readonly kind: "text" | "select" | "datetime" | "checkbox";
  readonly placeholder?: string;
  readonly options?: readonly FilterOption[];
}

const timezoneOptions: readonly FilterOption[] = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
  { value: "Europe/London", label: "Europe/London" },
];

const fulfillmentOptions: readonly FilterOption[] = [
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Pickup" },
];

const orderStatusOptions: readonly FilterOption[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "preparing_pickup",
  "ready_for_pickup",
  "picked_up",
  "cancelled",
].map((value) => ({ value, label: labelFromValue(value) }));

const filterDefinitions: Readonly<
  Record<AdminSection, readonly FilterDefinition[]>
> = {
  orders: [
    {
      name: "order_number",
      label: "Order number",
      kind: "text",
      placeholder: "DO-2026…",
    },
    {
      name: "status",
      label: "Order status",
      kind: "select",
      options: orderStatusOptions,
    },
    {
      name: "fulfillment",
      label: "Fulfillment",
      kind: "select",
      options: fulfillmentOptions,
    },
    {
      name: "payment_status",
      label: "Payment status",
      kind: "select",
      options: [
        "not_started",
        "started",
        "approved",
        "captured",
        "failed",
        "cancelled",
      ].map((value) => ({ value, label: labelFromValue(value) })),
    },
    { name: "created_from", label: "Created from", kind: "datetime" },
    { name: "created_to", label: "Created to", kind: "datetime" },
    {
      name: "timezone",
      label: "Timezone",
      kind: "select",
      options: timezoneOptions,
    },
  ],
  lifecycle: [
    {
      name: "order_number",
      label: "Order number",
      kind: "text",
      placeholder: "DO-2026…",
    },
    {
      name: "fulfillment",
      label: "Fulfillment",
      kind: "select",
      options: fulfillmentOptions,
    },
    {
      name: "status",
      label: "Current status",
      kind: "select",
      options: orderStatusOptions,
    },
    {
      name: "next_action",
      label: "Next action",
      kind: "select",
      options: [
        "processing",
        "shipped",
        "delivered",
        "preparing_pickup",
        "ready_for_pickup",
        "picked_up",
      ].map((value) => ({ value, label: labelFromValue(value) })),
    },
    { name: "actionable", label: "Actionable only", kind: "checkbox" },
    { name: "updated_from", label: "Updated from", kind: "datetime" },
    { name: "updated_to", label: "Updated to", kind: "datetime" },
    {
      name: "timezone",
      label: "Timezone",
      kind: "select",
      options: timezoneOptions,
    },
  ],
  inventory: [
    { name: "q", label: "SKU or product", kind: "text", placeholder: "MOLLY" },
    {
      name: "scope",
      label: "Inventory scope",
      kind: "select",
      options: ["central", "store"].map((value) => ({
        value,
        label: labelFromValue(value),
      })),
    },
    { name: "store_id", label: "Store ID", kind: "text" },
    {
      name: "stock_condition",
      label: "Stock condition",
      kind: "select",
      options: ["in_stock", "low_stock", "out_of_stock"].map((value) => ({
        value,
        label: labelFromValue(value),
      })),
    },
    {
      name: "availability",
      label: "Availability",
      kind: "select",
      options: ["available", "unavailable"].map((value) => ({
        value,
        label: labelFromValue(value),
      })),
    },
    { name: "changed_from", label: "Changed from", kind: "datetime" },
    { name: "changed_to", label: "Changed to", kind: "datetime" },
    {
      name: "timezone",
      label: "Timezone",
      kind: "select",
      options: timezoneOptions,
    },
  ],
  webhooks: [
    { name: "event_id", label: "Event ID", kind: "text" },
    {
      name: "event_type",
      label: "Event type",
      kind: "text",
      placeholder: "CHECKOUT.ORDER.APPROVED",
    },
    {
      name: "verification_status",
      label: "Verification status",
      kind: "select",
      options: ["valid", "invalid", "error"].map((value) => ({
        value,
        label: labelFromValue(value),
      })),
    },
    {
      name: "processing_status",
      label: "Processing status",
      kind: "select",
      options: ["received", "processed", "ignored", "failed"].map((value) => ({
        value,
        label: labelFromValue(value),
      })),
    },
    {
      name: "linked_state",
      label: "Linkage",
      kind: "select",
      options: ["linked", "unlinked"].map((value) => ({
        value,
        label: labelFromValue(value),
      })),
    },
    { name: "received_from", label: "Received from", kind: "datetime" },
    { name: "received_to", label: "Received to", kind: "datetime" },
    {
      name: "timezone",
      label: "Timezone",
      kind: "select",
      options: timezoneOptions,
    },
  ],
  diagnostics: [
    { name: "lookup", label: "Order, PayPal, or debug ID", kind: "text" },
    {
      name: "method",
      label: "Payment method",
      kind: "select",
      options: [
        "paypal",
        "paylater",
        "card",
        "apple_pay",
        "google_pay",
        "venmo",
      ].map((value) => ({ value, label: labelFromValue(value) })),
    },
    {
      name: "status",
      label: "Payment status",
      kind: "select",
      options: [
        "created",
        "approved",
        "captured",
        "failed",
        "cancelled",
        "expired",
      ].map((value) => ({ value, label: labelFromValue(value) })),
    },
    {
      name: "amount_consistency",
      label: "Amount consistency",
      kind: "select",
      options: ["not_checked", "matched", "mismatch", "tolerance"].map(
        (value) => ({
          value,
          label: labelFromValue(value),
        }),
      ),
    },
    {
      name: "level",
      label: "Log level",
      kind: "select",
      options: ["info", "warn", "error"].map((value) => ({
        value,
        label: labelFromValue(value),
      })),
    },
    { name: "category", label: "Log category", kind: "text" },
    { name: "event", label: "Runtime event", kind: "text" },
    { name: "logged_from", label: "Logged from", kind: "datetime" },
    { name: "logged_to", label: "Logged to", kind: "datetime" },
    {
      name: "timezone",
      label: "Timezone",
      kind: "select",
      options: timezoneOptions,
    },
  ],
};

export function AdminFilters({
  section,
  search,
  onApply,
  onClear,
}: AdminFiltersProps) {
  const definitions = filterDefinitions[section];
  const [values, setValues] = useState(() =>
    readFilterValues(search, definitions),
  );
  const [timePreset, setTimePreset] = useState("custom");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setValues(readFilterValues(search, definitions));
    setTimePreset("custom");
    setIsMobileOpen(false);
  }, [definitions, search]);

  const activeFilters = useMemo(() => {
    const parameters = new URLSearchParams(search);
    return definitions.flatMap((definition) => {
      const value = parameters.get(definition.name);
      return value ? [{ definition, value }] : [];
    });
  }, [definitions, search]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parameters = new URLSearchParams();
    definitions.forEach((definition) => {
      const value = values[definition.name]?.trim();
      if (value) {
        parameters.set(definition.name, value);
      }
    });
    const query = parameters.toString();
    onApply(`/admin/${section}${query ? `?${query}` : ""}`);
  };

  const handleClear = () => {
    setValues(readFilterValues("", definitions));
    setTimePreset("custom");
    onClear();
  };

  return (
    <section
      className="admin-filters"
      aria-label={`${labelFromValue(section)} filters`}
    >
      <div className="admin-filters__toolbar">
        <div>
          <strong>Filters</strong>
          <span>{activeFilters.length} active</span>
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="admin-filters__mobile-trigger"
            >
              <FilterIcon aria-hidden="true" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="admin-filters__sheet">
            <SheetHeader>
              <SheetTitle>{labelFromValue(section)} filters</SheetTitle>
              <SheetDescription>
                Apply server-side filters without leaving this workbench.
              </SheetDescription>
            </SheetHeader>
            <FilterForm
              surface="mobile"
              section={section}
              definitions={definitions}
              values={values}
              setValues={setValues}
              timePreset={timePreset}
              setTimePreset={setTimePreset}
              onSubmit={(event) => {
                handleSubmit(event);
                setIsMobileOpen(false);
              }}
              onClear={() => {
                handleClear();
                setIsMobileOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>
      </div>
      <FilterForm
        surface="desktop"
        section={section}
        definitions={definitions}
        values={values}
        setValues={setValues}
        timePreset={timePreset}
        setTimePreset={setTimePreset}
        onSubmit={handleSubmit}
        onClear={handleClear}
      />
      {activeFilters.length > 0 ? (
        <div className="admin-filters__chips" aria-label="Active filters">
          {activeFilters.map(({ definition, value }) => (
            <span key={definition.name}>
              {definition.label}: {labelFromValue(value)}
            </span>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            <XIcon aria-hidden="true" />
            Clear all
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function FilterForm({
  surface,
  section,
  definitions,
  values,
  setValues,
  timePreset,
  setTimePreset,
  onSubmit,
  onClear,
}: {
  readonly surface: "desktop" | "mobile";
  readonly section: AdminSection;
  readonly definitions: readonly FilterDefinition[];
  readonly values: Readonly<Record<string, string>>;
  readonly setValues: (
    update: (
      current: Readonly<Record<string, string>>,
    ) => Readonly<Record<string, string>>,
  ) => void;
  readonly timePreset: string;
  readonly setTimePreset: (value: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onClear: () => void;
}) {
  const fromDefinition = definitions.find((definition) =>
    definition.name.endsWith("_from"),
  );
  const toDefinition = definitions.find((definition) =>
    definition.name.endsWith("_to"),
  );

  return (
    <form
      className={`admin-filters__form admin-filters__form--${surface}`}
      aria-label={`${labelFromValue(section)} filters${surface === "mobile" ? " mobile" : ""}`}
      onSubmit={onSubmit}
    >
      <div className="admin-filters__fields">
        {fromDefinition && toDefinition ? (
          <label htmlFor={`admin-filter-${surface}-${section}-time-preset`}>
            <span>Time range</span>
            <select
              id={`admin-filter-${surface}-${section}-time-preset`}
              value={timePreset}
              onChange={(event) => {
                const preset = event.target.value;
                setTimePreset(preset);
                if (preset === "custom") {
                  return;
                }
                const duration = timePresetDurations[preset];
                if (!duration) {
                  return;
                }
                const to = new Date();
                const from = new Date(to.getTime() - duration);
                setValues((current) => ({
                  ...current,
                  [fromDefinition.name]: from.toISOString(),
                  [toDefinition.name]: to.toISOString(),
                  timezone: current.timezone || "UTC",
                }));
              }}
            >
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        ) : null}
        {definitions.map((definition) => {
          const id = `admin-filter-${surface}-${section}-${definition.name}`;
          const value = values[definition.name] ?? "";
          if (definition.kind === "checkbox") {
            return (
              <label
                key={definition.name}
                className="admin-filters__checkbox"
                htmlFor={id}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={value === "true"}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [definition.name]: event.target.checked ? "true" : "",
                    }))
                  }
                />
                {definition.label}
              </label>
            );
          }
          return (
            <label key={definition.name} htmlFor={id}>
              <span>{definition.label}</span>
              {definition.kind === "select" ? (
                <select
                  id={id}
                  value={value}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [definition.name]: event.target.value,
                    }))
                  }
                >
                  <option value="">All</option>
                  {definition.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={id}
                  type={
                    definition.kind === "datetime" ? "datetime-local" : "text"
                  }
                  placeholder={definition.placeholder}
                  value={toInputValue(value, definition.kind)}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [definition.name]: fromInputValue(
                        event.target.value,
                        definition.kind,
                      ),
                    }))
                  }
                />
              )}
            </label>
          );
        })}
      </div>
      <div className="admin-filters__actions">
        <Button type="submit">Apply filters</Button>
        <Button type="button" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </form>
  );
}

function readFilterValues(
  search: string,
  definitions: readonly FilterDefinition[],
): Readonly<Record<string, string>> {
  const parameters = new URLSearchParams(search);
  return Object.fromEntries(
    definitions.map((definition) => [
      definition.name,
      parameters.get(definition.name) ??
        (definition.name === "timezone" ? "UTC" : ""),
    ]),
  );
}

const timePresetDurations: Readonly<Record<string, number>> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function toInputValue(value: string, kind: FilterDefinition["kind"]): string {
  return kind === "datetime" ? value.replace(/Z$/, "").slice(0, 16) : value;
}

function fromInputValue(value: string, kind: FilterDefinition["kind"]): string {
  if (kind !== "datetime" || !value) {
    return value;
  }
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toISOString();
}

function labelFromValue(value: string): string {
  return value
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
