export interface CartItem {
  readonly id?: string;
  readonly productId?: string;
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
  readonly checkoutEligible?: boolean;
  readonly unavailableReason?: string;
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

export interface CartApiResponseItem {
  readonly id?: string;
  readonly product_id?: string;
  readonly slug?: string;
  readonly name?: string;
  readonly image_path?: string | null;
  readonly quantity?: number;
  readonly unit_price_minor?: number;
  readonly line_subtotal_minor?: number;
  readonly checkout_eligible?: boolean;
}

export interface CartApiResponseAdjustment {
  readonly type?: string;
  readonly product_id?: string;
  readonly reason?: string;
}

export interface CartApiResponse {
  readonly cart?: {
    readonly currency_code?: string;
    readonly items?: readonly CartApiResponseItem[];
  };
  readonly adjustments?: readonly CartApiResponseAdjustment[];
}

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

export function resolveCartItemServerId(item: CartItem): string {
  return item.id ?? item.slug;
}

export function reconcileCartDataFromApiResponse(
  cart: CartData,
  response: CartApiResponse,
): CartData {
  const apiItems = response.cart?.items;

  if (!Array.isArray(apiItems)) {
    return cart;
  }

  const currencyCode = response.cart?.currency_code ?? cart.currencyCode;
  const nextCart = {
    ...cart,
    currencyCode,
  };
  const existingItems = indexExistingCartItems(cart.items);
  const blockersByProductId = new Map(
    (response.adjustments ?? [])
      .filter(
        (adjustment) =>
          adjustment.type === "checkout_blocked" && adjustment.product_id,
      )
      .map((adjustment) => [adjustment.product_id as string, adjustment]),
  );

  return {
    ...nextCart,
    items: apiItems.map((apiItem) =>
      mapCartApiItemToCartItem(
        nextCart,
        existingItems,
        blockersByProductId,
        apiItem,
      ),
    ),
  };
}

export function setCartItemQuantity(
  cart: CartData,
  slug: string,
  nextQuantity: number,
): CartData {
  return {
    ...cart,
    items: cart.items.map((item) =>
      item.slug === slug
        ? {
            ...item,
            quantity: resolveCartItemQuantity(item, {
              [slug]: nextQuantity,
            }),
          }
        : item,
    ),
  };
}

export function incrementCartItemQuantity(
  cart: CartData,
  slug: string,
): CartData {
  const item = cart.items.find((cartItem) => cartItem.slug === slug);

  return item ? setCartItemQuantity(cart, slug, item.quantity + 1) : cart;
}

function indexExistingCartItems(
  items: readonly CartItem[],
): Map<string, CartItem> {
  const index = new Map<string, CartItem>();

  for (const item of items) {
    for (const key of [item.id, item.productId, item.slug]) {
      if (key) {
        index.set(key, item);
      }
    }
  }

  return index;
}

function mapCartApiItemToCartItem(
  cart: CartData,
  existingItems: ReadonlyMap<string, CartItem>,
  blockersByProductId: ReadonlyMap<string, CartApiResponseAdjustment>,
  apiItem: CartApiResponseItem,
): CartItem {
  const existingItem = findExistingCartItem(existingItems, apiItem);
  const productId = nonEmptyString(apiItem.product_id);
  const slug =
    nonEmptyString(apiItem.slug) ??
    existingItem?.slug ??
    productId ??
    "unknown-product";
  const name = nonEmptyString(apiItem.name) ?? existingItem?.name ?? slug;
  const unitPriceCents =
    typeof apiItem.unit_price_minor === "number"
      ? apiItem.unit_price_minor
      : (existingItem?.unitPriceCents ?? 0);
  const quantity =
    typeof apiItem.quantity === "number" && Number.isFinite(apiItem.quantity)
      ? Math.max(0, Math.trunc(apiItem.quantity))
      : (existingItem?.quantity ?? 0);
  const currentPriceLabel = formatCartAmount(unitPriceCents, cart);
  const checkoutEligible = apiItem.checkout_eligible !== false;
  const blocker = productId ? blockersByProductId.get(productId) : undefined;

  return {
    ...(apiItem.id
      ? { id: apiItem.id }
      : existingItem?.id
        ? { id: existingItem.id }
        : {}),
    ...(productId
      ? { productId }
      : existingItem?.productId
        ? { productId: existingItem.productId }
        : {}),
    slug,
    name,
    categoryName: existingItem?.categoryName ?? "Collectibles",
    imagePath:
      nonEmptyString(apiItem.image_path) ??
      existingItem?.imagePath ??
      "/assets/generic/products/placeholder.svg",
    imageAlt: existingItem?.imageAlt ?? `${name} collectible`,
    unitPriceCents,
    currentPriceLabel,
    regularPriceLabel: existingItem?.regularPriceLabel ?? currentPriceLabel,
    quantity,
    maxQuantity: Math.max(existingItem?.maxQuantity ?? quantity, quantity),
    href: existingItem?.href ?? `/products/${slug}`,
    checkoutEligible,
    ...(!checkoutEligible
      ? {
          unavailableReason: formatCartBlockerReason(blocker?.reason),
        }
      : {}),
  };
}

function findExistingCartItem(
  existingItems: ReadonlyMap<string, CartItem>,
  apiItem: CartApiResponseItem,
): CartItem | undefined {
  for (const key of [apiItem.id, apiItem.product_id, apiItem.slug]) {
    const item = key ? existingItems.get(key) : undefined;

    if (item) {
      return item;
    }
  }

  return undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function formatCartBlockerReason(reason: string | undefined): string {
  if (reason === "missing_rule") {
    return "This item needs a cart refresh before checkout.";
  }

  return "This item is not available for checkout yet.";
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
      id: "cart_item_labubu",
      productId: "product_labubu",
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
      id: "cart_item_hirono",
      productId: "product_hirono",
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
