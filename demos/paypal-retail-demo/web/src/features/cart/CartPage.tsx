import { useState, type MouseEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { PayPalPaymentFrame } from "../payments/PayPalPaymentFrame.js";
import { type DeliveryExpressPaymentMethod } from "../payments/deliveryExpress.js";
import { CartSummaryBreakdown } from "./CartSummaryBreakdown.js";
import {
  buildCartPayLaterMessage,
  calculateCartItemCount,
  calculateCartMerchandiseTotalCents,
  defaultCartData,
  formatCartAmount,
  resolveCartItemQuantity,
  resolveCartItemServerId,
  type CartData,
  type CartItem,
  type CartQuantityOverrides,
} from "./cartModel.js";

export interface CartPageProps {
  readonly data?: CartData;
  readonly onCheckoutNavigate?: () => void | Promise<void>;
  readonly onDeliveryExpressStart?: (
    method: DeliveryExpressPaymentMethod,
  ) => void | Promise<void>;
  readonly renderDeliveryExpressAction?: (
    method: DeliveryExpressPaymentMethod,
    totalLabel: string,
  ) => ReactNode;
  readonly renderPayLaterMessage?: (
    totalLabel: string,
    fallbackMessage: string,
  ) => ReactNode;
  readonly onQuantityChange?: (
    slug: string,
    nextQuantity: number,
    cartItemId: string,
  ) => void;
}

export function CartPage({
  data = defaultCartData,
  onCheckoutNavigate,
  onDeliveryExpressStart,
  onQuantityChange,
  renderDeliveryExpressAction,
  renderPayLaterMessage,
}: CartPageProps) {
  const [quantityOverrides, setQuantityOverrides] =
    useState<CartQuantityOverrides>({});
  const effectiveQuantityOverrides = onQuantityChange ? {} : quantityOverrides;
  const itemCount = calculateCartItemCount(data, effectiveQuantityOverrides);
  const itemCountLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;
  const hasCheckoutItems = itemCount > 0;
  const subtotalLabel = formatCartAmount(
    calculateCartMerchandiseTotalCents(data, effectiveQuantityOverrides),
    data,
  );
  const payLaterMessage = buildCartPayLaterMessage(
    data,
    effectiveQuantityOverrides,
  );

  function updateQuantity(item: CartItem, nextQuantity: number) {
    if (onQuantityChange) {
      onQuantityChange(item.slug, nextQuantity, resolveCartItemServerId(item));
      return;
    }

    setQuantityOverrides((currentQuantities) => ({
      ...currentQuantities,
      [item.slug]: nextQuantity,
    }));
  }

  return (
    <div className="cart-page" data-visual-accent-scope="cart">
      <header className="cart-hero" aria-label={data.title}>
        <p className="homepage-eyebrow">Cart</p>
        <div>
          <h1>Bag</h1>
          <p>
            {itemCountLabel} - {subtotalLabel} subtotal
          </p>
        </div>
      </header>

      <section className="cart-items" aria-label="Cart items">
        {data.items.length > 0 ? (
          data.items.map((item) => {
            const quantity = resolveCartItemQuantity(
              item,
              effectiveQuantityOverrides,
            );
            const lineTotalLabel = formatCartAmount(
              item.unitPriceCents * quantity,
              data,
            );

            return (
              <article className="cart-item" key={item.slug}>
                <a href={item.href}>
                  <img
                    src={item.imagePath}
                    alt={item.imageAlt}
                    loading="lazy"
                  />
                </a>
                <div className="cart-item__body">
                  <Badge className="cart-item__category" variant="secondary">
                    {item.categoryName}
                  </Badge>
                  <a href={item.href}>
                    <strong>{item.name}</strong>
                  </a>
                  <div className="cart-item__price">
                    <span>{item.currentPriceLabel}</span>
                    {item.currentPriceLabel ===
                    item.regularPriceLabel ? null : (
                      <s>{item.regularPriceLabel}</s>
                    )}
                  </div>
                  <span className="cart-item__line-total">
                    Line total {lineTotalLabel}
                  </span>
                  {item.unavailableReason ? (
                    <p className="cart-item__notice">
                      {item.unavailableReason}
                    </p>
                  ) : null}
                </div>
                <div className="cart-quantity">
                  <button
                    type="button"
                    aria-label={`Decrease ${item.name} quantity`}
                    disabled={quantity <= 0}
                    onClick={() => updateQuantity(item, quantity - 1)}
                  >
                    -
                  </button>
                  <input
                    aria-label={`${item.name} quantity`}
                    inputMode="numeric"
                    min={0}
                    max={item.maxQuantity}
                    readOnly
                    type="number"
                    value={quantity}
                  />
                  <button
                    type="button"
                    aria-label={`Increase ${item.name} quantity`}
                    disabled={quantity >= item.maxQuantity}
                    onClick={() => updateQuantity(item, quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <article className="cart-empty-state">
            <strong>Your cart is empty</strong>
            <p>Add a collectible to unlock checkout and PayPal options.</p>
            <Button
              asChild
              className="button button--secondary"
              variant="outline"
            >
              <a href="/products">Continue shopping</a>
            </Button>
          </article>
        )}
      </section>

      <Card
        className="cart-summary"
        data-visual-accent="commerce-summary"
        role="complementary"
        aria-label="Order summary"
        size="sm"
      >
        <CardHeader className="cart-summary__header">
          <CardTitle>Order summary</CardTitle>
          <CardDescription>{itemCountLabel}</CardDescription>
        </CardHeader>
        <CardContent className="cart-summary__content">
          <CartSummaryBreakdown subtotalLabel={subtotalLabel} />
          {hasCheckoutItems ? (
            <Separator className="cart-summary__separator" />
          ) : null}
        </CardContent>
        <CardFooter className="cart-summary__footer">
          {hasCheckoutItems ? (
            <>
              <Button asChild className="button button--primary">
                <a
                  href={data.checkoutHref}
                  onClick={(event) =>
                    handleOptionalNavigation(event, onCheckoutNavigate)
                  }
                >
                  Go to checkout
                </a>
              </Button>
              <section
                className="cart-paylater"
                aria-labelledby="cart-paylater-title"
              >
                <h2 id="cart-paylater-title">Pay Later with PayPal</h2>
                {renderPayLaterMessage ? (
                  renderPayLaterMessage(subtotalLabel, payLaterMessage)
                ) : (
                  <p>{payLaterMessage}</p>
                )}
              </section>
              <PayPalPaymentFrame className="cart-paypal-frame">
                <DeliveryExpressActions
                  totalLabel={subtotalLabel}
                  {...(onDeliveryExpressStart
                    ? { onExpressStart: onDeliveryExpressStart }
                    : {})}
                  {...(renderDeliveryExpressAction
                    ? { renderAction: renderDeliveryExpressAction }
                    : {})}
                />
              </PayPalPaymentFrame>
              <p className="cart-pickup-hint">{data.pickupHint}</p>
            </>
          ) : (
            <p className="cart-pickup-hint">
              Checkout options appear after you add an item.
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

function handleOptionalNavigation(
  event: MouseEvent<HTMLAnchorElement>,
  onNavigate: (() => void | Promise<void>) | undefined,
) {
  if (onNavigate) {
    event.preventDefault();
    onNavigate();
  }
}

export interface DeliveryExpressActionsProps {
  readonly className?: string;
  readonly onExpressStart?:
    | ((method: DeliveryExpressPaymentMethod) => void)
    | undefined;
  readonly renderAction?: (
    method: DeliveryExpressPaymentMethod,
    totalLabel: string,
  ) => ReactNode;
  readonly totalLabel?: string;
}

export function DeliveryExpressActions({
  className,
  onExpressStart,
  renderAction,
  totalLabel,
}: DeliveryExpressActionsProps) {
  const classNames = ["cart-express-actions", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} aria-label="Delivery express payment">
      {renderAction ? (
        <>
          {renderAction("paypal", totalLabel ?? "")}
          {renderAction("paylater", totalLabel ?? "")}
        </>
      ) : (
        <>
          <Button
            type="button"
            className="button button--secondary"
            variant="outline"
            data-fulfillment-mode="delivery"
            onClick={() => onExpressStart?.("paypal")}
          >
            PayPal
          </Button>
          <Button
            type="button"
            className="button button--secondary"
            variant="outline"
            data-fulfillment-mode="delivery"
            onClick={() => onExpressStart?.("paylater")}
          >
            Pay Later
          </Button>
        </>
      )}
    </div>
  );
}
