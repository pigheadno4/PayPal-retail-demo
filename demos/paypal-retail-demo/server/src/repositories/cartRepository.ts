import { createHash, randomBytes, randomUUID } from "node:crypto";

import {
  mergeCartLines,
  refreshCartLines,
  type CartAdjustment,
  type CartLine,
  type CartLineRule,
} from "../../../shared/src/cart.js";
import {
  getProductPurchaseState,
  type ProductReleaseStatus,
} from "../../../shared/src/catalog.js";
import type {
  AddCartItemInput,
  CartApiResponse,
  CartOperationContext,
  CartRepository,
  RemoveCartItemInput,
  UpdateCartItemInput,
} from "../routes/cart.js";
import type { CatalogJson } from "../routes/catalog.js";

type RepositoryNow = Date | string | (() => Date | string);

export interface CartProfileRow {
  readonly id: string;
  readonly slug: string;
}

export interface CartMarketRow {
  readonly id: string;
  readonly code: string;
  readonly currency_code: string;
}

export interface CartRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly auth_user_id: string | null;
  readonly cart_public_id: string;
  readonly cart_secret_hash: string | null;
  readonly status: "active" | "merged" | "abandoned" | "converted";
  readonly last_seen_at: string;
}

export interface CartItemRow {
  readonly id: string;
  readonly cart_id: string;
  readonly product_id: string;
  readonly quantity: number;
  readonly unit_price_minor_snapshot: number;
  readonly updated_at: string;
}

export interface CartProductRuleRow {
  readonly product_id: string;
  readonly slug: string;
  readonly name: string;
  readonly image_path: string | null;
  readonly currency_code: string;
  readonly current_price_minor: number;
  readonly max_quantity_per_order: number;
  readonly is_purchasable: boolean;
}

export interface CartItemWriteInput {
  readonly id?: string;
  readonly product_id: string;
  readonly quantity: number;
  readonly unit_price_minor_snapshot: number;
  readonly updated_at: string;
}

export interface CreateCartInput {
  readonly profileId: string;
  readonly marketId: string;
  readonly authUserId: string | null;
  readonly cartPublicId: string;
  readonly cartSecretHash: string | null;
  readonly now: string;
}

export interface CartDataSource {
  readonly getProfileBySlug: (slug: string) => Promise<CartProfileRow | null>;
  readonly getMarketByCode: (code: string) => Promise<CartMarketRow | null>;
  readonly findActiveGuestCart: (
    cartPublicId: string,
  ) => Promise<CartRow | null>;
  readonly findActiveSignedInCart: (input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly authUserId: string;
  }) => Promise<CartRow | null>;
  readonly createCart: (input: CreateCartInput) => Promise<CartRow>;
  readonly touchCart: (cartId: string, now: string) => Promise<void>;
  readonly listCartItems: (cartId: string) => Promise<readonly CartItemRow[]>;
  readonly listProductRules: (input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly productIds: readonly string[];
    readonly at: string;
  }) => Promise<readonly CartProductRuleRow[]>;
  readonly replaceCartItems: (
    cartId: string,
    items: readonly CartItemWriteInput[],
  ) => Promise<readonly CartItemRow[]>;
  readonly markCartMerged: (cartId: string) => Promise<void>;
}

export interface CreateSupabaseCartRepositoryInput {
  readonly dataSource: CartDataSource;
  readonly now?: RepositoryNow;
  readonly createCartPublicId?: () => string;
  readonly createCartClientSecret?: () => string;
  readonly hashCartClientSecret?: (secret: string) => string;
}

interface CartRepositoryDependencies {
  readonly dataSource: CartDataSource;
  readonly now?: RepositoryNow;
  readonly createCartPublicId: () => string;
  readonly createCartClientSecret: () => string;
  readonly hashCartClientSecret: (secret: string) => string;
}

interface ResolvedActiveCart {
  readonly profile: CartProfileRow;
  readonly market: CartMarketRow;
  readonly cart: CartRow;
  readonly buyerKind: "guest" | "authenticated";
  readonly binding: CartBindingDto | null;
}

interface CartBindingDto {
  readonly [key: string]: CatalogJson;
  readonly cart_public_id: string;
  readonly cart_client_secret: string;
}

export function createSupabaseCartRepository(
  input: CreateSupabaseCartRepositoryInput,
): CartRepository {
  const dependencies = {
    ...input,
    createCartPublicId: input.createCartPublicId ?? defaultCartPublicId,
    createCartClientSecret:
      input.createCartClientSecret ?? defaultCartClientSecret,
    hashCartClientSecret:
      input.hashCartClientSecret ?? defaultCartClientSecretHash,
  };

  return {
    async getActiveCart(context) {
      const resolved = await resolveActiveCart(dependencies, context);
      const items = await dependencies.dataSource.listCartItems(
        resolved.cart.id,
      );
      const rules = await listRulesForItems(dependencies, resolved, items);

      return mapCartResponse({
        ...resolved,
        items,
        rules,
        adjustments: [],
      });
    },
    async addItem(context, itemInput) {
      const resolved = await resolveActiveCart(dependencies, context);
      const existingItems = await dependencies.dataSource.listCartItems(
        resolved.cart.id,
      );
      const rules = await dependencies.dataSource.listProductRules({
        profileId: resolved.profile.id,
        marketId: resolved.market.id,
        productIds: uniqueProductIds([
          ...existingItems.map((item) => item.product_id),
          itemInput.productId,
        ]),
        at: resolveNow(dependencies.now),
      });
      const rule = findRule(rules, itemInput.productId);

      assertProductCanBeAdded(rule, itemInput.productId);

      const { itemWrites, adjustments } = buildAddItemWrites({
        existingItems,
        input: itemInput,
        rule,
        now: resolveNow(dependencies.now),
      });
      const items = await dependencies.dataSource.replaceCartItems(
        resolved.cart.id,
        itemWrites,
      );

      return mapCartResponse({
        ...resolved,
        items,
        rules,
        adjustments,
      });
    },
    async updateItem(context, itemInput) {
      const resolved = await resolveActiveCart(dependencies, context);
      const existingItems = await dependencies.dataSource.listCartItems(
        resolved.cart.id,
      );
      const existingItem = existingItems.find(
        (item) => item.id === itemInput.itemId,
      );

      if (!existingItem) {
        throw new Error(`Cart item ${itemInput.itemId} was not found`);
      }

      const rules = await listRulesForItems(
        dependencies,
        resolved,
        existingItems,
      );
      const rule = findRule(rules, existingItem.product_id);
      const { itemWrites, adjustments } = buildUpdateItemWrites({
        existingItems,
        input: itemInput,
        existingItem,
        rule,
        now: resolveNow(dependencies.now),
      });
      const items = await dependencies.dataSource.replaceCartItems(
        resolved.cart.id,
        itemWrites,
      );

      return mapCartResponse({
        ...resolved,
        items,
        rules,
        adjustments,
      });
    },
    async removeItem(context, itemInput) {
      const resolved = await resolveActiveCart(dependencies, context);
      const existingItems = await dependencies.dataSource.listCartItems(
        resolved.cart.id,
      );
      const itemWrites = buildRemoveItemWrites({
        existingItems,
        input: itemInput,
      });
      const items = await dependencies.dataSource.replaceCartItems(
        resolved.cart.id,
        itemWrites,
      );
      const rules = await listRulesForItems(dependencies, resolved, items);

      return mapCartResponse({
        ...resolved,
        items,
        rules,
        adjustments: [],
      });
    },
    async merge(context) {
      if (context.buyer.kind !== "authenticated" || !context.guestCart) {
        return this.getActiveCart(context);
      }

      const target = await resolveActiveCart(dependencies, {
        ...context,
        guestCart: null,
      });
      const incoming = await resolveGuestCart(dependencies, context, {
        profile: target.profile,
        market: target.market,
      });
      const [targetItems, incomingItems] = await Promise.all([
        dependencies.dataSource.listCartItems(target.cart.id),
        dependencies.dataSource.listCartItems(incoming.cart.id),
      ]);
      const productIds = uniqueProductIds([
        ...targetItems.map((item) => item.product_id),
        ...incomingItems.map((item) => item.product_id),
      ]);
      const rules = await dependencies.dataSource.listProductRules({
        profileId: target.profile.id,
        marketId: target.market.id,
        productIds,
        at: resolveNow(dependencies.now),
      });
      const mergeResult = mergeCartLines({
        targetContext: cartContext(target),
        incomingContext: cartContext(incoming),
        targetLines: mapRowsToCartLines(
          targetItems,
          target.market.currency_code,
        ),
        incomingLines: mapRowsToCartLines(
          incomingItems,
          incoming.market.currency_code,
        ),
        rules: mapRulesToCartLineRules(rules),
      });
      const refreshResult = refreshCartLines({
        lines: mergeResult.lines,
        rules: mapRulesToCartLineRules(rules),
        refreshedAt: resolveNow(dependencies.now),
      });
      const items = await dependencies.dataSource.replaceCartItems(
        target.cart.id,
        mapLinesToWrites(
          refreshResult.lines,
          targetItems,
          resolveNow(dependencies.now),
        ),
      );
      await dependencies.dataSource.markCartMerged(incoming.cart.id);

      return mapCartResponse({
        ...target,
        items,
        rules,
        adjustments: [...mergeResult.adjustments, ...refreshResult.adjustments],
      });
    },
    async refresh(context, refreshInput) {
      const resolved = await resolveActiveCart(dependencies, context);
      const existingItems = await dependencies.dataSource.listCartItems(
        resolved.cart.id,
      );
      const rules = await listRulesForItems(
        dependencies,
        resolved,
        existingItems,
      );
      const result = refreshCartLines({
        lines: mapRowsToCartLines(existingItems, resolved.market.currency_code),
        rules: mapRulesToCartLineRules(rules),
        refreshedAt: resolveNow(dependencies.now),
      });
      const items = await dependencies.dataSource.replaceCartItems(
        resolved.cart.id,
        mapLinesToWrites(
          result.lines,
          existingItems,
          resolveNow(dependencies.now),
        ),
      );

      void refreshInput;

      return mapCartResponse({
        ...resolved,
        items,
        rules,
        adjustments: result.adjustments,
      });
    },
  };
}

function buildAddItemWrites(input: {
  readonly existingItems: readonly CartItemRow[];
  readonly input: AddCartItemInput;
  readonly rule: CartProductRuleRow;
  readonly now: string;
}): {
  readonly itemWrites: readonly CartItemWriteInput[];
  readonly adjustments: readonly CartAdjustment[];
} {
  const existingItem = input.existingItems.find(
    (item) => item.product_id === input.input.productId,
  );
  const requestedQuantity =
    (existingItem?.quantity ?? 0) + input.input.quantity;
  const finalQuantity = Math.min(
    requestedQuantity,
    input.rule.max_quantity_per_order,
  );
  const itemWrites = input.existingItems
    .filter((item) => item.product_id !== input.input.productId)
    .map((item) => itemRowToWrite(item));
  const write: CartItemWriteInput = {
    ...(existingItem ? { id: existingItem.id } : {}),
    product_id: input.input.productId,
    quantity: finalQuantity,
    unit_price_minor_snapshot: input.rule.current_price_minor,
    updated_at: input.now,
  };
  const adjustments =
    finalQuantity === requestedQuantity
      ? []
      : [
          {
            type: "quantity_capped" as const,
            productId: input.input.productId,
            optionKey: null,
            requestedQuantity,
            finalQuantity,
            maxQuantity: input.rule.max_quantity_per_order,
          },
        ];

  return {
    itemWrites: [...itemWrites, write],
    adjustments,
  };
}

function buildUpdateItemWrites(input: {
  readonly existingItems: readonly CartItemRow[];
  readonly input: UpdateCartItemInput;
  readonly existingItem: CartItemRow;
  readonly rule: CartProductRuleRow | null;
  readonly now: string;
}): {
  readonly itemWrites: readonly CartItemWriteInput[];
  readonly adjustments: readonly CartAdjustment[];
} {
  const maxQuantity =
    input.rule?.max_quantity_per_order ?? input.input.quantity;
  const finalQuantity = Math.min(input.input.quantity, maxQuantity);
  const adjustments =
    finalQuantity === input.input.quantity
      ? []
      : [
          {
            type: "quantity_capped" as const,
            productId: input.existingItem.product_id,
            optionKey: null,
            requestedQuantity: input.input.quantity,
            finalQuantity,
            maxQuantity,
          },
        ];

  return {
    itemWrites: input.existingItems.map((item) =>
      item.id === input.input.itemId
        ? {
            id: item.id,
            product_id: item.product_id,
            quantity: finalQuantity,
            unit_price_minor_snapshot:
              input.rule?.is_purchasable === true
                ? input.rule.current_price_minor
                : item.unit_price_minor_snapshot,
            updated_at: input.now,
          }
        : itemRowToWrite(item),
    ),
    adjustments,
  };
}

function buildRemoveItemWrites(input: {
  readonly existingItems: readonly CartItemRow[];
  readonly input: RemoveCartItemInput;
}): readonly CartItemWriteInput[] {
  return input.existingItems
    .filter((item) => item.id !== input.input.itemId)
    .map((item) => itemRowToWrite(item));
}

async function resolveActiveCart(
  input: CartRepositoryDependencies,
  context: CartOperationContext,
): Promise<ResolvedActiveCart> {
  const [profile, market] = await Promise.all([
    input.dataSource.getProfileBySlug(context.storefrontContext.profileSlug),
    input.dataSource.getMarketByCode(context.storefrontContext.marketCode),
  ]);

  if (!profile || !market) {
    throw new Error(
      `Storefront context not found for profile ${context.storefrontContext.profileSlug} and market ${context.storefrontContext.marketCode}`,
    );
  }

  if (context.buyer.kind === "authenticated") {
    const existingCart = await input.dataSource.findActiveSignedInCart({
      profileId: profile.id,
      marketId: market.id,
      authUserId: context.buyer.userId,
    });
    const cart =
      existingCart ??
      (
        await createCart(input, {
          profile,
          market,
          authUserId: context.buyer.userId,
          isGuest: false,
        })
      ).cart;

    await input.dataSource.touchCart(cart.id, resolveNow(input.now));

    return {
      profile,
      market,
      cart,
      buyerKind: "authenticated",
      binding: null,
    };
  }

  return resolveGuestCart(input, context, { profile, market });
}

async function resolveGuestCart(
  input: CartRepositoryDependencies,
  context: CartOperationContext,
  storefrontRows: Pick<ResolvedActiveCart, "profile" | "market">,
): Promise<ResolvedActiveCart> {
  if (context.guestCart) {
    const existingCart = await input.dataSource.findActiveGuestCart(
      context.guestCart.cartPublicId,
    );

    if (existingCart) {
      verifyGuestCartSecret(
        input,
        existingCart,
        context.guestCart.cartClientSecret,
      );
    }

    if (
      existingCart &&
      existingCart.profile_id === storefrontRows.profile.id &&
      existingCart.market_id === storefrontRows.market.id
    ) {
      await input.dataSource.touchCart(existingCart.id, resolveNow(input.now));
      return {
        ...storefrontRows,
        cart: existingCart,
        buyerKind: "guest",
        binding: null,
      };
    }
  }

  const created = await createCart(input, {
    ...storefrontRows,
    authUserId: null,
    isGuest: true,
  });

  return {
    ...storefrontRows,
    cart: created.cart,
    buyerKind: "guest",
    binding: created.binding,
  };
}

async function createCart(
  input: CartRepositoryDependencies,
  options: Pick<ResolvedActiveCart, "profile" | "market"> & {
    readonly authUserId: string | null;
    readonly isGuest: boolean;
  },
): Promise<{
  readonly cart: CartRow;
  readonly binding: CartBindingDto | null;
}> {
  const cartPublicId = input.createCartPublicId();
  const cartClientSecret = options.isGuest
    ? input.createCartClientSecret()
    : null;
  const cart = await input.dataSource.createCart({
    profileId: options.profile.id,
    marketId: options.market.id,
    authUserId: options.authUserId,
    cartPublicId,
    cartSecretHash: cartClientSecret
      ? input.hashCartClientSecret(cartClientSecret)
      : null,
    now: resolveNow(input.now),
  });

  return {
    cart,
    binding: cartClientSecret
      ? {
          cart_public_id: cart.cart_public_id,
          cart_client_secret: cartClientSecret,
        }
      : null,
  };
}

async function listRulesForItems(
  input: CartRepositoryDependencies,
  resolved: Pick<ResolvedActiveCart, "profile" | "market">,
  items: readonly CartItemRow[],
): Promise<readonly CartProductRuleRow[]> {
  return input.dataSource.listProductRules({
    profileId: resolved.profile.id,
    marketId: resolved.market.id,
    productIds: uniqueProductIds(items.map((item) => item.product_id)),
    at: resolveNow(input.now),
  });
}

function mapCartResponse(
  input: ResolvedActiveCart & {
    readonly items: readonly CartItemRow[];
    readonly rules: readonly CartProductRuleRow[];
    readonly adjustments: readonly CartAdjustment[];
  },
): CartApiResponse {
  const rulesByProductId = new Map(
    input.rules.map((rule) => [rule.product_id, rule]),
  );
  const items = input.items.map((item) => {
    const rule = rulesByProductId.get(item.product_id);
    const lineSubtotal = item.unit_price_minor_snapshot * item.quantity;

    return {
      id: item.id,
      product_id: item.product_id,
      slug: rule?.slug ?? item.product_id,
      name: rule?.name ?? item.product_id,
      image_path: rule?.image_path ?? null,
      quantity: item.quantity,
      unit_price_minor: item.unit_price_minor_snapshot,
      line_subtotal_minor: lineSubtotal,
      checkout_eligible: rule?.is_purchasable ?? false,
    };
  });
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.line_subtotal_minor,
    0,
  );

  return {
    cart: {
      id: input.cart.id,
      cart_public_id: input.cart.cart_public_id,
      profile_id: input.profile.id,
      market_id: input.market.id,
      buyer_kind: input.buyerKind,
      status: input.cart.status,
      currency_code: input.market.currency_code,
      items,
      totals: {
        item_count: itemCount,
        subtotal_minor: subtotal,
        currency_code: input.market.currency_code,
      },
      binding: input.binding,
    },
    adjustments: input.adjustments.map(mapCartAdjustment),
  };
}

function mapCartAdjustment(adjustment: CartAdjustment): CatalogJson {
  switch (adjustment.type) {
    case "merged":
      return {
        type: adjustment.type,
        product_id: adjustment.productId,
        option_key: adjustment.optionKey,
        target_quantity: adjustment.targetQuantity,
        incoming_quantity: adjustment.incomingQuantity,
        final_quantity: adjustment.finalQuantity,
      };
    case "appended":
      return {
        type: adjustment.type,
        product_id: adjustment.productId,
        option_key: adjustment.optionKey,
        final_quantity: adjustment.finalQuantity,
      };
    case "quantity_capped":
      return {
        type: adjustment.type,
        product_id: adjustment.productId,
        option_key: adjustment.optionKey,
        requested_quantity: adjustment.requestedQuantity,
        final_quantity: adjustment.finalQuantity,
        max_quantity: adjustment.maxQuantity,
      };
    case "price_refreshed":
      return {
        type: adjustment.type,
        product_id: adjustment.productId,
        option_key: adjustment.optionKey,
        previous_price_minor: adjustment.previousPriceMinor,
        current_price_minor: adjustment.currentPriceMinor,
      };
    case "checkout_blocked":
      return {
        type: adjustment.type,
        product_id: adjustment.productId,
        option_key: adjustment.optionKey,
        reason: adjustment.reason,
      };
  }
}

function assertProductCanBeAdded(
  rule: CartProductRuleRow | null,
  productId: string,
): asserts rule is CartProductRuleRow {
  if (!rule) {
    throw new Error(`Product ${productId} was not found for the active cart`);
  }
  if (!rule.is_purchasable) {
    throw new Error(`Product ${productId} cannot be checked out yet`);
  }
}

function verifyGuestCartSecret(
  input: CartRepositoryDependencies,
  cart: CartRow,
  cartClientSecret: string,
): void {
  if (
    !cart.cart_secret_hash ||
    cart.cart_secret_hash !== input.hashCartClientSecret(cartClientSecret)
  ) {
    throw new Error("Guest cart secret does not match");
  }
}

function mapRowsToCartLines(
  items: readonly CartItemRow[],
  currencyCode: string,
): readonly CartLine[] {
  return items.map((item) => ({
    productId: item.product_id,
    optionKey: null,
    quantity: item.quantity,
    unitPriceMinorSnapshot: item.unit_price_minor_snapshot,
    currencyCode,
    updatedAt: item.updated_at,
  }));
}

function mapRulesToCartLineRules(
  rules: readonly CartProductRuleRow[],
): readonly CartLineRule[] {
  return rules.map((rule) => ({
    productId: rule.product_id,
    optionKey: null,
    maxQuantity: rule.max_quantity_per_order,
    currentPriceMinor: rule.current_price_minor,
    currencyCode: rule.currency_code,
    isPurchasable: rule.is_purchasable,
  }));
}

function mapLinesToWrites(
  lines: readonly CartLine[],
  existingItems: readonly CartItemRow[],
  now: string,
): readonly CartItemWriteInput[] {
  const existingByProductId = new Map(
    existingItems.map((item) => [item.product_id, item]),
  );

  return lines.map((line) => {
    const existing = existingByProductId.get(line.productId);
    return {
      ...(existing ? { id: existing.id } : {}),
      product_id: line.productId,
      quantity: line.quantity,
      unit_price_minor_snapshot: line.unitPriceMinorSnapshot,
      updated_at: line.updatedAt || now,
    };
  });
}

function itemRowToWrite(item: CartItemRow): CartItemWriteInput {
  return {
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price_minor_snapshot: item.unit_price_minor_snapshot,
    updated_at: item.updated_at,
  };
}

function cartContext(input: Pick<ResolvedActiveCart, "profile" | "market">) {
  return {
    profileId: input.profile.id,
    marketId: input.market.id,
    currencyCode: input.market.currency_code,
  };
}

function uniqueProductIds(productIds: readonly string[]): readonly string[] {
  return [...new Set(productIds)];
}

function findRule(
  rules: readonly CartProductRuleRow[],
  productId: string,
): CartProductRuleRow | null {
  return rules.find((rule) => rule.product_id === productId) ?? null;
}

function resolveNow(now: RepositoryNow | undefined): string {
  const value = typeof now === "function" ? now() : now;
  const date =
    typeof value === "string" || value instanceof Date ? value : new Date();
  return date instanceof Date ? date.toISOString() : date;
}

function defaultCartPublicId(): string {
  return `cart_${randomUUID().replaceAll("-", "")}`;
}

function defaultCartClientSecret(): string {
  return `cart_secret_${randomBytes(24).toString("base64url")}`;
}

function defaultCartClientSecretHash(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

type SupabasePrimitive = string | number | boolean | null;

interface SupabaseCartError {
  readonly message: string;
}

interface SupabaseCartResult<TData> {
  readonly data: TData | null;
  readonly error: SupabaseCartError | null;
}

interface SupabaseOrderOptions {
  readonly ascending?: boolean;
}

interface SupabaseCartQuery extends PromiseLike<SupabaseCartResult<unknown>> {
  readonly select: (columns: string) => SupabaseCartQuery;
  readonly eq: (column: string, value: SupabasePrimitive) => SupabaseCartQuery;
  readonly in: (
    column: string,
    values: readonly SupabasePrimitive[],
  ) => SupabaseCartQuery;
  readonly order: (
    column: string,
    options?: SupabaseOrderOptions,
  ) => SupabaseCartQuery;
  readonly insert: (
    values: Record<string, unknown> | readonly Record<string, unknown>[],
  ) => SupabaseCartQuery;
  readonly update: (values: Record<string, unknown>) => SupabaseCartQuery;
  readonly delete: () => SupabaseCartQuery;
  readonly maybeSingle: () => PromiseLike<SupabaseCartResult<unknown>>;
  readonly single: () => PromiseLike<SupabaseCartResult<unknown>>;
}

export interface SupabaseCartClient {
  readonly from: (table: string) => SupabaseCartQuery;
}

interface SupabaseCartProductRow {
  readonly id: string;
  readonly profile_id: string;
  readonly slug: string;
  readonly name: string;
  readonly release_status: ProductReleaseStatus;
  readonly release_date: string | null;
  readonly is_active: boolean;
  readonly max_quantity_per_order: number;
}

interface SupabaseCartPriceRow {
  readonly product_id: string;
  readonly currency_code: string;
  readonly current_price_minor: number;
}

interface SupabaseCartImageRow {
  readonly product_id: string;
  readonly image_path: string;
  readonly sort_order: number;
}

const cartColumns = [
  "id",
  "profile_id",
  "market_id",
  "auth_user_id",
  "cart_public_id",
  "cart_secret_hash",
  "status",
  "last_seen_at",
].join(", ");

const cartItemColumns = [
  "id",
  "cart_id",
  "product_id",
  "quantity",
  "unit_price_minor_snapshot",
  "updated_at",
].join(", ");

export function createSupabaseCartDataSource(
  supabase: SupabaseCartClient,
): CartDataSource {
  return {
    async getProfileBySlug(slug) {
      return queryOne<CartProfileRow>(
        supabase
          .from("profiles")
          .select("id, slug")
          .eq("slug", slug)
          .maybeSingle(),
        `Load profile ${slug}`,
      );
    },
    async getMarketByCode(code) {
      return queryOne<CartMarketRow>(
        supabase
          .from("markets")
          .select("id, code, currency_code")
          .eq("code", code)
          .maybeSingle(),
        `Load market ${code}`,
      );
    },
    async findActiveGuestCart(cartPublicId) {
      return queryOne<CartRow>(
        supabase
          .from("carts")
          .select(cartColumns)
          .eq("cart_public_id", cartPublicId)
          .eq("status", "active")
          .maybeSingle(),
        `Load guest cart ${cartPublicId}`,
      );
    },
    async findActiveSignedInCart(input) {
      return queryOne<CartRow>(
        supabase
          .from("carts")
          .select(cartColumns)
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId)
          .eq("auth_user_id", input.authUserId)
          .eq("status", "active")
          .maybeSingle(),
        "Load signed-in cart",
      );
    },
    async createCart(input) {
      return queryRequired<CartRow>(
        supabase
          .from("carts")
          .insert({
            profile_id: input.profileId,
            market_id: input.marketId,
            auth_user_id: input.authUserId,
            cart_public_id: input.cartPublicId,
            cart_secret_hash: input.cartSecretHash,
            status: "active",
            last_seen_at: input.now,
          })
          .select(cartColumns)
          .single(),
        "Create cart",
      );
    },
    async touchCart(cartId, now) {
      await queryOk(
        supabase
          .from("carts")
          .update({
            last_seen_at: now,
            updated_at: now,
          })
          .eq("id", cartId),
        `Touch cart ${cartId}`,
      );
    },
    async listCartItems(cartId) {
      return queryMany<CartItemRow>(
        supabase
          .from("cart_items")
          .select(cartItemColumns)
          .eq("cart_id", cartId)
          .order("created_at", { ascending: true }),
        `List cart items ${cartId}`,
      );
    },
    async listProductRules(input) {
      if (input.productIds.length === 0) {
        return [];
      }

      const [products, prices, images] = await Promise.all([
        queryMany<SupabaseCartProductRow>(
          supabase
            .from("products")
            .select(
              [
                "id",
                "profile_id",
                "slug",
                "name",
                "release_status",
                "release_date",
                "is_active",
                "max_quantity_per_order",
              ].join(", "),
            )
            .eq("profile_id", input.profileId)
            .in("id", input.productIds),
          "Load cart products",
        ),
        queryMany<SupabaseCartPriceRow>(
          supabase
            .from("product_prices")
            .select("product_id, currency_code, current_price_minor")
            .eq("profile_id", input.profileId)
            .eq("market_id", input.marketId)
            .eq("is_active", true)
            .in("product_id", input.productIds),
          "Load cart product prices",
        ),
        queryMany<SupabaseCartImageRow>(
          supabase
            .from("product_images")
            .select("product_id, image_path, sort_order")
            .in("product_id", input.productIds)
            .order("sort_order", { ascending: true }),
          "Load cart product images",
        ),
      ]);
      const priceByProductId = new Map(
        prices.map((price) => [price.product_id, price]),
      );
      const firstImageByProductId = firstImageMap(images);

      return products.flatMap((product) => {
        const price = priceByProductId.get(product.id);
        if (!price) {
          return [];
        }

        return [
          {
            product_id: product.id,
            slug: product.slug,
            name: product.name,
            image_path:
              firstImageByProductId.get(product.id)?.image_path ?? null,
            currency_code: price.currency_code,
            current_price_minor: price.current_price_minor,
            max_quantity_per_order: product.max_quantity_per_order,
            is_purchasable: getProductPurchaseState(
              {
                id: product.id,
                profileId: product.profile_id,
                slug: product.slug,
                name: product.name,
                releaseStatus: product.release_status,
                releaseDate: product.release_date,
                isActive: product.is_active,
              },
              input.at,
            ).isPurchasable,
          },
        ];
      });
    },
    async replaceCartItems(cartId, items) {
      await queryOk(
        supabase.from("cart_items").delete().eq("cart_id", cartId),
        `Clear cart items ${cartId}`,
      );

      if (items.length === 0) {
        return [];
      }

      return queryMany<CartItemRow>(
        supabase
          .from("cart_items")
          .insert(
            items.map((item) => ({
              ...(item.id ? { id: item.id } : {}),
              cart_id: cartId,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price_minor_snapshot: item.unit_price_minor_snapshot,
              updated_at: item.updated_at,
            })),
          )
          .select(cartItemColumns),
        `Replace cart items ${cartId}`,
      );
    },
    async markCartMerged(cartId) {
      await queryOk(
        supabase.from("carts").update({ status: "merged" }).eq("id", cartId),
        `Mark cart merged ${cartId}`,
      );
    },
  };
}

function firstImageMap(
  images: readonly SupabaseCartImageRow[],
): Map<string, SupabaseCartImageRow> {
  const firstImageByProductId = new Map<string, SupabaseCartImageRow>();

  for (const image of images) {
    const existing = firstImageByProductId.get(image.product_id);
    if (!existing || image.sort_order < existing.sort_order) {
      firstImageByProductId.set(image.product_id, image);
    }
  }

  return firstImageByProductId;
}

async function queryOne<TRow>(
  query: PromiseLike<SupabaseCartResult<unknown>>,
  description: string,
): Promise<TRow | null> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return result.data === null ? null : (result.data as TRow);
}

async function queryRequired<TRow>(
  query: PromiseLike<SupabaseCartResult<unknown>>,
  description: string,
): Promise<TRow> {
  const row = await queryOne<TRow>(query, description);
  if (!row) {
    throw new Error(`${description}: expected row`);
  }
  return row;
}

async function queryMany<TRow>(
  query: PromiseLike<SupabaseCartResult<unknown>>,
  description: string,
): Promise<readonly TRow[]> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  if (result.data === null) {
    return [];
  }
  if (!Array.isArray(result.data)) {
    throw new Error(`${description}: expected list data`);
  }
  return result.data as TRow[];
}

async function queryOk(
  query: PromiseLike<SupabaseCartResult<unknown>>,
  description: string,
): Promise<void> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
}
