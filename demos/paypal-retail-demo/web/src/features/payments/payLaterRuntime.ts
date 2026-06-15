import { useEligibleMethods } from "@paypal/react-paypal-js/sdk-v6";

export type PayLaterButtonEligibility =
  | {
      readonly status: "loading" | "error" | "ineligible" | "details_missing";
      readonly statusLabel: string;
    }
  | {
      readonly details: {
        readonly countryCode: string;
        readonly productCode: string;
      };
      readonly status: "eligible";
      readonly statusLabel: string;
    };

interface PayLaterEligibleMethods {
  readonly getDetails: (method: "paylater") => {
    readonly countryCode?: string;
    readonly productCode?: string;
  };
  readonly isEligible: (method: "paylater") => boolean;
}

export function usePayLaterButtonEligibility({
  currencyCode,
  totalLabel,
}: {
  readonly currencyCode: string;
  readonly totalLabel: string;
}): PayLaterButtonEligibility {
  const amount = normalizePayLaterMessageAmount(totalLabel);
  const { eligiblePaymentMethods, error, isLoading } = useEligibleMethods({
    payload: {
      amount,
      currencyCode,
      paymentFlow: "ONE_TIME_PAYMENT",
    },
  });

  return resolvePayLaterButtonEligibility({
    eligiblePaymentMethods,
    error,
    isLoading,
  });
}

export function resolvePayLaterButtonEligibility({
  eligiblePaymentMethods,
  error,
  isLoading,
}: {
  readonly eligiblePaymentMethods: PayLaterEligibleMethods | null;
  readonly error: Error | null;
  readonly isLoading: boolean;
}): PayLaterButtonEligibility {
  if (error) {
    return {
      status: "error",
      statusLabel: "Pay Later eligibility could not be checked.",
    };
  }

  if (isLoading || !eligiblePaymentMethods) {
    return {
      status: "loading",
      statusLabel: "Pay Later eligibility pending.",
    };
  }

  if (!eligiblePaymentMethods.isEligible("paylater")) {
    return {
      status: "ineligible",
      statusLabel: "Pay Later is unavailable for this cart.",
    };
  }

  const details = eligiblePaymentMethods.getDetails("paylater");
  const countryCode = details.countryCode?.trim();
  const productCode = details.productCode?.trim();

  if (!countryCode || !productCode) {
    return {
      status: "details_missing",
      statusLabel: "Pay Later details are unavailable.",
    };
  }

  return {
    details: {
      countryCode,
      productCode,
    },
    status: "eligible",
    statusLabel: "Pay Later payment button ready.",
  };
}

export function normalizePayLaterMessageAmount(amountLabel: string): string {
  const digitsAndSeparator = amountLabel.replace(/[^0-9.]/g, "");
  const [whole = "0", rawFraction = ""] = digitsAndSeparator.split(".");
  const fraction = rawFraction.padEnd(2, "0").slice(0, 2);

  return `${whole || "0"}.${fraction}`;
}
