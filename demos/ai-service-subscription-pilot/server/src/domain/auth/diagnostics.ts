import { randomUUID } from "node:crypto";

const events = {
  otp_request_failed: ["otp_request", 202],
  signature_failed: ["hook_signature", 401],
  payload_failed: ["hook_payload", 401],
  database_failed: ["database_lookup", 500],
  resend_rejected: ["resend_delivery", 500],
  resend_threw: ["resend_delivery", 500],
} as const;

export function createAuthDiagnostic() {
  const correlationId = randomUUID();
  return (code: keyof typeof events): void => {
    try {
      if (!Object.hasOwn(events, code)) return;
      const [stage, status] = events[code];
      console.info(JSON.stringify({ correlationId, stage, status, code }));
    } catch { /* Diagnostic output must never change authentication behavior. */ }
  };
}

export async function observeResend(
  send: () => Promise<{ error: unknown }>,
  diagnostic: ReturnType<typeof createAuthDiagnostic>,
): Promise<void> {
  let result: { error: unknown };
  try { result = await send(); } catch (error) {
    diagnostic("resend_threw");
    throw error;
  }
  if (result.error) {
    diagnostic("resend_rejected");
    throw new Error("email_unavailable");
  }
}
