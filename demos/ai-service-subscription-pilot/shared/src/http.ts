export type HealthResponse = Readonly<{ status: "ready" }>;

export type ApiErrorResponse = Readonly<{
  error: Readonly<{
    code: "not_found" | "integration_not_configured" | "internal_error";
  }>;
}>;
