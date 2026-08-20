import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { verifyOtpSchema } from "@/contracts/identity";
import { completeVerifiedIdentity } from "@/server/auth/service";
import { parseRuntimeEnv } from "@/server/config/env";

export async function POST(request: Request) {
  try {
    const input = verifyOtpSchema.parse(await request.json());
    const env = parseRuntimeEnv(process.env);
    const review = await completeVerifiedIdentity(input, (await cookies()).get("demo-session")?.value ?? "", env.demoSessionSigningSecret);
    return NextResponse.json(review, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "verification_failed" }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
