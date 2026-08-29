export type HealthResponse = Readonly<{ status: "ready" }>;

export type ApiErrorResponse = Readonly<{
  error: Readonly<{
    code:
      | "not_found"
      | "invalid_request"
      | "authentication_required"
      | "stale_quote"
      | "hook_rejected"
      | "integration_not_configured"
      | "internal_error";
  }>;
}>;
