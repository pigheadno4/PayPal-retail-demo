import type { StorefrontShellPanels } from "../../state/storefrontState.js";
import { type MouseEvent, type ReactNode } from "react";
import { XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import { type DeliveryExpressPaymentMethod } from "../payments/deliveryExpress.js";
import { PayPalPaymentFrame } from "../payments/PayPalPaymentFrame.js";
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
import { CartSummaryBreakdown } from "./CartSummaryBreakdown.js";
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
  readonly renderPayLaterMessage?: (
    totalLabel: string,
    fallbackMessage: string,
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
  renderPayLaterMessage,
}: MinicartShellProps) {
  const itemCount = calculateCartItemCount(cart);
  const hasCheckoutItems = itemCount > 0;
  const itemCountLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;
  const subtotalLabel = formatCartAmount(
    calculateCartMerchandiseTotalCents(cart),
    cart,
  );
  const payLaterMessage = buildCartPayLaterMessage(cart);

  function updateQuantity(item: CartItem, nextQuantity: number) {
    onQuantityChange?.(item.slug, nextQuantity, resolveCartItemServerId(item));
  }

  return (
    <Sheet
      open={state === "open"}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose?.();
        }
      }}
    >
      <SheetContent
        forceMount
        side="right"
        className="minicart-shell"
        overlayClassName="minicart-shell__overlay"
        aria-label="Minicart"
        aria-hidden={state === "closed"}
        data-panel-state={state}
        data-visual-separation="minicart-drawer"
        showCloseButton={false}
        {...(state === "closed" ? { inert: true } : {})}
      >
        <SheetHeader className="minicart-shell__header">
          <SheetTitle>Cart</SheetTitle>
          <SheetDescription>{itemCountLabel}</SheetDescription>
          {onClose ? (
            <SheetClose asChild>
              <Button
                type="button"
                aria-label="Close minicart"
                className="minicart-shell__close"
                variant="outline"
                onClick={onClose}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </SheetClose>
          ) : null}
        </SheetHeader>
        <div className="minicart-shell__body">
          <ScrollArea
            className="minicart-items-panel"
            aria-label="Minicart items"
          >
            {cart.items.length > 0 ? (
              <ul className="minicart-items">
                {cart.items.map((item) => {
                  const quantity = resolveCartItemQuantity(item);

                  return (
                    <li className="minicart-item" key={item.slug}>
                      <a href={item.href}>
                        <img
                          src={item.imagePath}
                          alt={item.imageAlt}
                          loading="lazy"
                        />
                      </a>
                      <div className="minicart-item__details">
                        <a href={item.href}>{item.name}</a>
                        <Badge
                          className="minicart-item__category"
                          variant="secondary"
                        >
                          {item.categoryName}
                        </Badge>
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
            ) : (
              <section className="minicart-empty-state">
                <strong>Your cart is empty</strong>
                <p>Add a collectible to unlock checkout and PayPal options.</p>
                <Button
                  asChild
                  className="button button--secondary"
                  variant="outline"
                >
                  <a href="/products">Browse drops</a>
                </Button>
              </section>
            )}
          </ScrollArea>
          {hasCheckoutItems ? (
            <section
              className="minicart-checkout-panel"
              aria-label="Minicart checkout"
            >
              <section
                className="minicart-summary"
                aria-label="Minicart summary"
              >
                <CartSummaryBreakdown
                  density="compact"
                  subtotalLabel={subtotalLabel}
                />
              </section>
              <div className="minicart-actions">
                <Button asChild className="button button--primary">
                  <a
                    href={cart.checkoutHref}
                    onClick={(event) =>
                      handleOptionalNavigation(event, onCheckoutNavigate)
                    }
                  >
                    Checkout
                  </a>
                </Button>
                <Button
                  asChild
                  className="button button--secondary"
                  variant="outline"
                >
                  <a
                    href={cart.cartHref}
                    onClick={(event) =>
                      handleOptionalNavigation(event, onCartNavigate)
                    }
                  >
                    View cart
                  </a>
                </Button>
              </div>
              <section
                className="minicart-paylater"
                aria-labelledby="minicart-paylater-title"
              >
                <h3 id="minicart-paylater-title">Pay Later with PayPal</h3>
                {state === "open" && renderPayLaterMessage ? (
                  renderPayLaterMessage(subtotalLabel, payLaterMessage)
                ) : (
                  <p>{payLaterMessage}</p>
                )}
              </section>
              {state === "open" ? (
                <PayPalPaymentFrame className="cart-paypal-frame cart-paypal-frame--mini">
                  <DeliveryExpressActions
                    className="cart-express-actions--stacked"
                    totalLabel={subtotalLabel}
                    {...(onDeliveryExpressStart
                      ? { onExpressStart: onDeliveryExpressStart }
                      : {})}
                    {...(renderDeliveryExpressAction
                      ? { renderAction: renderDeliveryExpressAction }
                      : {})}
                  />
                </PayPalPaymentFrame>
              ) : null}
              <p className="cart-pickup-hint">{cart.pickupHint}</p>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
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
