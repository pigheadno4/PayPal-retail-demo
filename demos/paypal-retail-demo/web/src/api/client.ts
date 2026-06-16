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

export interface ApiRequestOptions {
  readonly headers?: Readonly<Record<string, string>>;
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
  readonly delete: <TData = unknown>(
    path: string,
    query?: ApiQueryParams,
    options?: ApiRequestOptions,
  ) => Promise<TData>;
  readonly get: <TData = unknown>(
    path: string,
    query?: ApiQueryParams,
    options?: ApiRequestOptions,
  ) => Promise<TData>;
  readonly patch: <TData = unknown>(
    path: string,
    body?: unknown,
    query?: ApiQueryParams,
    options?: ApiRequestOptions,
  ) => Promise<TData>;
  readonly post: <TData = unknown>(
    path: string,
    body?: unknown,
    query?: ApiQueryParams,
    options?: ApiRequestOptions,
  ) => Promise<TData>;
}

export function createApiClient(input: ApiClientInput = {}): ApiClient {
  const fetchClient = input.fetch ?? globalThis.fetch;
  const baseUrl = input.baseUrl ?? resolveDefaultApiBaseUrl();

  return {
    async delete<TData = unknown>(
      path: string,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      const response = await fetchClient(
        buildApiUrl(baseUrl, path, query),
        buildRequestInit("DELETE", options),
      );
      return readApiEnvelope<TData>(response);
    },
    async get<TData = unknown>(
      path: string,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      const response = await fetchClient(
        buildApiUrl(baseUrl, path, query),
        buildRequestInit("GET", options),
      );
      return readApiEnvelope<TData>(response);
    },
    async patch<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      const response = await fetchClient(
        buildApiUrl(baseUrl, path, query),
        buildRequestInit("PATCH", options, {
          body: JSON.stringify(body ?? {}),
          defaultHeaders: {
            "content-type": "application/json",
          },
        }),
      );
      return readApiEnvelope<TData>(response);
    },
    async post<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      const response = await fetchClient(
        buildApiUrl(baseUrl, path, query),
        buildRequestInit("POST", options, {
          body: JSON.stringify(body ?? {}),
          defaultHeaders: {
            "content-type": "application/json",
          },
        }),
      );
      return readApiEnvelope<TData>(response);
    },
  };
}

function buildRequestInit(
  method: string,
  options: ApiRequestOptions | undefined,
  input: {
    readonly body?: string;
    readonly defaultHeaders?: Readonly<Record<string, string>>;
  } = {},
): RequestInit {
  const headers = buildRequestHeaders(options, input.defaultHeaders);

  return {
    method,
    ...(headers ? { headers } : {}),
    ...(input.body ? { body: input.body } : {}),
  };
}

function buildRequestHeaders(
  options: ApiRequestOptions | undefined,
  defaults: Readonly<Record<string, string>> | undefined = undefined,
): Record<string, string> | undefined {
  const headers = {
    ...(defaults ?? {}),
    ...(options?.headers ?? {}),
  };

  return Object.keys(headers).length ? headers : undefined;
}

async function readApiEnvelope<TData>(response: Response): Promise<TData> {
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

function resolveDefaultApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_BASE_URL ??
    globalThis.location?.origin ??
    "http://localhost:3000"
  );
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
