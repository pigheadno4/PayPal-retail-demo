import type { ExpressReviewPageData } from "./ExpressReviewPage.js";

export interface ExpressReviewApiResponse {
  readonly source_label: string;
  readonly order_number: string;
  readonly payment_session_id: string;
  readonly paypal_order_id: string;
  readonly payment_method_label: string;
  readonly status_label: string;
  readonly shipping_address: {
    readonly name: string;
    readonly address_line1: string;
    readonly address_line2: string;
    readonly country_code: string;
  };
  readonly shipping_option: {
    readonly label: string;
    readonly detail: string;
    readonly amount_minor: number;
    readonly currency_code: string;
  };
  readonly items: readonly {
    readonly id: string;
    readonly name: string;
    readonly detail: string;
    readonly amount_minor: number;
    readonly currency_code: string;
  }[];
  readonly totals: {
    readonly merchandise_subtotal_minor: number;
    readonly shipping_minor: number;
    readonly promo_discount_minor: number;
    readonly tax_minor: number;
    readonly total_minor: number;
    readonly currency_code: string;
  };
  readonly amount_guard: {
    readonly action: "allow_capture" | "block_capture";
    readonly status: "matched" | "mismatch" | "tolerance";
    readonly can_capture: boolean;
    readonly tolerance_minor: number;
    readonly mismatches: readonly unknown[];
  };
}

export function mapExpressReviewDataFromApiResponse(
  response: ExpressReviewApiResponse,
  locale: string,
): ExpressReviewPageData {
  return {
    sourceLabel: response.source_label,
    merchantOrderNumber: response.order_number,
    paypalOrderId: response.paypal_order_id,
    paymentMethodLabel: response.payment_method_label,
    statusLabel: response.status_label,
    shippingAddress: {
      name: response.shipping_address.name,
      line1: response.shipping_address.address_line1,
      line2: response.shipping_address.address_line2,
      country: response.shipping_address.country_code,
    },
    shippingOption: {
      label: response.shipping_option.label,
      detail: response.shipping_option.detail,
      amountLabel: formatMinorMoney(
        response.shipping_option.amount_minor,
        response.shipping_option.currency_code,
        locale,
      ),
    },
    items: response.items.map((item) => ({
      id: item.id,
      name: item.name,
      detail: item.detail,
      amountLabel: formatMinorMoney(
        item.amount_minor,
        item.currency_code,
        locale,
      ),
    })),
    totals: [
      {
        label: "Merchandise subtotal",
        amountLabel: formatMinorMoney(
          response.totals.merchandise_subtotal_minor,
          response.totals.currency_code,
          locale,
        ),
      },
      {
        label: "Shipping",
        amountLabel: formatMinorMoney(
          response.totals.shipping_minor,
          response.totals.currency_code,
          locale,
        ),
      },
      {
        label: "Promo",
        amountLabel:
          response.totals.promo_discount_minor > 0
            ? `-${formatMinorMoney(
                response.totals.promo_discount_minor,
                response.totals.currency_code,
                locale,
              )}`
            : formatMinorMoney(0, response.totals.currency_code, locale),
      },
      {
        label: "Tax",
        amountLabel: formatMinorMoney(
          response.totals.tax_minor,
          response.totals.currency_code,
          locale,
        ),
      },
      {
        label: "Total",
        amountLabel: formatMinorMoney(
          response.totals.total_minor,
          response.totals.currency_code,
          locale,
        ),
        emphasis: true,
      },
    ],
    amountGuard: {
      status: response.amount_guard.can_capture ? "verified" : "blocked",
      label: response.amount_guard.can_capture
        ? "Amount verified"
        : "Amount mismatch detected",
      body: response.amount_guard.can_capture
        ? "Merchant total matches the synchronized PayPal order amount."
        : "Merchant total and PayPal amount must match before capture.",
    },
  };
}

function formatMinorMoney(
  amountMinor: number,
  currencyCode: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amountMinor / 100);
}
