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
  readonly cartPublicId?: string;
  readonly cartClientSecret?: string;
  readonly title: string;
  readonly checkoutHref: string;
  readonly cartHref: string;
  readonly currencyCode: string;
  readonly locale: string;
  readonly pickupHint: string;
  readonly items: readonly CartItem[];
}

export interface CartProductInput {
  readonly productId?: string;
  readonly slug: string;
  readonly name: string;
  readonly categoryName: string;
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly unitPriceCents: number;
  readonly currentPriceLabel: string;
  readonly regularPriceLabel: string;
  readonly maxQuantity?: number;
  readonly href?: string;
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
    readonly cart_public_id?: string;
    readonly buyer_kind?: "authenticated" | "guest";
    readonly binding?: {
      readonly cart_public_id?: string;
      readonly cart_client_secret?: string;
    } | null;
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
  const apiCartPublicId =
    nonEmptyString(response.cart?.binding?.cart_public_id) ??
    nonEmptyString(response.cart?.cart_public_id);
  const cartPublicId = apiCartPublicId ?? cart.cartPublicId;
  const isAuthenticatedCart = response.cart?.buyer_kind === "authenticated";
  const apiCartClientSecret = nonEmptyString(
    response.cart?.binding?.cart_client_secret,
  );
  const didApiSwitchGuestCart = Boolean(
    apiCartPublicId &&
    cart.cartPublicId &&
    apiCartPublicId !== cart.cartPublicId,
  );
  const cartClientSecret = isAuthenticatedCart
    ? undefined
    : (apiCartClientSecret ??
      (didApiSwitchGuestCart ? undefined : cart.cartClientSecret));
  const baseCart: CartData = isAuthenticatedCart
    ? {
        ...(cart.cartPublicId ? { cartPublicId: cart.cartPublicId } : {}),
        title: cart.title,
        checkoutHref: cart.checkoutHref,
        cartHref: cart.cartHref,
        currencyCode: cart.currencyCode,
        locale: cart.locale,
        pickupHint: cart.pickupHint,
        items: cart.items,
      }
    : cart;
  const nextCartBase = cartClientSecret
    ? baseCart
    : removeCartClientSecret(baseCart);
  const nextCart = {
    ...nextCartBase,
    ...(cartPublicId ? { cartPublicId } : {}),
    ...(cartClientSecret ? { cartClientSecret } : {}),
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

function removeCartClientSecret(cart: CartData): CartData {
  return {
    ...(cart.cartPublicId ? { cartPublicId: cart.cartPublicId } : {}),
    title: cart.title,
    checkoutHref: cart.checkoutHref,
    cartHref: cart.cartHref,
    currencyCode: cart.currencyCode,
    locale: cart.locale,
    pickupHint: cart.pickupHint,
    items: cart.items,
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

export function addProductToCartQuantity(
  cart: CartData,
  product: CartProductInput,
  quantityDelta: number,
): CartData {
  const requestedQuantity = Number.isFinite(quantityDelta)
    ? Math.trunc(quantityDelta)
    : 1;

  if (requestedQuantity <= 0) {
    return cart;
  }

  const existingItem = cart.items.find(
    (cartItem) => cartItem.slug === product.slug,
  );

  if (existingItem) {
    const nextMaxQuantity = Math.max(
      existingItem.maxQuantity,
      product.maxQuantity ?? existingItem.maxQuantity,
      existingItem.quantity + requestedQuantity,
    );
    const cartWithUpdatedLimit = {
      ...cart,
      items: cart.items.map((item) =>
        item.slug === product.slug
          ? {
              ...item,
              maxQuantity: nextMaxQuantity,
            }
          : item,
      ),
    };

    return setCartItemQuantity(
      cartWithUpdatedLimit,
      product.slug,
      existingItem.quantity + requestedQuantity,
    );
  }

  const maxQuantity = Math.max(product.maxQuantity ?? requestedQuantity, 1);
  const quantity = Math.min(requestedQuantity, maxQuantity);

  return {
    ...cart,
    items: [
      ...cart.items,
      {
        id: `local_${product.slug}`,
        ...(product.productId ? { productId: product.productId } : {}),
        slug: product.slug,
        name: product.name,
        categoryName: product.categoryName,
        imagePath: product.imagePath,
        imageAlt: product.imageAlt,
        unitPriceCents: product.unitPriceCents,
        currentPriceLabel: product.currentPriceLabel,
        regularPriceLabel: product.regularPriceLabel,
        quantity,
        maxQuantity,
        href: product.href ?? `/products/${product.slug}`,
      },
    ],
  };
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
  const hasApiSlug = Boolean(nonEmptyString(apiItem.slug));
  const hasApiName = Boolean(nonEmptyString(apiItem.name));
  const hasApiPrice = typeof apiItem.unit_price_minor === "number";

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
    imageAlt:
      hasApiName || nonEmptyString(apiItem.image_path)
        ? `${name} collectible`
        : (existingItem?.imageAlt ?? `${name} collectible`),
    unitPriceCents,
    currentPriceLabel,
    regularPriceLabel: hasApiPrice
      ? currentPriceLabel
      : (existingItem?.regularPriceLabel ?? currentPriceLabel),
    quantity,
    maxQuantity: Math.max(existingItem?.maxQuantity ?? quantity, quantity),
    href: hasApiSlug
      ? `/products/${slug}`
      : (existingItem?.href ?? `/products/${slug}`),
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
  cartPublicId: "cart_public_guest",
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
