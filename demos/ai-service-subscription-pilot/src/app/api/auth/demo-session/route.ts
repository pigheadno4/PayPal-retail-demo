import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { verifySignedDemoSession } from "@/server/auth/demo-session";
import { parseRuntimeEnv } from "@/server/config/env";
import { createOrReadTemporarySession } from "@/server/checkout/repository";

export async function POST() {
  try {
    const env = parseRuntimeEnv(process.env);
    const cookie = (await cookies()).get("demo-session")?.value ?? "";
    const proof = verifySignedDemoSession(cookie, env.demoSessionSigningSecret);
    const result = await createOrReadTemporarySession(proof);
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "session_unavailable" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
}
