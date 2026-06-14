import type { StorefrontShellPanels } from "../../state/storefrontState.js";
import { type DeliveryExpressPaymentMethod } from "../payments/deliveryExpress.js";
import { type MouseEvent, type ReactNode } from "react";
import {
  buildCartPayLaterMessage,
  calculateCartItemCount,
  defaultCartData,
  type CartData,
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
  readonly renderDeliveryExpressAction?: (
    method: DeliveryExpressPaymentMethod,
  ) => ReactNode;
}

export function MinicartShell({
  state,
  cart = defaultCartData,
  onCartNavigate,
  onCheckoutNavigate,
  onClose,
  onDeliveryExpressStart,
  renderDeliveryExpressAction,
}: MinicartShellProps) {
  const itemCount = calculateCartItemCount(cart);
  const itemCountLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;

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
          {cart.items.map((item) => (
            <li className="minicart-item" key={item.slug}>
              <a href={item.href}>
                <img src={item.imagePath} alt={item.imageAlt} />
              </a>
              <span>
                <a href={item.href}>{item.name}</a>
                <small>
                  Qty {item.quantity} · {item.currentPriceLabel}
                </small>
                {item.unavailableReason ? (
                  <small>{item.unavailableReason}</small>
                ) : null}
              </span>
            </li>
          ))}
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
