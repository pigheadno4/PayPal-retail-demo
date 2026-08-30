import type {
  PayPalCaptureEvidence,
  PayPalGateway,
  PayPalOrderPayload,
  PayPalTransmissionHeaders,
} from "./gateway.js";

const defaultEvidence: PayPalCaptureEvidence = {
  orderId: "ORDER-REDACTED",
  captureId: "CAPTURE-REDACTED",
  captureStatus: "COMPLETED",
  amount: { currency: "USD", cents: 553 },
  payeeMerchantId: "MERCHANT123",
  capturedAt: "2026-07-15T19:05:00.000Z",
  vaultStatus: "VAULTED",
  paypalCustomerId: "CUSTOMER-REDACTED",
  vaultId: "VAULT-REDACTED",
};

export class FakePayPalGateway implements PayPalGateway {
  readonly createdOrderId = "ORDER-REDACTED";
  readonly userTokenInputs: Array<{ merchantCustomerReference: string; targetCustomerId?: string }> = [];
  readonly createInputs: Array<{ payload: PayPalOrderPayload; requestId: string; clientMetadataId: string }> = [];
  readonly captureInputs: Array<{ orderId: string; requestId: string }> = [];
  readonly webhookInputs: Array<{ rawBody: string; transmissionHeaders: PayPalTransmissionHeaders; webhookId: string }> = [];

  constructor(private readonly fixture: Readonly<{
    captureEvidence?: PayPalCaptureEvidence;
    webhookVerified?: boolean;
  }> = {}) {}

  async createUserIdToken(input: { merchantCustomerReference: string; targetCustomerId?: string }) {
    this.userTokenInputs.push(input);
    return "ID-TOKEN-REDACTED";
  }

  async createOrder(input: { payload: PayPalOrderPayload; requestId: string; clientMetadataId: string }) {
    this.createInputs.push(input);
    return { orderId: this.createdOrderId };
  }

  async captureOrder(input: { orderId: string; requestId: string }) {
    this.captureInputs.push(input);
    return this.fixture.captureEvidence ?? defaultEvidence;
  }

  async verifyWebhook(input: { rawBody: string; transmissionHeaders: PayPalTransmissionHeaders; webhookId: string }) {
    this.webhookInputs.push(input);
    return this.fixture.webhookVerified ?? true;
  }
}
