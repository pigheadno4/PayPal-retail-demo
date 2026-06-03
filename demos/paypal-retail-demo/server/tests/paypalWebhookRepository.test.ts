import { describe, expect, it } from "vitest";

import {
  createSupabasePayPalWebhookRepository,
  type PayPalWebhookDataSource,
  type PayPalWebhookEventRow,
  type PayPalWebhookSavedPaymentMethodRow,
} from "../src/repositories/paypalWebhookRepository.js";

describe("Supabase-backed PayPal webhook repository", () => {
  it("stores invalid webhooks as ignored without mutating saved payments", async () => {
    const dataSource = createWebhookDataSource();
    const repository = createRepository(dataSource);

    const result = await repository.processWebhook({
      verificationStatus: "invalid",
      headers: paypalWebhookHeaders(),
      event: vaultCreatedEvent(),
    });

    expect(result).toEqual({
      eventId: "WH-VAULT-CREATED",
      eventType: "VAULT.PAYMENT-TOKEN.CREATED",
      verificationStatus: "invalid",
      processingStatus: "ignored",
      linkedOrderId: null,
      linkedPaymentSessionId: null,
      savedPaymentMethodId: null,
    });
    expect(dataSource.webhookEvents).toContainEqual(
      expect.objectContaining({
        event_id: "WH-VAULT-CREATED",
        event_type: "VAULT.PAYMENT-TOKEN.CREATED",
        verification_status: "invalid",
        processing_status: "ignored",
      }),
    );
    expect(dataSource.savedPaymentMethods[0]?.status).toBe("pending");
  });

  it("activates a pending saved payment when a vault token is created", async () => {
    const dataSource = createWebhookDataSource();
    const repository = createRepository(dataSource);

    const result = await repository.processWebhook({
      verificationStatus: "valid",
      headers: paypalWebhookHeaders(),
      event: vaultCreatedEvent(),
    });

    expect(result).toEqual({
      eventId: "WH-VAULT-CREATED",
      eventType: "VAULT.PAYMENT-TOKEN.CREATED",
      verificationStatus: "valid",
      processingStatus: "processed",
      linkedOrderId: null,
      linkedPaymentSessionId: null,
      savedPaymentMethodId: "saved_payment_pending",
    });
    expect(dataSource.savedPaymentMethods).toContainEqual(
      expect.objectContaining({
        id: "saved_payment_pending",
        status: "active",
        vault_id: "vault_card_123",
        paypal_customer_id: "paypal_customer_456",
        brand: "VISA",
        last4: "1111",
        expiry_month: 2,
        expiry_year: 2027,
      }),
    );
  });

  it("marks saved payments deleted when PayPal sends a vault token deleted event", async () => {
    const dataSource = createWebhookDataSource({
      savedPaymentMethods: [
        {
          id: "saved_payment_active",
          auth_user_id: "user_123",
          provider: "paypal",
          method_type: "card",
          status: "active",
          vault_id: "vault_card_123",
          paypal_customer_id: "paypal_customer_456",
          brand: "VISA",
          last4: "1111",
          expiry_month: 2,
          expiry_year: 2027,
          label: "Visa ending in 1111",
          created_at: "2026-06-01T10:00:00.000Z",
          updated_at: "2026-06-01T10:00:00.000Z",
        },
      ],
    });
    const repository = createRepository(dataSource);

    const result = await repository.processWebhook({
      verificationStatus: "valid",
      headers: paypalWebhookHeaders(),
      event: {
        ...vaultCreatedEvent(),
        id: "WH-VAULT-DELETED",
        event_type: "VAULT.PAYMENT-TOKEN.DELETED",
      },
    });

    expect(result.processingStatus).toBe("processed");
    expect(result.savedPaymentMethodId).toBe("saved_payment_active");
    expect(dataSource.savedPaymentMethods).toContainEqual(
      expect.objectContaining({
        id: "saved_payment_active",
        status: "deleted",
        updated_at: "2026-06-01T10:00:00.000Z",
      }),
    );
  });

  it("marks a linked payment session captured when PayPal sends capture completed", async () => {
    const dataSource = createWebhookDataSource();
    const repository = createRepository(dataSource);

    const result = await repository.processWebhook({
      verificationStatus: "valid",
      headers: paypalWebhookHeaders(),
      event: {
        id: "WH-CAPTURE-COMPLETED",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "PAYPAL_CAPTURE_123",
          status: "COMPLETED",
          supplementary_data: {
            related_ids: {
              order_id: "PAYPAL_ORDER_123",
            },
          },
        },
      },
    });

    expect(result).toEqual({
      eventId: "WH-CAPTURE-COMPLETED",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      verificationStatus: "valid",
      processingStatus: "processed",
      linkedOrderId: "order_existing",
      linkedPaymentSessionId: "payment_session_existing",
      savedPaymentMethodId: null,
    });
    expect(dataSource.paymentSessions).toContainEqual(
      expect.objectContaining({
        id: "payment_session_existing",
        status: "captured",
        paypal_capture_id: "PAYPAL_CAPTURE_123",
      }),
    );
    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        id: "order_existing",
        status: "paid",
        payment_status: "captured",
      }),
    );
  });
});

function createRepository(dataSource: FakePayPalWebhookDataSource) {
  let webhookEventId = 0;
  return createSupabasePayPalWebhookRepository({
    dataSource,
    now: "2026-06-01T10:00:00.000Z",
    createWebhookEventId: () => `webhook_event_new_${++webhookEventId}`,
  });
}

interface FakePayPalWebhookDataSource extends PayPalWebhookDataSource {
  readonly webhookEvents: PayPalWebhookEventRow[];
  readonly savedPaymentMethods: PayPalWebhookSavedPaymentMethodRow[];
  readonly paymentSessions: {
    readonly id: string;
    readonly order_id: string;
    readonly paypal_order_id: string | null;
    readonly status: "created" | "approved" | "captured";
    readonly paypal_capture_id: string | null;
  }[];
  readonly orders: {
    readonly id: string;
    readonly status: "pending" | "paid";
    readonly payment_status: "started" | "captured";
  }[];
}

function createWebhookDataSource(
  options: {
    readonly savedPaymentMethods?: PayPalWebhookSavedPaymentMethodRow[];
  } = {},
): FakePayPalWebhookDataSource {
  const webhookEvents: PayPalWebhookEventRow[] = [];
  const savedPaymentMethods: PayPalWebhookSavedPaymentMethodRow[] =
    options.savedPaymentMethods ?? [
      {
        id: "saved_payment_pending",
        auth_user_id: "user_123",
        provider: "paypal",
        method_type: "card",
        status: "pending",
        vault_id: null,
        paypal_customer_id: "paypal_customer_456",
        brand: "MASTERCARD",
        last4: "4444",
        expiry_month: 9,
        expiry_year: 2028,
        label: "Mastercard ending in 4444",
        created_at: "2026-06-01T09:00:00.000Z",
        updated_at: "2026-06-01T09:00:00.000Z",
      },
    ];
  const paymentSessions: FakePayPalWebhookDataSource["paymentSessions"] = [
    {
      id: "payment_session_existing",
      order_id: "order_existing",
      paypal_order_id: "PAYPAL_ORDER_123",
      status: "created",
      paypal_capture_id: null,
    },
  ];
  const orders: FakePayPalWebhookDataSource["orders"] = [
    {
      id: "order_existing",
      status: "pending",
      payment_status: "started",
    },
  ];

  return {
    webhookEvents,
    savedPaymentMethods,
    paymentSessions,
    orders,
    async createWebhookEvent(event) {
      webhookEvents.push(event);
      return event;
    },
    async findPendingSavedPaymentMethod(input) {
      return (
        savedPaymentMethods.find(
          (savedPaymentMethod) =>
            savedPaymentMethod.status === "pending" &&
            savedPaymentMethod.method_type === input.methodType &&
            savedPaymentMethod.paypal_customer_id === input.paypalCustomerId,
        ) ?? null
      );
    },
    async findSavedPaymentMethodByVaultId(vaultId) {
      return (
        savedPaymentMethods.find(
          (savedPaymentMethod) => savedPaymentMethod.vault_id === vaultId,
        ) ?? null
      );
    },
    async updateSavedPaymentMethod(id, patch) {
      const index = savedPaymentMethods.findIndex(
        (savedPaymentMethod) => savedPaymentMethod.id === id,
      );
      if (index < 0) {
        throw new Error(`Saved payment method ${id} was not found`);
      }
      savedPaymentMethods[index] = {
        ...savedPaymentMethods[index]!,
        ...patch,
      };
      return savedPaymentMethods[index]!;
    },
    async getPaymentSessionByPayPalOrderId(paypalOrderId) {
      return (
        paymentSessions.find(
          (paymentSession) =>
            paymentSession.paypal_order_id === paypalOrderId,
        ) ?? null
      );
    },
    async updatePaymentSession(id, patch) {
      const index = paymentSessions.findIndex(
        (paymentSession) => paymentSession.id === id,
      );
      if (index < 0) {
        throw new Error(`Payment session ${id} was not found`);
      }
      paymentSessions[index] = {
        ...paymentSessions[index]!,
        ...patch,
      };
      return paymentSessions[index]!;
    },
    async getOrderById(id) {
      return orders.find((order) => order.id === id) ?? null;
    },
    async updateOrder(id, patch) {
      const index = orders.findIndex((order) => order.id === id);
      if (index < 0) {
        throw new Error(`Order ${id} was not found`);
      }
      orders[index] = {
        ...orders[index]!,
        ...patch,
      };
      return orders[index]!;
    },
  };
}

function paypalWebhookHeaders() {
  return {
    auth_algorithm: "SHA256withRSA",
    cert_url: "https://api-m.sandbox.paypal.com/certs/cert.pem",
    transmission_id: "transmission-123",
    transmission_signature: "signature-123",
    transmission_time: "2026-06-01T10:00:00Z",
  };
}

function vaultCreatedEvent() {
  return {
    id: "WH-VAULT-CREATED",
    event_type: "VAULT.PAYMENT-TOKEN.CREATED",
    resource_type: "payment_token",
    resource: {
      id: "vault_card_123",
      customer: {
        id: "paypal_customer_456",
      },
      payment_source: {
        card: {
          brand: "VISA",
          last_digits: "1111",
          expiry: "2027-02",
        },
      },
    },
  };
}
