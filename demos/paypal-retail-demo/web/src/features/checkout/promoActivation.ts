import type {
  ApiClient,
  ApiQueryParams,
  ApiRequestOptions,
} from "../../api/client.js";
import type { CheckoutDraftApiResponse } from "./checkoutDraftApi.js";

export interface CheckoutPromoEvaluationApiResponse {
  readonly promo?: {
    readonly merchandise_discount_minor?: number;
    readonly recommended_set?: readonly string[];
    readonly rejected?: readonly unknown[];
    readonly selected_set?: readonly string[];
  };
}

export type CheckoutPromoActivationResult =
  | {
      readonly response: CheckoutDraftApiResponse;
      readonly selectedCodes: readonly string[];
      readonly status: "applied";
    }
  | {
      readonly evaluation: CheckoutPromoEvaluationApiResponse;
      readonly status: "not_applicable";
    }
  | {
      readonly error: unknown;
      readonly status: "failed";
    };

export async function evaluateCheckoutPromos(
  apiClient: ApiClient,
  draftId: string,
  query?: ApiQueryParams,
  options?: ApiRequestOptions,
  manualCodes: readonly string[] = [],
): Promise<CheckoutPromoEvaluationApiResponse> {
  return apiClient.post<CheckoutPromoEvaluationApiResponse>(
    `${draftPromoPath(draftId)}/evaluate`,
    {
      manual_codes: normalizePromoCodes(manualCodes),
    },
    query,
    options,
  );
}

export async function applyCheckoutPromos(
  apiClient: ApiClient,
  draftId: string,
  selectedCodes: readonly string[],
  manualCodes: readonly string[] = [],
  query?: ApiQueryParams,
  options?: ApiRequestOptions,
): Promise<CheckoutDraftApiResponse> {
  return apiClient.post<CheckoutDraftApiResponse>(
    `${draftPromoPath(draftId)}/apply`,
    {
      manual_codes: normalizePromoCodes(manualCodes),
      selected_codes: normalizePromoCodes(selectedCodes),
    },
    query,
    options,
  );
}

export async function removeCheckoutPromo(
  apiClient: ApiClient,
  draftId: string,
  code: string,
  query?: ApiQueryParams,
  options?: ApiRequestOptions,
): Promise<CheckoutDraftApiResponse> {
  return apiClient.delete<CheckoutDraftApiResponse>(
    `${draftPromoPath(draftId)}/${encodeURIComponent(code)}`,
    query,
    options,
  );
}

export async function activateRecommendedCheckoutPromos({
  apiClient,
  draftId,
  manualCodes = [],
  query,
  requestOptions,
}: {
  readonly apiClient: ApiClient;
  readonly draftId: string;
  readonly manualCodes?: readonly string[];
  readonly query?: ApiQueryParams;
  readonly requestOptions?: ApiRequestOptions;
}): Promise<CheckoutPromoActivationResult> {
  try {
    const evaluation = await evaluateCheckoutPromos(
      apiClient,
      draftId,
      query,
      requestOptions,
      manualCodes,
    );
    const selectedCodes = resolveRecommendedPromoCodes(evaluation);

    if (!selectedCodes.length || !hasPositiveEvaluationDiscount(evaluation)) {
      return {
        evaluation,
        status: "not_applicable",
      };
    }

    return {
      response: await applyCheckoutPromos(
        apiClient,
        draftId,
        selectedCodes,
        manualCodes,
        query,
        requestOptions,
      ),
      selectedCodes,
      status: "applied",
    };
  } catch (error) {
    return {
      error,
      status: "failed",
    };
  }
}

function draftPromoPath(draftId: string): string {
  return `/api/checkout/drafts/${encodeURIComponent(draftId)}/promos`;
}

function resolveRecommendedPromoCodes(
  response: CheckoutPromoEvaluationApiResponse,
): readonly string[] {
  return normalizePromoCodes(response.promo?.recommended_set ?? []);
}

function hasPositiveEvaluationDiscount(
  response: CheckoutPromoEvaluationApiResponse,
): boolean {
  return (response.promo?.merchandise_discount_minor ?? 0) > 0;
}

function normalizePromoCodes(codes: readonly string[]): readonly string[] {
  const normalizedCodes: string[] = [];
  const seenCodes = new Set<string>();

  for (const code of codes) {
    const normalizedCode = code.trim().toUpperCase();

    if (normalizedCode && !seenCodes.has(normalizedCode)) {
      normalizedCodes.push(normalizedCode);
      seenCodes.add(normalizedCode);
    }
  }

  return normalizedCodes;
}
