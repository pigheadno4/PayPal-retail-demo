import { NextResponse } from "next/server";

import { paypalIdTokenRequestSchema } from "@/contracts/paypal";
import { requireCurrentUser } from "@/lib/supabase/server";
import { findAccountIdByAuthUser } from "@/server/checkout/repository";
import { parseRuntimeEnv } from "@/server/config/env";
import { HttpPayPalGateway } from "@/server/paypal/http-gateway";
import { issuePayPalUserIdToken, PostgresPayPalRepository } from "@/server/paypal/service";
import { PostgresQuoteRepository } from "@/server/quote/repository";
import { requireCurrentQuoteForPayment } from "@/server/quote/service";

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const input = paypalIdTokenRequestSchema.parse(await request.json());
    const user = await requireCurrentUser();
    const accountId = await findAccountIdByAuthUser(user.id);
    if (!accountId) throw new Error("not_found");
    const env = parseRuntimeEnv(process.env);
    const repository = new PostgresPayPalRepository();
    const merchantCustomerReference = await repository.findAccountPublicId(accountId);
    if (!merchantCustomerReference) throw new Error("not_found");
    const result = await issuePayPalUserIdToken({ ...input, accountId, merchantCustomerReference }, {
      repository,
      merchantId: env.paypalMerchantId,
      environment: env.paypalEnvironment,
      gateway: new HttpPayPalGateway({ clientId: env.public.paypalClientId, clientSecret: env.paypalClientSecret, environment: env.paypalEnvironment }),
      requireReview: ({ accountId: id, intentId, quoteId, now }) => requireCurrentQuoteForPayment({ accountId: id, intentId, quoteId, now, repository: new PostgresQuoteRepository() }),
    });
    return NextResponse.json(result, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "payment_not_available" }, { status: 400, headers: noStore });
  }
}
