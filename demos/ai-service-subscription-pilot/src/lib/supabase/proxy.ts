import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export function buildCheckoutCsp(nonce: string) {
  const developmentEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${developmentEval} https://www.paypal.com https://www.sandbox.paypal.com https://c.paypal.com`,
    "connect-src 'self' https://www.paypal.com https://www.sandbox.paypal.com",
    "frame-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://c.paypal.com",
    "img-src 'self' data: https://www.paypalobjects.com https://c.paypal.com https://b.stats.paypal.com",
    "style-src 'self' 'unsafe-inline'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export async function refreshSupabaseSession(request: NextRequest) {
  const checkout = request.nextUrl?.pathname.startsWith("/checkout/") ?? false;
  const nonce = checkout ? Buffer.from(crypto.randomUUID()).toString("base64") : null;
  const requestHeaders = new Headers(request.headers);
  if (nonce) requestHeaders.set("x-nonce", nonce);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Missing required public Supabase configuration");
  }

  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  await supabase.auth.getUser();
  if (nonce) response.headers.set("Content-Security-Policy", buildCheckoutCsp(nonce));
  return response;
}
