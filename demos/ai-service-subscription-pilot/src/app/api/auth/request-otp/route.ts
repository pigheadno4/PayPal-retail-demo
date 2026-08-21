import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requestOtpSchema } from "@/contracts/identity";
import { requestOtp } from "@/server/auth/service";
import { parseRuntimeEnv } from "@/server/config/env";

export async function POST(request: Request) {
  try {
    const input = requestOtpSchema.parse(await request.json());
    const env = parseRuntimeEnv(process.env);
    await requestOtp(input, (await cookies()).get("demo-session")?.value ?? "", env.demoSessionSigningSecret);
    return NextResponse.json({ accepted: true }, { status: 202, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "request_failed" }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
