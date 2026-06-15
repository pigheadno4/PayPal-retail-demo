import type { StorefrontShellPanels } from "../../state/storefrontState.js";
import { type DeliveryExpressPaymentMethod } from "../payments/deliveryExpress.js";
import { type MouseEvent, type ReactNode } from "react";
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
} from "./cartModel.js";
import { DeliveryExpressActions } from "./CartPage.js";

export interface MinicartShellProps {
  readonly state: StorefrontShellPanels["minicart"];
  readonly cart?: CartData;
  readonly onCartNavigate?: () => void | Promise<void>;
  readonly onCheckoutNavigate?: () => void | Promise<void>;
  readonly onClose?: () => void;
  readonly onDeliveryExpressStart?: (
    method: DeliveryExpressPaymentMethod,
  ) => void | Promise<void>;
  readonly onQuantityChange?: (
    slug: string,
    nextQuantity: number,
    cartItemId: string,
  ) => void;
  readonly renderDeliveryExpressAction?: (
    method: DeliveryExpressPaymentMethod,
    totalLabel: string,
  ) => ReactNode;
}

export function MinicartShell({
  state,
  cart = defaultCartData,
  onCartNavigate,
  onCheckoutNavigate,
  onClose,
  onDeliveryExpressStart,
  onQuantityChange,
  renderDeliveryExpressAction,
}: MinicartShellProps) {
  const itemCount = calculateCartItemCount(cart);
  const itemCountLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;
  const subtotalLabel = formatCartAmount(
    calculateCartMerchandiseTotalCents(cart),
    cart,
  );

  function updateQuantity(item: CartItem, nextQuantity: number) {
    onQuantityChange?.(item.slug, nextQuantity, resolveCartItemServerId(item));
  }

  return (
    <aside
      className="minicart-shell"
      aria-label="Minicart"
      aria-hidden={state === "closed"}
      data-panel-state={state}
    >
      <header className="minicart-shell__header">
        <h2>Cart</h2>
        <span>{itemCountLabel}</span>
        {onClose ? (
          <button type="button" aria-label="Close minicart" onClick={onClose}>
            Close
          </button>
        ) : null}
      </header>
      <div className="minicart-shell__body">
        <ul className="minicart-items">
          {cart.items.map((item) => {
            const quantity = resolveCartItemQuantity(item);

            return (
              <li className="minicart-item" key={item.slug}>
                <a href={item.href}>
                  <img src={item.imagePath} alt={item.imageAlt} />
                </a>
                <div className="minicart-item__details">
                  <a href={item.href}>{item.name}</a>
                  <small>
                    Qty {quantity} · {item.currentPriceLabel}
                  </small>
                  {item.unavailableReason ? (
                    <small>{item.unavailableReason}</small>
                  ) : null}
                  <div className="cart-quantity minicart-item__quantity">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name} quantity`}
                      disabled={!onQuantityChange || quantity <= 0}
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
                      disabled={
                        !onQuantityChange || quantity >= item.maxQuantity
                      }
                      onClick={() => updateQuantity(item, quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <section
          className="minicart-paylater"
          aria-labelledby="minicart-paylater-title"
        >
          <h3 id="minicart-paylater-title">Pay Later with PayPal</h3>
          <p>{buildCartPayLaterMessage(cart)}</p>
        </section>
        <div className="minicart-actions">
          <a
            className="button button--secondary"
            href={cart.cartHref}
            onClick={(event) => handleOptionalNavigation(event, onCartNavigate)}
          >
            View cart
          </a>
          <a
            className="button button--primary"
            href={cart.checkoutHref}
            onClick={(event) =>
              handleOptionalNavigation(event, onCheckoutNavigate)
            }
          >
            Checkout
          </a>
        </div>
        {state === "open" ? (
          <DeliveryExpressActions
            totalLabel={subtotalLabel}
            {...(onDeliveryExpressStart
              ? { onExpressStart: onDeliveryExpressStart }
              : {})}
            {...(renderDeliveryExpressAction
              ? { renderAction: renderDeliveryExpressAction }
              : {})}
          />
        ) : null}
        <p className="cart-pickup-hint">{cart.pickupHint}</p>
      </div>
    </aside>
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
