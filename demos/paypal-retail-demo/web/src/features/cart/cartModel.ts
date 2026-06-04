export interface CartItem {
  readonly slug: string;
  readonly name: string;
  readonly categoryName: string;
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly unitPriceCents: number;
  readonly currentPriceLabel: string;
  readonly regularPriceLabel: string;
  readonly quantity: number;
  readonly maxQuantity: number;
  readonly href: string;
}

export interface CartData {
  readonly title: string;
  readonly checkoutHref: string;
  readonly cartHref: string;
  readonly currencyCode: string;
  readonly locale: string;
  readonly pickupHint: string;
  readonly items: readonly CartItem[];
}

export type CartQuantityOverrides = Readonly<Record<string, number>>;

export function calculateCartMerchandiseTotalCents(
  cart: CartData,
  quantityOverrides: CartQuantityOverrides = {},
): number {
  return cart.items.reduce((total, item) => {
    const quantity = resolveCartItemQuantity(item, quantityOverrides);

    return total + item.unitPriceCents * quantity;
  }, 0);
}

export function calculateCartItemCount(
  cart: CartData,
  quantityOverrides: CartQuantityOverrides = {},
): number {
  return cart.items.reduce(
    (total, item) => total + resolveCartItemQuantity(item, quantityOverrides),
    0,
  );
}

export function buildCartPayLaterMessage(
  cart: CartData,
  quantityOverrides: CartQuantityOverrides = {},
): string {
  const amount = formatCartAmount(
    calculateCartMerchandiseTotalCents(cart, quantityOverrides),
    cart,
  );

  return `Flexible payment options may be available for ${amount} at checkout.`;
}

export function formatCartAmount(amountCents: number, cart: CartData): string {
  return new Intl.NumberFormat(cart.locale, {
    currency: cart.currencyCode,
    style: "currency",
  }).format(amountCents / 100);
}

export function resolveCartItemQuantity(
  item: CartItem,
  quantityOverrides: CartQuantityOverrides = {},
): number {
  const requestedQuantity = quantityOverrides[item.slug] ?? item.quantity;
  const normalizedQuantity = Number.isFinite(requestedQuantity)
    ? Math.trunc(requestedQuantity)
    : item.quantity;

  return Math.min(Math.max(normalizedQuantity, 0), item.maxQuantity);
}

export const defaultCartData: CartData = {
  title: "Shopping cart",
  checkoutHref: "/checkout",
  cartHref: "/cart",
  currencyCode: "USD",
  locale: "en-US",
  pickupHint: "Prefer pickup? Choose store pickup during checkout.",
  items: [
    {
      slug: "labubu-have-a-seat",
      name: "Labubu Have a Seat",
      categoryName: "Blind Boxes",
      imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
      imageAlt: "Labubu Have a Seat collectible",
      unitPriceCents: 1299,
      currentPriceLabel: "$12.99",
      regularPriceLabel: "$13.99",
      quantity: 1,
      maxQuantity: 5,
      href: "/products/labubu-have-a-seat",
    },
    {
      slug: "hirono-little-mischief",
      name: "Hirono Little Mischief",
      categoryName: "Plush",
      imagePath: "/assets/popmart/products/hirono-little-mischief-1.svg",
      imageAlt: "Hirono Little Mischief collectible",
      unitPriceCents: 1299,
      currentPriceLabel: "$12.99",
      regularPriceLabel: "$12.99",
      quantity: 1,
      maxQuantity: 3,
      href: "/products/hirono-little-mischief",
    },
  ],
};
