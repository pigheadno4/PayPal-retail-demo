export type ApiQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface ApiSuccessEnvelope<TData> {
  readonly ok: true;
  readonly data: TData;
  readonly debug_id: string;
}

export interface ApiErrorEnvelope {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly debug_id: string;
}

export type ApiEnvelope<TData> = ApiSuccessEnvelope<TData> | ApiErrorEnvelope;

export interface ApiClientInput {
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly debugId: string;
  readonly status: number;
  readonly details: unknown;

  constructor(input: {
    readonly status: number;
    readonly code: string;
    readonly message: string;
    readonly debugId: string;
    readonly details: unknown;
  }) {
    super(input.message);
    this.name = "ApiClientError";
    this.status = input.status;
    this.code = input.code;
    this.debugId = input.debugId;
    this.details = input.details;
  }
}

export interface ApiClient {
  readonly get: <TData = unknown>(
    path: string,
    query?: ApiQueryParams,
  ) => Promise<TData>;
}

export function createApiClient(input: ApiClientInput = {}): ApiClient {
  const fetchClient = input.fetch ?? globalThis.fetch;
  const baseUrl = input.baseUrl ?? globalThis.location?.origin ?? "/";

  return {
    async get<TData = unknown>(path: string, query?: ApiQueryParams) {
      const response = await fetchClient(buildApiUrl(baseUrl, path, query), {
        method: "GET",
      });
      const envelope = (await response.json()) as ApiEnvelope<TData>;

      if (!envelope.ok) {
        throw new ApiClientError({
          status: response.status,
          code: envelope.error.code,
          message: envelope.error.message,
          debugId: envelope.debug_id,
          details: envelope.error.details ?? {},
        });
      }

      return envelope.data;
    },
  };
}

function buildApiUrl(
  baseUrl: string,
  path: string,
  query: ApiQueryParams | undefined,
): string {
  const url = new URL(path, normalizeBaseUrl(baseUrl));
  for (const [key, value] of Object.entries(query ?? {}).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
