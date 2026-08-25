import { IdentityPanel } from "@/components/checkout/identity-panel";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ intentId: string }> }) {
  const { intentId } = await params;
  const nonce = (await headers()).get("x-nonce") ?? "";
  return <IdentityPanel intentId={intentId} nonce={nonce} />;
}
