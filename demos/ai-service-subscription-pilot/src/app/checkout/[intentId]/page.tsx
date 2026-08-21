import { IdentityPanel } from "@/components/checkout/identity-panel";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ intentId: string }> }) {
  const { intentId } = await params;
  return <IdentityPanel intentId={intentId} />;
}
