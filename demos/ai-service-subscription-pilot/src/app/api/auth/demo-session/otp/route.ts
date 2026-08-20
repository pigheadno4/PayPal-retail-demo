import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { retrieveDemoOtp } from "@/server/auth/send-email-hook";
import { parseRuntimeEnv } from "@/server/config/env";
import { PostgresDemoSessionRepository } from "@/server/checkout/repository";

export async function GET() {
  try {
    const env = parseRuntimeEnv(process.env);
    const result = await retrieveDemoOtp({
      cookieValue: (await cookies()).get("demo-session")?.value ?? "",
      clock: () => new Date(), signingSecret: env.demoSessionSigningSecret,
      encryptionSecret: env.demoSessionSigningSecret, repository: new PostgresDemoSessionRepository(),
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "demo_otp_unavailable" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
}
