import type { StorefrontShellPanels } from "../../state/storefrontState.js";
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
}

export function MinicartShell({
  state,
  cart = defaultCartData,
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
          <a className="button button--secondary" href={cart.cartHref}>
            View cart
          </a>
          <a className="button button--primary" href={cart.checkoutHref}>
            Checkout
          </a>
        </div>
        <DeliveryExpressActions />
        <p className="cart-pickup-hint">{cart.pickupHint}</p>
      </div>
    </aside>
  );
}
