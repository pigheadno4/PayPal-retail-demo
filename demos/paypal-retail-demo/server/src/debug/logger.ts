import { randomUUID } from "node:crypto";

export type DebugLogLevel = "info" | "warn" | "error";

export type DebugLogJson =
  | null
  | boolean
  | number
  | string
  | readonly DebugLogJson[]
  | { readonly [key: string]: DebugLogJson };

export interface DebugLogEntry {
  readonly timestamp: string;
  readonly level: DebugLogLevel;
  readonly message: string;
  readonly context: DebugLogJson;
}

export interface RuntimeDebugLogEntry extends DebugLogEntry {
  readonly id: string;
}

export interface DebugLogger {
  readonly info: (message: string, context?: unknown) => void;
  readonly warn: (message: string, context?: unknown) => void;
  readonly error: (message: string, context?: unknown) => void;
}

export interface CreateDebugLoggerInput {
  readonly clock?: () => Date;
  readonly sink?: (entry: DebugLogEntry) => void;
}

export interface RuntimeDebugLogRepository {
  readonly listRuntimeDebugLogs: () => Promise<readonly RuntimeDebugLogEntry[]>;
}

export interface RuntimeDebugLogPersistenceRepository {
  readonly insertRuntimeDebugLog: (entry: DebugLogEntry) => Promise<void>;
  readonly deleteRuntimeDebugLogsBefore: (cutoff: string) => Promise<void>;
}

export interface RuntimeDebugLogStore extends RuntimeDebugLogRepository {
  readonly logger: DebugLogger;
  readonly sink: (entry: DebugLogEntry) => void;
}

export interface CreateInMemoryRuntimeDebugLogStoreInput {
  readonly clock?: () => Date;
  readonly limit?: number;
  readonly downstreamSink?: (entry: DebugLogEntry) => void;
  readonly persistenceRepository?: RuntimeDebugLogPersistenceRepository;
}

const redactedValue = "[redacted]";

const sensitiveDebugKeys = new Set([
  "access_token",
  "admin_session",
  "admin_session_token",
  "api_key",
  "auth_token",
  "authorization",
  "bearer",
  "card_cvc",
  "card_cvv",
  "card_number",
  "card_security_code",
  "cart_client_secret",
  "client_secret",
  "client_token",
  "cvv",
  "cvc",
  "id_token",
  "oauth_token",
  "password",
  "paypal_client_token",
  "paypal_auth_assertion",
  "paypal_client_secret",
  "pan",
  "refresh_token",
  "security_code",
  "session_token",
  "service_role_key",
  "supabase_service_role_key",
]);

const runtimeLogRetentionMilliseconds = 7 * 24 * 60 * 60 * 1_000;
const runtimeLogCleanupIntervalMilliseconds = 24 * 60 * 60 * 1_000;

interface RuntimeDebugLogPolicy {
  readonly source:
    | "account"
    | "inventory"
    | "lifecycle"
    | "payment_amount_guard"
    | "pickup_capacity"
    | "webhook";
  readonly event: string;
  readonly allowedContextKeys: readonly string[];
}

const runtimeCorrelationContextKeys = [
  "debug_id",
  "order_id",
  "order_number",
  "payment_session_id",
  "paypal_order_id",
  "paypal_capture_id",
  "webhook_event_id",
  "event_id",
  "event_type",
  "profile_id",
  "market_id",
  "market",
  "method",
  "path",
  "route",
  "request_path",
  "status",
  "status_code",
  "duration_ms",
] as const;

const runtimeEventPolicies: Readonly<
  Record<string, Omit<RuntimeDebugLogPolicy, "event">>
> = {
  account_orders_load_failed: {
    source: "account",
    allowedContextKeys: [
      ...runtimeCorrelationContextKeys,
      "error_name",
      "order_count",
    ],
  },
  paypal_capture_amount_mismatch: {
    source: "payment_amount_guard",
    allowedContextKeys: [
      ...runtimeCorrelationContextKeys,
      "action",
      "amount_guard_status",
      "amount_total_minor",
      "amount_currency_code",
      "mismatch_count",
    ],
  },
  paypal_capture_prepared: {
    source: "payment_amount_guard",
    allowedContextKeys: [
      ...runtimeCorrelationContextKeys,
      "action",
      "amount_guard_status",
      "amount_total_minor",
      "amount_currency_code",
      "mismatch_count",
    ],
  },
  paypal_create_order_amount_mismatch: {
    source: "payment_amount_guard",
    allowedContextKeys: [
      ...runtimeCorrelationContextKeys,
      "action",
      "amount_guard_status",
      "amount_total_minor",
      "amount_currency_code",
      "kind",
      "mismatch_count",
    ],
  },
  paypal_create_order_amount_guard_outcome: {
    source: "payment_amount_guard",
    allowedContextKeys: [
      ...runtimeCorrelationContextKeys,
      "action",
      "amount_guard_status",
      "amount_total_minor",
      "amount_currency_code",
      "kind",
      "mismatch_count",
    ],
  },
  paypal_webhook_failed: {
    source: "webhook",
    allowedContextKeys: [
      ...runtimeCorrelationContextKeys,
      "error_name",
      "processing_status",
      "verification_status",
    ],
  },
  paypal_webhook_processing_outcome: {
    source: "webhook",
    allowedContextKeys: [
      ...runtimeCorrelationContextKeys,
      "linked_order_id",
      "linked_payment_session_id",
      "processing_status",
      "verification_status",
    ],
  },
  paypal_webhook_received: {
    source: "webhook",
    allowedContextKeys: runtimeCorrelationContextKeys,
  },
  paypal_webhook_verification_outcome: {
    source: "webhook",
    allowedContextKeys: [
      ...runtimeCorrelationContextKeys,
      "verification_status",
    ],
  },
};

export function createDebugLogger(
  input: CreateDebugLoggerInput = {},
): DebugLogger {
  const clock = input.clock ?? (() => new Date());
  const sink = input.sink ?? defaultDebugLogSink;

  return {
    info(message, context) {
      sink(buildDebugLogEntry("info", message, context, clock));
    },
    warn(message, context) {
      sink(buildDebugLogEntry("warn", message, context, clock));
    },
    error(message, context) {
      sink(buildDebugLogEntry("error", message, context, clock));
    },
  };
}

export function createInMemoryRuntimeDebugLogStore(
  input: CreateInMemoryRuntimeDebugLogStoreInput = {},
): RuntimeDebugLogStore {
  const entries: RuntimeDebugLogEntry[] = [];
  const clock = input.clock ?? (() => new Date());
  const limit = Math.max(1, Math.floor(input.limit ?? 100));
  const downstreamSink = input.downstreamSink ?? defaultDebugLogSink;
  let lastCleanupStartedAt: number | null = null;
  const sink = (entry: DebugLogEntry) => {
    const sanitizedEntry = sanitizeDebugLogEntry(entry);
    downstreamSink(sanitizedEntry);
    const allowlistedEntry = allowlistRuntimeDebugLogEntry(sanitizedEntry);
    if (!allowlistedEntry) {
      return;
    }

    const storedEntry: RuntimeDebugLogEntry = {
      ...allowlistedEntry,
      id: randomUUID(),
    };
    entries.unshift(storedEntry);
    if (entries.length > limit) {
      entries.length = limit;
    }

    if (input.persistenceRepository) {
      scheduleBestEffort(() =>
        input.persistenceRepository!.insertRuntimeDebugLog(allowlistedEntry),
      );

      const cleanupStartedAt = clock().getTime();
      if (
        lastCleanupStartedAt === null ||
        cleanupStartedAt - lastCleanupStartedAt >=
          runtimeLogCleanupIntervalMilliseconds
      ) {
        lastCleanupStartedAt = cleanupStartedAt;
        const cutoff = new Date(
          cleanupStartedAt - runtimeLogRetentionMilliseconds,
        ).toISOString();
        scheduleBestEffort(() =>
          input.persistenceRepository!.deleteRuntimeDebugLogsBefore(cutoff),
        );
      }
    }
  };

  return {
    logger: createDebugLogger({
      clock,
      sink,
    }),
    sink,
    async listRuntimeDebugLogs() {
      return [...entries];
    },
  };
}

export function allowlistRuntimeDebugLogEntry(
  entry: DebugLogEntry,
): DebugLogEntry | null {
  const sanitizedEntry = sanitizeDebugLogEntry(entry);
  const context = asDebugLogObject(sanitizedEntry.context);
  const policy = resolveRuntimeDebugLogPolicy(sanitizedEntry.message, context);
  if (!policy) {
    return null;
  }

  const allowlistedContext: Record<string, DebugLogJson> = {
    source: policy.source,
    event: policy.event,
  };
  for (const key of policy.allowedContextKeys) {
    const value = context[key];
    if (value === undefined) {
      continue;
    }
    allowlistedContext[key] = sanitizeAllowlistedRuntimeValue(key, value);
  }

  return {
    timestamp: sanitizedEntry.timestamp,
    level: sanitizedEntry.level,
    message: sanitizedEntry.message,
    context: allowlistedContext,
  };
}

export function sanitizeDebugLogContext(context: unknown): DebugLogJson {
  if (context === undefined) {
    return {};
  }

  if (context === null) {
    return null;
  }

  if (
    typeof context === "string" ||
    typeof context === "boolean" ||
    typeof context === "number"
  ) {
    return typeof context === "number" && !Number.isFinite(context)
      ? null
      : context;
  }

  if (context instanceof Date) {
    return context.toISOString();
  }

  if (Array.isArray(context)) {
    return context.map((item) => sanitizeDebugLogContext(item));
  }

  if (typeof context === "object") {
    const sanitized: Record<string, DebugLogJson> = {};
    for (const [key, value] of Object.entries(
      context as Record<string, unknown>,
    )) {
      if (value === undefined) {
        continue;
      }
      sanitized[key] = isSensitiveDebugKey(key)
        ? redactedValue
        : sanitizeDebugLogContext(value);
    }
    return sanitized;
  }

  return String(context);
}

function buildDebugLogEntry(
  level: DebugLogLevel,
  message: string,
  context: unknown,
  clock: () => Date,
): DebugLogEntry {
  return {
    timestamp: clock().toISOString(),
    level,
    message,
    context: sanitizeDebugLogContext(context),
  };
}

function sanitizeDebugLogEntry(entry: DebugLogEntry): DebugLogEntry {
  return {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    context: sanitizeDebugLogContext(entry.context),
  };
}

function resolveRuntimeDebugLogPolicy(
  message: string,
  context: Readonly<Record<string, DebugLogJson>>,
): RuntimeDebugLogPolicy | null {
  const eventPolicy = runtimeEventPolicies[message];
  if (eventPolicy) {
    return { ...eventPolicy, event: message };
  }

  if (message !== "api_request_completed" && message !== "api_request_failed") {
    return null;
  }

  const path =
    readDebugLogString(context.path) ??
    readDebugLogString(context.request_path) ??
    readDebugLogString(context.route);
  if (!path) {
    return null;
  }

  const requestOutcome =
    message === "api_request_completed"
      ? "request_completed"
      : "request_failed";
  const errorKeys = message === "api_request_failed" ? ["error_name"] : [];
  if (/^\/api\/admin\/orders\/[^/?]+\/lifecycle(?:[/?]|$)/.test(path)) {
    return {
      source: "lifecycle",
      event: `lifecycle_${requestOutcome}`,
      allowedContextKeys: [...runtimeCorrelationContextKeys, ...errorKeys],
    };
  }
  if (/^\/api\/admin\/inventory\/[^/?]+(?:[/?]|$)/.test(path)) {
    return {
      source: "inventory",
      event: `inventory_${requestOutcome}`,
      allowedContextKeys: [...runtimeCorrelationContextKeys, ...errorKeys],
    };
  }
  if (/^\/api\/admin\/pickup-dates\/[^/?]+(?:[/?]|$)/.test(path)) {
    return {
      source: "pickup_capacity",
      event: `pickup_capacity_${requestOutcome}`,
      allowedContextKeys: [...runtimeCorrelationContextKeys, ...errorKeys],
    };
  }
  if (/^\/api\/paypal\/webhooks(?:[/?]|$)/.test(path)) {
    return {
      source: "webhook",
      event: `webhook_${requestOutcome}`,
      allowedContextKeys: [...runtimeCorrelationContextKeys, ...errorKeys],
    };
  }
  if (
    message === "api_request_failed" &&
    /^\/api\/account\/orders(?:[/?]|$)/.test(path)
  ) {
    return {
      source: "account",
      event: "account_orders_load_failed",
      allowedContextKeys: [...runtimeCorrelationContextKeys, ...errorKeys],
    };
  }

  return null;
}

function asDebugLogObject(
  value: DebugLogJson,
): Readonly<Record<string, DebugLogJson>> {
  return isDebugLogObject(value) ? value : {};
}

function isDebugLogObject(
  value: DebugLogJson,
): value is { readonly [key: string]: DebugLogJson } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDebugLogString(value: DebugLogJson | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sanitizeAllowlistedRuntimeValue(
  key: string,
  value: DebugLogJson,
): DebugLogJson {
  if (
    (key === "path" || key === "request_path" || key === "route") &&
    typeof value === "string"
  ) {
    return value.split("?", 1)[0] ?? value;
  }
  return value;
}

function scheduleBestEffort(operation: () => Promise<void>): void {
  void Promise.resolve()
    .then(operation)
    .catch(() => undefined);
}

function isSensitiveDebugKey(key: string): boolean {
  return sensitiveDebugKeys.has(normalizeDebugKey(key));
}

function normalizeDebugKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function defaultDebugLogSink(entry: DebugLogEntry): void {
  console.log(JSON.stringify(entry));
}
