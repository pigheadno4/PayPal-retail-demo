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
  readonly id?: string;
  readonly timestamp: string;
  readonly level: DebugLogLevel;
  readonly message: string;
  readonly context: DebugLogJson;
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
  readonly listRuntimeDebugLogs: () => Promise<readonly DebugLogEntry[]>;
}

export interface RuntimeDebugLogStore extends RuntimeDebugLogRepository {
  readonly logger: DebugLogger;
  readonly sink: (entry: DebugLogEntry) => void;
}

export interface CreateInMemoryRuntimeDebugLogStoreInput {
  readonly clock?: () => Date;
  readonly limit?: number;
  readonly downstreamSink?: (entry: DebugLogEntry) => void;
}

const redactedValue = "[redacted]";

const sensitiveDebugKeys = new Set([
  "access_token",
  "authorization",
  "bearer",
  "card_number",
  "cart_client_secret",
  "client_secret",
  "client_token",
  "cvv",
  "cvc",
  "id_token",
  "password",
  "paypal_auth_assertion",
  "paypal_client_secret",
  "refresh_token",
  "security_code",
  "service_role_key",
  "supabase_service_role_key",
]);

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
  const entries: DebugLogEntry[] = [];
  const limit = Math.max(1, Math.floor(input.limit ?? 100));
  const downstreamSink = input.downstreamSink ?? defaultDebugLogSink;
  const sink = (entry: DebugLogEntry) => {
    const storedEntry = {
      ...entry,
      id: randomUUID(),
    };
    entries.unshift(storedEntry);
    if (entries.length > limit) {
      entries.length = limit;
    }
    downstreamSink(storedEntry);
  };

  return {
    logger: createDebugLogger({
      ...(input.clock ? { clock: input.clock } : {}),
      sink,
    }),
    sink,
    async listRuntimeDebugLogs() {
      return [...entries];
    },
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
