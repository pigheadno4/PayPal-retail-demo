import { NextResponse } from "next/server";

import { parseRuntimeEnv } from "@/server/config/env";
import { createPendingGoMonthlyIntent } from "@/server/checkout/service";

export const dynamic = "force-dynamic";

export async function POST() {
  const env = parseRuntimeEnv(process.env);
  const result = await createPendingGoMonthlyIntent({ signingSecret: env.demoSessionSigningSecret });
  const response = NextResponse.json(result.response, { status: 201 });
  response.cookies.set("demo-session", result.cookieValue, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: result.cookieExpiresAt,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
