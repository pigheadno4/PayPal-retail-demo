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
  readonly diagnosticsDataset?: "payment" | "runtime";
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
    { name: "updated_from", label: "Updated from", kind: "datetime" },
    { name: "updated_to", label: "Updated to", kind: "datetime" },
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

const diagnosticsFilterNames: Readonly<
  Record<"payment" | "runtime", ReadonlySet<string>>
> = {
  payment: new Set([
    "lookup",
    "method",
    "status",
    "amount_consistency",
    "updated_from",
    "updated_to",
    "timezone",
  ]),
  runtime: new Set([
    "lookup",
    "level",
    "category",
    "event",
    "logged_from",
    "logged_to",
    "timezone",
  ]),
};

export function AdminFilters({
  section,
  diagnosticsDataset = "payment",
  search,
  onApply,
  onClear,
}: AdminFiltersProps) {
  const definitions = useMemo(
    () =>
      section === "diagnostics"
        ? filterDefinitions.diagnostics.filter((definition) =>
            diagnosticsFilterNames[diagnosticsDataset].has(definition.name),
          )
        : filterDefinitions[section],
    [diagnosticsDataset, section],
  );
  const [values, setValues] = useState(() =>
    readFilterValues(search, definitions),
  );
  const [timePreset, setTimePreset] = useState(() => readTimePreset(search));
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Readonly<Record<string, string>>
  >({});

  useEffect(() => {
    setValues(readFilterValues(search, definitions));
    setTimePreset(readTimePreset(search));
    setIsMobileOpen(false);
    setValidationErrors({});
  }, [definitions, search]);

  const activeFilters = useMemo(() => {
    const parameters = new URLSearchParams(search);
    return definitions.flatMap((definition) => {
      const value = parameters.get(definition.name);
      if (
        definition.name === "timezone" &&
        !definitions.some(
          (candidate) =>
            (candidate.name.endsWith("_from") ||
              candidate.name.endsWith("_to")) &&
            parameters.has(candidate.name),
        )
      ) {
        return [];
      }
      return value ? [{ definition, value }] : [];
    });
  }, [definitions, search]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (Object.values(validationErrors).some(Boolean)) {
      return false;
    }
    const parameters = new URLSearchParams();
    if (section === "diagnostics") {
      parameters.set("dataset", diagnosticsDataset);
    }
    definitions.forEach((definition) => {
      const value = values[definition.name]?.trim();
      if (value) {
        parameters.set(definition.name, value);
      }
    });
    const hasTimeBoundary = definitions.some(
      (definition) =>
        (definition.name.endsWith("_from") ||
          definition.name.endsWith("_to")) &&
        Boolean(values[definition.name]?.trim()),
    );
    if (hasTimeBoundary) {
      parameters.set("time_preset", timePreset);
    }
    const query = parameters.toString();
    onApply(`/admin/${section}${query ? `?${query}` : ""}`);
    return true;
  };

  const handleClear = () => {
    setValues(readFilterValues("", definitions));
    setTimePreset("custom");
    setValidationErrors({});
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
              validationErrors={validationErrors}
              setValidationErrors={setValidationErrors}
              timePreset={timePreset}
              setTimePreset={setTimePreset}
              onSubmit={(event) => {
                if (handleSubmit(event)) {
                  setIsMobileOpen(false);
                }
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
        validationErrors={validationErrors}
        setValidationErrors={setValidationErrors}
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
  validationErrors,
  setValidationErrors,
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
  readonly validationErrors: Readonly<Record<string, string>>;
  readonly setValidationErrors: (
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

  const handleTimezoneChange = (nextTimezoneValue: string) => {
    const currentTimezone = values.timezone || "UTC";
    const nextTimezone = nextTimezoneValue || "UTC";
    const nextValues: Record<string, string> = {
      ...values,
      timezone: nextTimezone,
    };
    const nextErrors: Record<string, string> = { ...validationErrors };

    definitions.forEach((definition) => {
      if (definition.kind !== "datetime") {
        return;
      }
      const currentValue = values[definition.name] ?? "";
      if (!currentValue) {
        delete nextErrors[definition.name];
        return;
      }
      const wallTime = toInputValue(
        currentValue,
        definition.kind,
        currentTimezone,
      );
      const result = fromInputValue(wallTime, definition.kind, nextTimezone);
      nextValues[definition.name] = result.value;
      if (result.error) {
        nextErrors[definition.name] = result.error;
      } else {
        delete nextErrors[definition.name];
      }
    });

    setValues(() => nextValues);
    setValidationErrors(() => nextErrors);
  };

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
                setValidationErrors((current) => {
                  const next = { ...current };
                  delete next[fromDefinition.name];
                  delete next[toDefinition.name];
                  return next;
                });
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
          const errorId = `${id}-error`;
          const value = values[definition.name] ?? "";
          const validationError = validationErrors[definition.name];
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
                  onChange={(event) => {
                    if (definition.name === "timezone") {
                      handleTimezoneChange(event.target.value);
                      return;
                    }
                    setValues((current) => ({
                      ...current,
                      [definition.name]: event.target.value,
                    }));
                  }}
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
                  aria-invalid={validationError ? "true" : undefined}
                  aria-describedby={validationError ? errorId : undefined}
                  value={toInputValue(
                    value,
                    definition.kind,
                    values.timezone || "UTC",
                  )}
                  onChange={(event) => {
                    if (definition.kind === "datetime") {
                      setTimePreset("custom");
                      const result = fromInputValue(
                        event.target.value,
                        definition.kind,
                        values.timezone || "UTC",
                      );
                      setValues((current) => ({
                        ...current,
                        [definition.name]: result.value,
                      }));
                      setValidationErrors((current) => {
                        const next = { ...current };
                        if (result.error) {
                          next[definition.name] = result.error;
                        } else {
                          delete next[definition.name];
                        }
                        return next;
                      });
                      return;
                    }
                    setValues((current) => ({
                      ...current,
                      [definition.name]: event.target.value,
                    }));
                  }}
                />
              )}
              {validationError ? (
                <span
                  id={errorId}
                  className="admin-filters__field-error"
                  role="alert"
                >
                  {validationError}
                </span>
              ) : null}
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

function readTimePreset(search: string): string {
  const preset = new URLSearchParams(search).get("time_preset");
  return preset && preset in timePresetDurations ? preset : "custom";
}

const timePresetDurations: Readonly<Record<string, number>> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function toInputValue(
  value: string,
  kind: FilterDefinition["kind"],
  timezone: string,
): string {
  if (kind !== "datetime" || !value) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    return value.slice(0, 16);
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value.replace(/Z$/, "").slice(0, 16);
  }

  const parts = getZonedDateTimeParts(timestamp, timezone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function fromInputValue(
  value: string,
  kind: FilterDefinition["kind"],
  timezone: string,
): { readonly value: string; readonly error: string | null } {
  if (kind !== "datetime" || !value) {
    return { value, error: null };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (!match) {
    return { value, error: "Enter a complete local date and time." };
  }

  const target = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? "0"),
  };
  const targetTimestamp = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
    target.second,
  );
  const candidates = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 6) {
    const sampleTimestamp = targetTimestamp + hours * 60 * 60 * 1000;
    const displayed = getZonedDateTimeParts(
      new Date(sampleTimestamp),
      timezone,
    );
    const displayedTimestamp = Date.UTC(
      Number(displayed.year),
      Number(displayed.month) - 1,
      Number(displayed.day),
      Number(displayed.hour),
      Number(displayed.minute),
      Number(displayed.second),
    );
    const offset = displayedTimestamp - sampleTimestamp;
    const candidate = targetTimestamp - offset;
    if (
      matchesWallTime(
        getZonedDateTimeParts(new Date(candidate), timezone),
        target,
      )
    ) {
      candidates.add(candidate);
    }
  }

  if (candidates.size === 0) {
    return {
      value,
      error: `This local time does not exist in ${timezone} because of daylight saving time. Choose another time.`,
    };
  }

  const earlierCandidate = Math.min(...candidates);
  return { value: new Date(earlierCandidate).toISOString(), error: null };
}

function matchesWallTime(
  actual: Readonly<
    Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>
  >,
  expected: Readonly<{
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  }>,
): boolean {
  return (
    Number(actual.year) === expected.year &&
    Number(actual.month) === expected.month &&
    Number(actual.day) === expected.day &&
    Number(actual.hour) === expected.hour &&
    Number(actual.minute) === expected.minute &&
    Number(actual.second) === expected.second
  );
}

function getZonedDateTimeParts(
  timestamp: Date,
  timezone: string,
): Readonly<
  Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>
> {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  }

  const entries = formatter
    .formatToParts(timestamp)
    .flatMap((part) =>
      part.type === "literal" ? [] : [[part.type, part.value] as const],
    );
  const parts = Object.fromEntries(entries);
  return {
    year: parts.year ?? "0000",
    month: parts.month ?? "00",
    day: parts.day ?? "00",
    hour: parts.hour ?? "00",
    minute: parts.minute ?? "00",
    second: parts.second ?? "00",
  };
}

function labelFromValue(value: string): string {
  return value
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
