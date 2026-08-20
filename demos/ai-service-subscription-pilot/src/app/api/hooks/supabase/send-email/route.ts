import { NextResponse } from "next/server";
import { Resend } from "resend";

import { processSendEmailHook } from "@/server/auth/send-email-hook";
import { parseRuntimeEnv } from "@/server/config/env";
import { PostgresDemoSessionRepository } from "@/server/checkout/repository";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const env = parseRuntimeEnv(process.env);
    const resend = new Resend(env.resendApiKey);
    await processSendEmailHook({
      rawBody,
      headers: Object.fromEntries(request.headers.entries()),
      clock: () => new Date(), hookSecret: env.supabaseSendEmailHookSecret,
      encryptionSecret: env.demoSessionSigningSecret,
      repository: new PostgresDemoSessionRepository(),
      sendPersistentEmail: async (email, otp) => {
        const { error } = await resend.emails.send({ from: env.emailFromAddress, to: [email], subject: "Your AI Service demo code", text: `Your verification code is ${otp}. It expires shortly.` });
        if (error) throw new Error("email_delivery_failed");
      },
    });
    return NextResponse.json({});
  } catch {
    return NextResponse.json({ error: "hook_rejected" }, { status: 401 });
  }
}
