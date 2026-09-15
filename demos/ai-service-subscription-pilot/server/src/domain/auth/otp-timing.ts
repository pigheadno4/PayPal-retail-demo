import { randomUUID } from "node:crypto";

const stages = ["request_entry", "lookup_start", "lookup_end", "expiry_branch",
  "cleanup_start", "cleanup_end", "response_finish", "response_close"] as const;
type OtpTimingStage = typeof stages[number];
export type OtpTiming = (stage: OtpTimingStage) => void;
export type OtpTimingSink = (row: Readonly<{
  event: "demo_otp_timing";
  requestMarker: string;
  stage: OtpTimingStage;
  elapsedMs: number;
}>) => void | Promise<void>;

// Request-only correlation. Never accepts request/session data or raw errors.
export function createOtpTiming(sink: OtpTimingSink = (row) => { console.info(row); }): OtpTiming {
  try {
    const requestMarker = randomUUID();
    const start = performance.now();
    return (stage) => {
      try {
        if (!stages.includes(stage)) return;
        const elapsed = performance.now() - start;
        const elapsedMs = Number.isFinite(elapsed)
          ? Math.min(60_000, Math.max(0, Math.floor(elapsed))) : 0;
        void Promise.resolve(sink({ event: "demo_otp_timing", requestMarker, stage, elapsedMs }))
          .catch(() => undefined);
      } catch { /* Diagnostics must not change retrieval or response behavior. */ }
    };
  } catch {
    return () => undefined;
  }
}
