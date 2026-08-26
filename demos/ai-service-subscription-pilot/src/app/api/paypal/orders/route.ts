import { NextResponse } from "next/server";

import { createPayPalOrderRequestSchema } from "@/contracts/paypal";
import { requireCurrentUser } from "@/lib/supabase/server";
import { findAccountIdByAuthUser } from "@/server/checkout/repository";
import { parseRuntimeEnv } from "@/server/config/env";
import { HttpPayPalGateway } from "@/server/paypal/http-gateway";
import { createPayPalOrder, PostgresPayPalRepository } from "@/server/paypal/service";
import { PostgresQuoteRepository } from "@/server/quote/repository";
import { requireCurrentQuoteForPayment } from "@/server/quote/service";

export async function POST(request: Request) {
  try {
    const input = createPayPalOrderRequestSchema.parse(await request.json());
    const user = await requireCurrentUser();
    const accountId = await findAccountIdByAuthUser(user.id);
    if (!accountId) throw new Error("not_found");
    const env = parseRuntimeEnv(process.env);
    const result = await createPayPalOrder({ ...input, accountId }, {
      repository: new PostgresPayPalRepository(), merchantId: env.paypalMerchantId, environment: env.paypalEnvironment,
      gateway: new HttpPayPalGateway({ clientId: env.public.paypalClientId, clientSecret: env.paypalClientSecret, environment: env.paypalEnvironment }),
      requireReview: ({ accountId: id, intentId, quoteId, now }) => requireCurrentQuoteForPayment({ accountId: id, intentId, quoteId, now, repository: new PostgresQuoteRepository() }),
    });
    return NextResponse.json(result, {
      status: result.status === "in_progress" ? 202 : 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "payment_not_available" }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
