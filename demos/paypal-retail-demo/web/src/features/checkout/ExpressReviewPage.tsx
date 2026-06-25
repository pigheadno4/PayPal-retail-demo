import { useEffect, useRef } from "react";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface ExpressReviewAddress {
  readonly name: string;
  readonly line1: string;
  readonly line2: string;
  readonly country: string;
}

export interface ExpressReviewShippingOption {
  readonly label: string;
  readonly detail: string;
  readonly amountLabel: string;
}

export interface ExpressReviewItem {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  readonly amountLabel: string;
}

export interface ExpressReviewTotalLine {
  readonly label: string;
  readonly amountLabel: string;
  readonly emphasis?: boolean;
}

export interface ExpressReviewRecommendation {
  readonly id: string;
  readonly name: string;
  readonly eyebrow: string;
  readonly priceLabel: string;
  readonly href: string;
  readonly imagePath: string;
  readonly imageAlt: string;
}

export interface ExpressReviewAmountGuard {
  readonly status: "verified" | "blocked";
  readonly label: string;
  readonly body: string;
}

export interface ExpressReviewPageData {
  readonly sourceLabel: string;
  readonly merchantOrderNumber: string;
  readonly paypalOrderId: string;
  readonly paymentMethodLabel: string;
  readonly statusLabel: string;
  readonly shippingAddress: ExpressReviewAddress;
  readonly shippingOption: ExpressReviewShippingOption;
  readonly items: readonly ExpressReviewItem[];
  readonly totals: readonly ExpressReviewTotalLine[];
  readonly amountGuard: ExpressReviewAmountGuard;
  readonly recommendations?: readonly ExpressReviewRecommendation[];
}

export interface ExpressReviewCaptureState {
  readonly status: "idle" | "capturing" | "captured" | "error";
  readonly message?: string;
  readonly captureId?: string;
  readonly debugId?: string;
}

export interface ExpressReviewAccountLinkPrompt {
  readonly status: "error" | "idle" | "linked" | "linking";
  readonly linkedOrderCount?: number;
  readonly onCreateAccount?: () => void;
}

export interface ExpressReviewPageProps {
  readonly accountLinkPrompt?: ExpressReviewAccountLinkPrompt | undefined;
  readonly captureState?: ExpressReviewCaptureState;
  readonly data?: ExpressReviewPageData;
  readonly onConfirmCapture?: () => void;
}

export function ExpressReviewPage({
  accountLinkPrompt,
  captureState = { status: "idle" },
  data = defaultExpressReviewPageData,
  onConfirmCapture,
}: ExpressReviewPageProps) {
  const accountLinkPromptRef = useRef<HTMLDivElement | null>(null);
  const captureBlocked = data.amountGuard.status === "blocked";
  const captureBusy = captureState.status === "capturing";
  const captureComplete = captureState.status === "captured";
  const captureDisabled = captureBlocked || captureBusy || captureComplete;

  useEffect(() => {
    if (!captureComplete || !accountLinkPrompt) {
      return;
    }

    accountLinkPromptRef.current?.focus({ preventScroll: true });
  }, [accountLinkPrompt, captureComplete]);

  return (
    <div className="express-review-page">
      {captureComplete ? (
        <OrderConfirmationHero data={data} />
      ) : (
        <>
          <header className="express-review-hero">
            <p className="homepage-eyebrow">{data.sourceLabel}</p>
            <h1>Review and Confirm</h1>
            <p>
              Review the synchronized delivery total from PayPal before
              capturing the payment.
            </p>
          </header>

          <Card
            className="express-review-status"
            aria-label="Payment session status"
            data-amount-consistency={data.amountGuard.status}
            size="sm"
          >
            <CardHeader className="express-review-status__header">
              <CardTitle>{data.amountGuard.label}</CardTitle>
              <CardAction>
                <Badge
                  className="express-review-status__badge"
                  variant={captureBlocked ? "destructive" : "secondary"}
                >
                  {data.statusLabel}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="express-review-status__content">
              <CardDescription>{data.amountGuard.body}</CardDescription>
            </CardContent>
          </Card>
        </>
      )}

      <div className="express-review-layout">
        <section
          className="express-review-main"
          aria-label="Express order details"
        >
          {captureComplete ? (
            <OrderConfirmationDetails captureState={captureState} data={data} />
          ) : (
            <Card
              aria-labelledby="express-review-order-title"
              className="express-review-section"
              size="sm"
            >
              <CardHeader className="express-review-section__header">
                <CardTitle>
                  <h2 id="express-review-order-title">Order</h2>
                </CardTitle>
              </CardHeader>
              <CardContent className="express-review-section__content">
                <dl className="express-review-facts">
                  <div
                    aria-label={`Merchant order ${data.merchantOrderNumber}`}
                  >
                    <dt>Merchant order</dt>
                    <dd>{data.merchantOrderNumber}</dd>
                  </div>
                  <div aria-label={`PayPal order ${data.paypalOrderId}`}>
                    <dt>PayPal order</dt>
                    <dd>{data.paypalOrderId}</dd>
                  </div>
                  <div aria-label={`Payment method ${data.paymentMethodLabel}`}>
                    <dt>Payment method</dt>
                    <dd>{data.paymentMethodLabel}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          <Card
            aria-labelledby="express-review-delivery-title"
            className="express-review-section"
            size="sm"
          >
            <CardHeader className="express-review-section__header">
              <CardTitle>
                <h2 id="express-review-delivery-title">Delivery</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="express-review-section__content">
              <address>
                <strong>{data.shippingAddress.name}</strong>
                <span>{data.shippingAddress.line1}</span>
                <span>{data.shippingAddress.line2}</span>
                <span>{data.shippingAddress.country}</span>
              </address>
              <div className="express-review-shipping">
                <span>
                  <strong>{data.shippingOption.label}</strong>
                  <small>{data.shippingOption.detail}</small>
                </span>
                <b>{data.shippingOption.amountLabel}</b>
              </div>
            </CardContent>
          </Card>

          <Card
            aria-labelledby="express-review-items-title"
            className="express-review-section"
            size="sm"
          >
            <CardHeader className="express-review-section__header">
              <CardTitle>
                <h2 id="express-review-items-title">Items</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="express-review-section__content">
              <ul className="express-review-items">
                {data.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <b>{item.amountLabel}</b>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {captureComplete && data.recommendations?.length ? (
            <OrderRecommendations recommendations={data.recommendations} />
          ) : null}
        </section>

        <aside
          className="express-review-summary"
          role="complementary"
          aria-label="Final total"
        >
          <Card className="express-review-summary-card" size="sm">
            <CardHeader className="express-review-summary__header">
              <CardTitle>
                <h2>Final snapshot</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="express-review-summary__content">
              <dl>
                {data.totals.map((line) => (
                  <div
                    data-emphasis={line.emphasis ? "true" : "false"}
                    key={line.label}
                  >
                    <dt>{line.label}</dt>
                    <dd>{line.amountLabel}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
            <Separator className="express-review-summary__separator" />
            {!captureComplete ? (
              <CardFooter className="express-review-summary__footer">
                <Button
                  className="button button--primary"
                  disabled={captureDisabled}
                  onClick={onConfirmCapture}
                  size="lg"
                  type="button"
                >
                  {captureBusy ? "Capturing payment..." : "Confirm and pay"}
                </Button>
              </CardFooter>
            ) : null}
          </Card>
          {captureState.message ? (
            <Card
              aria-label={
                captureComplete
                  ? "Captured payment receipt"
                  : "Payment capture status"
              }
              className="express-review-capture-status"
              data-capture-status={captureState.status}
              role={captureState.status === "error" ? "alert" : "status"}
              size="sm"
            >
              <CardHeader className="express-review-capture-status__header">
                <CardTitle>Capture status</CardTitle>
              </CardHeader>
              <CardContent className="express-review-capture-status__content">
                <dl className="express-review-capture-facts">
                  <div>
                    <dt>Capture status</dt>
                    <dd>{captureState.message}</dd>
                  </div>
                  {captureState.captureId ? (
                    <div>
                      <dt>PayPal capture ID</dt>
                      <dd>{captureState.captureId}</dd>
                    </div>
                  ) : null}
                </dl>
                {captureState.debugId ? (
                  <small>Debug reference: {captureState.debugId}</small>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
          {captureComplete && accountLinkPrompt ? (
            <Card
              aria-label="Save guest order"
              className="express-review-account-link"
              data-link-status={accountLinkPrompt.status}
              ref={accountLinkPromptRef}
              size="sm"
              tabIndex={-1}
            >
              <CardHeader className="express-review-account-link__header">
                <CardTitle>Save order to an account</CardTitle>
                <CardDescription>
                  Use the checkout email to add this receipt to order history.
                </CardDescription>
              </CardHeader>
              {accountLinkPrompt.status === "linked" ? (
                <CardContent className="express-review-account-link__content">
                  <span>
                    Linked {accountLinkPrompt.linkedOrderCount ?? 0} guest{" "}
                    {(accountLinkPrompt.linkedOrderCount ?? 0) === 1
                      ? "order"
                      : "orders"}{" "}
                    to account.
                  </span>
                </CardContent>
              ) : (
                <CardFooter className="express-review-account-link__footer">
                  <Button
                    aria-label="Create account to save this order"
                    className="button button--secondary"
                    disabled={accountLinkPrompt.status === "linking"}
                    onClick={accountLinkPrompt.onCreateAccount}
                    size="lg"
                    type="button"
                    variant="outline"
                  >
                    {accountLinkPrompt.status === "linking"
                      ? "Linking guest order..."
                      : "Save order"}
                  </Button>
                </CardFooter>
              )}
              {accountLinkPrompt.status === "error" ? (
                <CardContent className="express-review-account-link__content">
                  <small>Guest order could not be linked. Try again.</small>
                </CardContent>
              ) : null}
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function OrderConfirmationHero({
  data,
}: {
  readonly data: ExpressReviewPageData;
}) {
  return (
    <header
      aria-label="Order confirmation"
      className="express-review-confirmation-hero"
    >
      <span aria-hidden="true" className="express-review-confirmation__icon">
        <CheckIcon />
      </span>
      <div>
        <p className="homepage-eyebrow">{data.sourceLabel}</p>
        <h1>Thank you!</h1>
        <p>
          A confirmation receipt is ready. We sent the latest payment and
          delivery status to the checkout email.
        </p>
      </div>
      <Card className="express-review-confirmation-card" size="sm">
        <CardHeader className="express-review-confirmation-card__header">
          <CardTitle>Order {data.merchantOrderNumber}</CardTitle>
          <CardAction>
            <Badge variant="secondary">Order confirmed</Badge>
          </CardAction>
          <CardDescription>
            Keep this buyer-safe order number for order recovery and support.
          </CardDescription>
        </CardHeader>
        <CardFooter className="express-review-confirmation-actions">
          <Button asChild size="lg">
            <a href="/guest-orders">View Order</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="/products">Continue Shopping</a>
          </Button>
        </CardFooter>
      </Card>
    </header>
  );
}

function OrderConfirmationDetails({
  captureState,
  data,
}: {
  readonly captureState: ExpressReviewCaptureState;
  readonly data: ExpressReviewPageData;
}) {
  return (
    <Card
      aria-labelledby="express-review-confirmation-details-title"
      className="express-review-section express-review-confirmation-details"
      size="sm"
    >
      <CardHeader className="express-review-section__header">
        <CardTitle>
          <h2 id="express-review-confirmation-details-title">Order Details</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="express-review-section__content">
        <dl className="express-review-confirmation-grid">
          <div>
            <dt>Order Number</dt>
            <dd>{data.merchantOrderNumber}</dd>
          </div>
          <div>
            <dt>Payment Method</dt>
            <dd>{data.paymentMethodLabel}</dd>
          </div>
          <div>
            <dt>Payment Status</dt>
            <dd>{captureState.message ?? "Payment captured"}</dd>
          </div>
          <div>
            <dt>Shipping Method</dt>
            <dd>{data.shippingOption.label}</dd>
          </div>
          <div>
            <dt>Estimated Delivery</dt>
            <dd>{data.shippingOption.detail}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function OrderRecommendations({
  recommendations,
}: {
  readonly recommendations: readonly ExpressReviewRecommendation[];
}) {
  return (
    <section
      aria-labelledby="express-review-recommendations-title"
      className="express-review-recommendations"
    >
      <div className="express-review-recommendations__header">
        <h2 id="express-review-recommendations-title">You may also like</h2>
      </div>
      <div className="express-review-recommendations__grid">
        {recommendations.map((recommendation) => (
          <Card
            className="express-review-recommendation-card"
            key={recommendation.id}
            size="sm"
          >
            <img
              alt={recommendation.imageAlt}
              loading="lazy"
              src={recommendation.imagePath}
            />
            <CardHeader className="express-review-recommendation-card__header">
              <CardDescription>{recommendation.eyebrow}</CardDescription>
              <CardTitle>
                <h3>{recommendation.name}</h3>
              </CardTitle>
            </CardHeader>
            <CardFooter className="express-review-recommendation-card__footer">
              <span>{recommendation.priceLabel}</span>
              <Button asChild size="sm" variant="outline">
                <a href={recommendation.href}>View</a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

export const defaultExpressReviewPageData: ExpressReviewPageData = {
  sourceLabel: "Delivery express from cart",
  merchantOrderNumber: "DO-20260607-000123",
  paypalOrderId: "9AB12345CD6789012",
  paymentMethodLabel: "PayPal",
  statusLabel: "Payment session synchronized",
  shippingAddress: {
    name: "Taylor Chen",
    line1: "88 Spring Street",
    line2: "New York, NY 10012",
    country: "United States",
  },
  shippingOption: {
    label: "Standard shipping",
    detail: "Arrives in 4-6 business days",
    amountLabel: "$5.00",
  },
  items: [
    {
      id: "line-1",
      name: "Labubu Have a Seat",
      detail: "Blind Boxes - Qty 1",
      amountLabel: "$12.99",
    },
    {
      id: "line-2",
      name: "Hirono Little Mischief",
      detail: "Plush - Qty 1",
      amountLabel: "$12.99",
    },
  ],
  totals: [
    {
      label: "Merchandise subtotal",
      amountLabel: "$25.98",
    },
    {
      label: "Shipping",
      amountLabel: "$5.00",
    },
    {
      label: "Promo",
      amountLabel: "-$3.00",
    },
    {
      label: "Tax",
      amountLabel: "$2.02",
    },
    {
      label: "Total",
      amountLabel: "$30.00",
      emphasis: true,
    },
  ],
  amountGuard: {
    status: "verified",
    label: "Amount verified",
    body: "Merchant total matches the synchronized PayPal order amount.",
  },
};
