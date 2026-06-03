import { randomUUID } from "node:crypto";

import type { PayPalSnapshotJson } from "../../../shared/src/paypal.js";
import type {
  PayPalWebhookProcessingInput,
  PayPalWebhookProcessingRepository,
  PayPalWebhookProcessingResult,
  PayPalWebhookProcessingStatus,
  PayPalWebhookVerificationStatus,
} from "../routes/paypal.js";

type RepositoryNow = Date | string | (() => Date | string);

export interface PayPalWebhookEventRow {
  readonly id: string;
  readonly provider: "paypal";
  readonly event_id: string;
  readonly event_type: string;
  readonly verification_status: PayPalWebhookVerificationStatus;
  readonly headers_json: PayPalSnapshotJson;
  readonly payload_json: PayPalSnapshotJson;
  readonly linked_order_id: string | null;
  readonly linked_payment_session_id: string | null;
  readonly processing_status: PayPalWebhookProcessingStatus;
  readonly received_at: string;
  readonly processed_at: string | null;
}

export interface PayPalWebhookSavedPaymentMethodRow {
  readonly id: string;
  readonly auth_user_id: string;
  readonly provider: "paypal";
  readonly method_type: "paypal_wallet" | "card";
  readonly status: "active" | "pending" | "disabled" | "deleted";
  readonly vault_id: string | null;
  readonly paypal_customer_id: string | null;
  readonly brand: string | null;
  readonly last4: string | null;
  readonly expiry_month: number | null;
  readonly expiry_year: number | null;
  readonly label: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PayPalWebhookPaymentSessionRow {
  readonly id: string;
  readonly order_id: string;
  readonly paypal_order_id: string | null;
  readonly status: "created" | "approved" | "captured" | "failed";
  readonly paypal_capture_id: string | null;
}

export interface PayPalWebhookOrderRow {
  readonly id: string;
  readonly status: "pending" | "paid";
  readonly payment_status: "started" | "captured" | "failed";
}

export interface PayPalWebhookDataSource {
  readonly createWebhookEvent: (
    event: PayPalWebhookEventRow,
  ) => Promise<PayPalWebhookEventRow>;
  readonly findPendingSavedPaymentMethod: (input: {
    readonly paypalCustomerId: string;
    readonly methodType: PayPalWebhookSavedPaymentMethodRow["method_type"];
  }) => Promise<PayPalWebhookSavedPaymentMethodRow | null>;
  readonly findSavedPaymentMethodByVaultId: (
    vaultId: string,
  ) => Promise<PayPalWebhookSavedPaymentMethodRow | null>;
  readonly updateSavedPaymentMethod: (
    id: string,
    patch: Partial<PayPalWebhookSavedPaymentMethodRow>,
  ) => Promise<PayPalWebhookSavedPaymentMethodRow>;
  readonly getPaymentSessionByPayPalOrderId: (
    paypalOrderId: string,
  ) => Promise<PayPalWebhookPaymentSessionRow | null>;
  readonly updatePaymentSession: (
    id: string,
    patch: Partial<PayPalWebhookPaymentSessionRow>,
  ) => Promise<PayPalWebhookPaymentSessionRow>;
  readonly getOrderById: (id: string) => Promise<PayPalWebhookOrderRow | null>;
  readonly updateOrder: (
    id: string,
    patch: Partial<PayPalWebhookOrderRow>,
  ) => Promise<PayPalWebhookOrderRow>;
}

export interface CreateSupabasePayPalWebhookRepositoryInput {
  readonly dataSource: PayPalWebhookDataSource;
  readonly now?: RepositoryNow;
  readonly createWebhookEventId?: () => string;
}

interface PayPalWebhookRepositoryDependencies {
  readonly dataSource: PayPalWebhookDataSource;
  readonly now?: RepositoryNow;
  readonly createWebhookEventId: () => string;
}

interface VaultEventDetails {
  readonly vaultId: string | null;
  readonly paypalCustomerId: string | null;
  readonly methodType: PayPalWebhookSavedPaymentMethodRow["method_type"] | null;
  readonly brand: string | null;
  readonly last4: string | null;
  readonly expiryMonth: number | null;
  readonly expiryYear: number | null;
  readonly label: string | null;
}

export function createSupabasePayPalWebhookRepository(
  input: CreateSupabasePayPalWebhookRepositoryInput,
): PayPalWebhookProcessingRepository {
  const dependencies: PayPalWebhookRepositoryDependencies = {
    ...input,
    createWebhookEventId: input.createWebhookEventId ?? randomUUID,
  };

  return {
    async processWebhook(webhookInput) {
      return processPayPalWebhook(dependencies, webhookInput);
    },
  };
}

async function processPayPalWebhook(
  dependencies: PayPalWebhookRepositoryDependencies,
  input: PayPalWebhookProcessingInput,
): Promise<PayPalWebhookProcessingResult> {
  const now = resolveNow(dependencies.now);
  const eventId = requireEventString(input.event, "id");
  const eventType = requireEventString(input.event, "event_type");

  const mutationResult =
    input.verificationStatus === "valid"
      ? await processVerifiedWebhook(dependencies, eventType, input.event, now)
      : {
          processingStatus: "ignored" as const,
          savedPaymentMethodId: null,
          linkedOrderId: null,
          linkedPaymentSessionId: null,
        };

  await dependencies.dataSource.createWebhookEvent({
    id: dependencies.createWebhookEventId(),
    provider: "paypal",
    event_id: eventId,
    event_type: eventType,
    verification_status: input.verificationStatus,
    headers_json: input.headers as unknown as PayPalSnapshotJson,
    payload_json: input.event,
    linked_order_id: mutationResult.linkedOrderId,
    linked_payment_session_id: mutationResult.linkedPaymentSessionId,
    processing_status: mutationResult.processingStatus,
    received_at: now,
    processed_at:
      mutationResult.processingStatus === "processed" ||
      mutationResult.processingStatus === "ignored"
        ? now
        : null,
  });

  return {
    eventId,
    eventType,
    verificationStatus: input.verificationStatus,
    processingStatus: mutationResult.processingStatus,
    linkedOrderId: mutationResult.linkedOrderId,
    linkedPaymentSessionId: mutationResult.linkedPaymentSessionId,
    savedPaymentMethodId: mutationResult.savedPaymentMethodId,
  };
}

async function processVerifiedWebhook(
  dependencies: PayPalWebhookRepositoryDependencies,
  eventType: string,
  event: PayPalSnapshotJson,
  now: string,
): Promise<{
  readonly processingStatus: PayPalWebhookProcessingStatus;
  readonly savedPaymentMethodId: string | null;
  readonly linkedOrderId: string | null;
  readonly linkedPaymentSessionId: string | null;
}> {
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    return processCaptureCompleted(dependencies, event);
  }

  if (eventType === "VAULT.PAYMENT-TOKEN.CREATED") {
    return processVaultTokenCreated(dependencies, event, now);
  }

  if (
    eventType === "VAULT.PAYMENT-TOKEN.DELETED" ||
    eventType === "VAULT.PAYMENT-TOKEN.DELETION-INITIATED"
  ) {
    return processVaultTokenDeleted(dependencies, event, eventType, now);
  }

  return {
    processingStatus: "ignored",
    savedPaymentMethodId: null,
    linkedOrderId: null,
    linkedPaymentSessionId: null,
  };
}

async function processCaptureCompleted(
  dependencies: PayPalWebhookRepositoryDependencies,
  event: PayPalSnapshotJson,
): Promise<{
  readonly processingStatus: PayPalWebhookProcessingStatus;
  readonly savedPaymentMethodId: string | null;
  readonly linkedOrderId: string | null;
  readonly linkedPaymentSessionId: string | null;
}> {
  const resource = getObjectProperty(event, "resource");
  const paypalCaptureId = normalizeOptionalString(
    getObjectProperty(resource, "id"),
  );
  const paypalOrderId = normalizeOptionalString(
    getObjectProperty(
      getObjectProperty(
        getObjectProperty(resource, "supplementary_data"),
        "related_ids",
      ),
      "order_id",
    ),
  );
  if (!paypalOrderId || !paypalCaptureId) {
    return {
      processingStatus: "ignored",
      savedPaymentMethodId: null,
      linkedOrderId: null,
      linkedPaymentSessionId: null,
    };
  }

  const paymentSession =
    await dependencies.dataSource.getPaymentSessionByPayPalOrderId(
      paypalOrderId,
    );
  if (!paymentSession) {
    return {
      processingStatus: "ignored",
      savedPaymentMethodId: null,
      linkedOrderId: null,
      linkedPaymentSessionId: null,
    };
  }

  const order = await dependencies.dataSource.getOrderById(
    paymentSession.order_id,
  );
  if (!order) {
    return {
      processingStatus: "ignored",
      savedPaymentMethodId: null,
      linkedOrderId: null,
      linkedPaymentSessionId: paymentSession.id,
    };
  }

  await dependencies.dataSource.updatePaymentSession(paymentSession.id, {
    status: "captured",
    paypal_capture_id: paypalCaptureId,
  });
  await dependencies.dataSource.updateOrder(order.id, {
    status: "paid",
    payment_status: "captured",
  });

  return {
    processingStatus: "processed",
    savedPaymentMethodId: null,
    linkedOrderId: order.id,
    linkedPaymentSessionId: paymentSession.id,
  };
}

async function processVaultTokenCreated(
  dependencies: PayPalWebhookRepositoryDependencies,
  event: PayPalSnapshotJson,
  now: string,
): Promise<{
  readonly processingStatus: PayPalWebhookProcessingStatus;
  readonly savedPaymentMethodId: string | null;
  readonly linkedOrderId: string | null;
  readonly linkedPaymentSessionId: string | null;
}> {
  const details = extractVaultEventDetails(event);
  if (!details.paypalCustomerId || !details.methodType || !details.vaultId) {
    return {
      processingStatus: "ignored",
      savedPaymentMethodId: null,
      linkedOrderId: null,
      linkedPaymentSessionId: null,
    };
  }

  const pendingSavedPayment =
    await dependencies.dataSource.findPendingSavedPaymentMethod({
      paypalCustomerId: details.paypalCustomerId,
      methodType: details.methodType,
    });
  if (!pendingSavedPayment) {
    return {
      processingStatus: "ignored",
      savedPaymentMethodId: null,
      linkedOrderId: null,
      linkedPaymentSessionId: null,
    };
  }

  await dependencies.dataSource.updateSavedPaymentMethod(
    pendingSavedPayment.id,
    {
      status: "active",
      vault_id: details.vaultId,
      paypal_customer_id: details.paypalCustomerId,
      brand: details.brand,
      last4: details.last4,
      expiry_month: details.expiryMonth,
      expiry_year: details.expiryYear,
      label: details.label,
      updated_at: now,
    },
  );

  return {
    processingStatus: "processed",
    savedPaymentMethodId: pendingSavedPayment.id,
    linkedOrderId: null,
    linkedPaymentSessionId: null,
  };
}

async function processVaultTokenDeleted(
  dependencies: PayPalWebhookRepositoryDependencies,
  event: PayPalSnapshotJson,
  eventType: string,
  now: string,
): Promise<{
  readonly processingStatus: PayPalWebhookProcessingStatus;
  readonly savedPaymentMethodId: string | null;
  readonly linkedOrderId: string | null;
  readonly linkedPaymentSessionId: string | null;
}> {
  const details = extractVaultEventDetails(event);
  if (!details.vaultId) {
    return {
      processingStatus: "ignored",
      savedPaymentMethodId: null,
      linkedOrderId: null,
      linkedPaymentSessionId: null,
    };
  }

  const savedPayment =
    await dependencies.dataSource.findSavedPaymentMethodByVaultId(
      details.vaultId,
    );
  if (!savedPayment) {
    return {
      processingStatus: "ignored",
      savedPaymentMethodId: null,
      linkedOrderId: null,
      linkedPaymentSessionId: null,
    };
  }

  await dependencies.dataSource.updateSavedPaymentMethod(savedPayment.id, {
    status:
      eventType === "VAULT.PAYMENT-TOKEN.DELETION-INITIATED"
        ? "disabled"
        : "deleted",
    updated_at: now,
  });

  return {
    processingStatus: "processed",
    savedPaymentMethodId: savedPayment.id,
    linkedOrderId: null,
    linkedPaymentSessionId: null,
  };
}

function extractVaultEventDetails(
  event: PayPalSnapshotJson,
): VaultEventDetails {
  const resource = getObjectProperty(event, "resource");
  const paymentSource = getObjectProperty(resource, "payment_source");
  const card = getObjectProperty(paymentSource, "card");
  const paypal = getObjectProperty(paymentSource, "paypal");
  const methodType = card ? "card" : paypal ? "paypal_wallet" : null;
  const cardObject = methodType === "card" ? card : null;
  const brand = normalizeOptionalString(getObjectProperty(cardObject, "brand"));
  const last4 = normalizeOptionalString(
    getObjectProperty(cardObject, "last_digits"),
  );
  const expiry = parseCardExpiry(
    normalizeOptionalString(getObjectProperty(cardObject, "expiry")),
  );

  return {
    vaultId: normalizeOptionalString(getObjectProperty(resource, "id")),
    paypalCustomerId: normalizeOptionalString(
      getObjectProperty(getObjectProperty(resource, "customer"), "id"),
    ),
    methodType,
    brand,
    last4,
    expiryMonth: expiry.month,
    expiryYear: expiry.year,
    label: buildSavedPaymentLabel(methodType, brand, last4),
  };
}

function buildSavedPaymentLabel(
  methodType: VaultEventDetails["methodType"],
  brand: string | null,
  last4: string | null,
): string | null {
  if (methodType === "paypal_wallet") {
    return "PayPal wallet";
  }
  if (brand && last4) {
    return `${titleCase(brand)} ending in ${last4}`;
  }
  return null;
}

function parseCardExpiry(value: string | null): {
  readonly month: number | null;
  readonly year: number | null;
} {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return {
      month: null,
      year: null,
    };
  }

  return {
    month: Number.parseInt(match[2]!, 10),
    year: Number.parseInt(match[1]!, 10),
  };
}

function requireEventString(event: PayPalSnapshotJson, key: string): string {
  const value = getObjectProperty(event, key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`PayPal webhook event ${key} is required`);
  }
  return value.trim();
}

function getObjectProperty(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return (value as Record<string, unknown>)[key];
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

function resolveNow(now: RepositoryNow | undefined): string {
  const value = typeof now === "function" ? now() : now;
  const date =
    typeof value === "string" || value instanceof Date ? value : new Date();
  return date instanceof Date ? date.toISOString() : date;
}

type SupabasePrimitive = string | number | boolean | null;

interface SupabasePayPalWebhookError {
  readonly message: string;
}

interface SupabasePayPalWebhookResult<TData> {
  readonly data: TData | null;
  readonly error: SupabasePayPalWebhookError | null;
}

interface SupabasePayPalWebhookQuery extends PromiseLike<
  SupabasePayPalWebhookResult<unknown>
> {
  readonly select: (columns: string) => SupabasePayPalWebhookQuery;
  readonly eq: (
    column: string,
    value: SupabasePrimitive,
  ) => SupabasePayPalWebhookQuery;
  readonly insert: (
    values: Record<string, unknown>,
  ) => SupabasePayPalWebhookQuery;
  readonly update: (
    values: Record<string, unknown>,
  ) => SupabasePayPalWebhookQuery;
  readonly maybeSingle: () => PromiseLike<SupabasePayPalWebhookResult<unknown>>;
  readonly single: () => PromiseLike<SupabasePayPalWebhookResult<unknown>>;
}

export interface SupabasePayPalWebhookClient {
  readonly from: (table: string) => SupabasePayPalWebhookQuery;
}

const savedPaymentMethodColumns = [
  "id",
  "auth_user_id",
  "provider",
  "method_type",
  "status",
  "vault_id",
  "paypal_customer_id",
  "brand",
  "last4",
  "expiry_month",
  "expiry_year",
  "label",
  "created_at",
  "updated_at",
].join(", ");

const paymentSessionColumns = [
  "id",
  "order_id",
  "paypal_order_id",
  "status",
  "paypal_capture_id",
].join(", ");

const orderColumns = ["id", "status", "payment_status"].join(", ");

const webhookEventColumns = [
  "id",
  "provider",
  "event_id",
  "event_type",
  "verification_status",
  "headers_json",
  "payload_json",
  "linked_order_id",
  "linked_payment_session_id",
  "processing_status",
  "received_at",
  "processed_at",
].join(", ");

export function createSupabasePayPalWebhookDataSource(
  supabase: SupabasePayPalWebhookClient,
): PayPalWebhookDataSource {
  return {
    async createWebhookEvent(event) {
      return queryRequired<PayPalWebhookEventRow>(
        supabase
          .from("webhook_events")
          .insert(event as unknown as Record<string, unknown>)
          .select(webhookEventColumns)
          .single(),
        `Create PayPal webhook event ${event.event_id}`,
      );
    },
    async findPendingSavedPaymentMethod(input) {
      return queryOne<PayPalWebhookSavedPaymentMethodRow>(
        supabase
          .from("saved_payment_methods")
          .select(savedPaymentMethodColumns)
          .eq("paypal_customer_id", input.paypalCustomerId)
          .eq("method_type", input.methodType)
          .eq("status", "pending")
          .maybeSingle(),
        `Find pending saved payment method ${input.paypalCustomerId}`,
      );
    },
    async findSavedPaymentMethodByVaultId(vaultId) {
      return queryOne<PayPalWebhookSavedPaymentMethodRow>(
        supabase
          .from("saved_payment_methods")
          .select(savedPaymentMethodColumns)
          .eq("vault_id", vaultId)
          .maybeSingle(),
        `Find saved payment method ${vaultId}`,
      );
    },
    async updateSavedPaymentMethod(id, patch) {
      return queryRequired<PayPalWebhookSavedPaymentMethodRow>(
        supabase
          .from("saved_payment_methods")
          .update(patch as Record<string, unknown>)
          .eq("id", id)
          .select(savedPaymentMethodColumns)
          .single(),
        `Update saved payment method ${id}`,
      );
    },
    async getPaymentSessionByPayPalOrderId(paypalOrderId) {
      return queryOne<PayPalWebhookPaymentSessionRow>(
        supabase
          .from("payment_sessions")
          .select(paymentSessionColumns)
          .eq("paypal_order_id", paypalOrderId)
          .maybeSingle(),
        `Find payment session ${paypalOrderId}`,
      );
    },
    async updatePaymentSession(id, patch) {
      return queryRequired<PayPalWebhookPaymentSessionRow>(
        supabase
          .from("payment_sessions")
          .update(patch as Record<string, unknown>)
          .eq("id", id)
          .select(paymentSessionColumns)
          .single(),
        `Update payment session ${id}`,
      );
    },
    async getOrderById(id) {
      return queryOne<PayPalWebhookOrderRow>(
        supabase.from("orders").select(orderColumns).eq("id", id).maybeSingle(),
        `Find order ${id}`,
      );
    },
    async updateOrder(id, patch) {
      return queryRequired<PayPalWebhookOrderRow>(
        supabase
          .from("orders")
          .update(patch as Record<string, unknown>)
          .eq("id", id)
          .select(orderColumns)
          .single(),
        `Update order ${id}`,
      );
    },
  };
}

async function queryOne<TRow>(
  query: PromiseLike<SupabasePayPalWebhookResult<unknown>>,
  description: string,
): Promise<TRow | null> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return result.data === null ? null : (result.data as TRow);
}

async function queryRequired<TRow>(
  query: PromiseLike<SupabasePayPalWebhookResult<unknown>>,
  description: string,
): Promise<TRow> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error(`${description}: no row returned`);
  }
  return result.data as TRow;
}
