import { NextResponse } from "next/server";

import { parseRuntimeEnv } from "@/server/config/env";
import { HttpPayPalGateway } from "@/server/paypal/http-gateway";
import { PostgresPayPalWebhookRepository, reconcilePayPalWebhook } from "@/server/paypal/webhook";

export async function POST(request: Request) {
  const env = parseRuntimeEnv(process.env);
  const rawBody = await request.text();
  const transmissionHeaders = Object.fromEntries([...request.headers.entries()].filter(([name]) => name.startsWith("paypal-")));
  const result = await reconcilePayPalWebhook(rawBody, transmissionHeaders, {
    repository: new PostgresPayPalWebhookRepository(), merchantId: env.paypalMerchantId, environment: env.paypalEnvironment, webhookId: env.paypalWebhookId,
    gateway: new HttpPayPalGateway({ clientId: env.public.paypalClientId, clientSecret: env.paypalClientSecret, environment: env.paypalEnvironment }),
  });
  return NextResponse.json(result, { status: result.accepted ? 200 : 400, headers: { "Cache-Control": "no-store" } });
}
