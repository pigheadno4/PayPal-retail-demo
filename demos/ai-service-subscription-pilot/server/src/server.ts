import { Router } from "express";
import { resolve } from "node:path";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

import { createApp } from "./app.js";
import {
  parseBaseServerConfig,
  requireEmailHookConfig,
} from "./config/env.js";
import { createDatabaseClient } from "./db/client.js";
import {
  processSendEmailHook,
  retrieveDemoOtp,
} from "./domain/auth/send-email-hook.js";
import { requestOtp, resumeVerifiedIdentity } from "./domain/auth/service.js";
import { PostgresCheckoutRepository } from "./domain/checkout/repository.js";
import {
  createPendingGoMonthlyIntent,
  createTemporaryDemoSession,
} from "./domain/checkout/service.js";
import { PostgresQuoteRepository } from "./domain/quote/repository.js";
import {
  QuoteNotFoundError,
  replaceCurrentQuote,
  toCheckoutReview,
} from "./domain/quote/service.js";
import { createSupabaseTokenVerifier } from "./middleware/auth.js";
import { createIdentityRouter } from "./routes/identity.js";
import { createQuotesRouter } from "./routes/quotes.js";
import { createSupabaseHookRouter } from "./routes/supabase-hook.js";

const config = parseBaseServerConfig(process.env);
const sql = createDatabaseClient(config.databaseUrl);
const checkoutRepository = new PostgresCheckoutRepository(sql);
const quoteRepository = new PostgresQuoteRepository(sql);
const verifyToken = createSupabaseTokenVerifier(config);
const otpClient = createClient(config.supabaseUrl, config.supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const apiRouter = Router();
apiRouter.use(createIdentityRouter({
  createIntent: () => createPendingGoMonthlyIntent({
    signingSecret: config.demoSessionSigningSecret,
    insertPendingIntent: (tokenHash, now) => checkoutRepository.insertPendingIntent(tokenHash, now),
  }),
  createDemoSession: (cookieValue) => createTemporaryDemoSession({
    cookieValue,
    signingSecret: config.demoSessionSigningSecret,
    createOrRead: (proof) => checkoutRepository.createOrReadTemporarySession(proof),
  }),
  requestOtp: (input, cookieValue) => requestOtp(
    input,
    cookieValue,
    config.demoSessionSigningSecret,
    {
      intentBelongsToSession: (intentId, tokenHash, now) =>
        checkoutRepository.intentBelongsToSession(intentId, tokenHash, now),
      getTemporaryAlias: (publicId) => checkoutRepository.getTemporaryAlias(publicId),
      requestEmailOtp: async (email) => {
        const { error } = await otpClient.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) throw new Error("request_not_available");
      },
    },
  ),
  retrieveOtp: (cookieValue) => retrieveDemoOtp({
    cookieValue,
    clock: () => new Date(),
    signingSecret: config.demoSessionSigningSecret,
    encryptionSecret: config.demoSessionSigningSecret,
    repository: checkoutRepository,
  }),
  resume: ({ intentId, verifiedUser, cookieValue }) => resumeVerifiedIdentity({
    intentId,
    verifiedUser,
    cookieValue,
    signingSecret: config.demoSessionSigningSecret,
    dependencies: {
      findSessionByPublicId: (publicId) => checkoutRepository.findByPublicId(publicId),
      bindIdentityAndQuote: (input) => checkoutRepository.bindVerifiedIdentityAndQuote(input),
    },
  }),
  verifyToken,
}));
apiRouter.use(createQuotesRouter({
  verifyToken,
  readQuote: async (identity, intentId) => {
    const accountId = await checkoutRepository.findAccountIdByAuthUser(identity.userId);
    if (!accountId) throw new QuoteNotFoundError();
    const quote = await quoteRepository.findCurrentOwnedQuote(accountId, intentId);
    if (!quote) throw new QuoteNotFoundError();
    return toCheckoutReview(quote);
  },
  replaceQuote: async (identity, input) => {
    const accountId = await checkoutRepository.findAccountIdByAuthUser(identity.userId);
    if (!accountId) throw new QuoteNotFoundError();
    return replaceCurrentQuote({
      accountId,
      intentId: input.intentId,
      currentQuoteId: input.currentQuoteId,
      clock: () => new Date(),
      repository: quoteRepository,
    });
  },
}));

const webhookRouter = createSupabaseHookRouter({
  processHook: async (rawBody, headers) => {
    const emailConfig = requireEmailHookConfig(process.env);
    const resend = new Resend(emailConfig.resendApiKey);
    await processSendEmailHook({
      rawBody,
      headers,
      clock: () => new Date(),
      hookSecret: emailConfig.sendEmailHookSecret,
      encryptionSecret: config.demoSessionSigningSecret,
      repository: checkoutRepository,
      sendPersistentEmail: async (email, otp) => {
        const result = await resend.emails.send({
          from: emailConfig.fromAddress,
          to: email,
          subject: "Your AI Service Studio verification code",
          text: `Your verification code is ${otp}. It expires shortly.`,
        });
        if (result.error) throw new Error("email_unavailable");
      },
    });
  },
});

const app = createApp({
  config,
  webDistPath: resolve(process.cwd(), "dist/web"),
  apiRouter,
  webhookRouter,
});

app.listen(config.port, () => {
  console.log(`AI service demo server listening on port ${config.port}`);
});
