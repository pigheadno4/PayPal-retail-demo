import { useState, type MouseEvent } from "react";

import { type DeliveryExpressPaymentMethod } from "../payments/deliveryExpress.js";
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
}: CartPageProps) {
  const [quantityOverrides, setQuantityOverrides] =
    useState<CartQuantityOverrides>({});
  const effectiveQuantityOverrides = onQuantityChange ? {} : quantityOverrides;
  const itemCount = calculateCartItemCount(data, effectiveQuantityOverrides);
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
    <div className="cart-page">
      <header className="cart-hero">
        <p className="homepage-eyebrow">Bag</p>
        <div>
          <h1>{data.title}</h1>
          <p>{itemCount === 1 ? "1 item" : `${itemCount} items`}</p>
        </div>
      </header>

      <section className="cart-items" aria-label="Cart items">
        {data.items.map((item) => {
          const quantity = resolveCartItemQuantity(
            item,
            effectiveQuantityOverrides,
          );

          return (
            <article className="cart-item" key={item.slug}>
              <a href={item.href}>
                <img src={item.imagePath} alt={item.imageAlt} />
              </a>
              <div className="cart-item__body">
                <span>{item.categoryName}</span>
                <a href={item.href}>
                  <strong>{item.name}</strong>
                </a>
                <div className="cart-item__price">
                  <span>{item.currentPriceLabel}</span>
                  {item.currentPriceLabel === item.regularPriceLabel ? null : (
                    <s>{item.regularPriceLabel}</s>
                  )}
                </div>
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
        })}
      </section>

      <aside className="cart-summary" aria-label="Order summary">
        <div className="cart-summary__row">
          <span>Merchandise subtotal</span>
          <strong>{subtotalLabel}</strong>
        </div>
        <section
          className="cart-paylater"
          aria-labelledby="cart-paylater-title"
        >
          <h2 id="cart-paylater-title">Pay Later with PayPal</h2>
          <p>{payLaterMessage}</p>
        </section>
        <a
          className="button button--primary"
          href={data.checkoutHref}
          onClick={(event) =>
            handleOptionalNavigation(event, onCheckoutNavigate)
          }
        >
          Go to checkout
        </a>
        <DeliveryExpressActions onExpressStart={onDeliveryExpressStart} />
        <p className="cart-pickup-hint">{data.pickupHint}</p>
      </aside>
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
  readonly onExpressStart?:
    | ((method: DeliveryExpressPaymentMethod) => void)
    | undefined;
}

export function DeliveryExpressActions({
  onExpressStart,
}: DeliveryExpressActionsProps) {
  return (
    <div className="cart-express-actions" aria-label="Delivery express payment">
      <button
        type="button"
        data-fulfillment-mode="delivery"
        onClick={() => onExpressStart?.("paypal")}
      >
        PayPal
      </button>
      <button
        type="button"
        data-fulfillment-mode="delivery"
        onClick={() => onExpressStart?.("paylater")}
      >
        Pay Later
      </button>
    </div>
  );
}
