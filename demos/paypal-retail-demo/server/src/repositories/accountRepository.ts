import { createHash } from "node:crypto";

import type {
  AccountAddress,
  AccountAddressDeleteResult,
  AccountAuthEmailLookupResult,
  AccountGuestOrderLinkResult,
  AccountOrder,
  AccountOrderAddress,
  AccountOrderFulfillmentMode,
  AccountOrderItem,
  AccountOrderItemReview,
  AccountOrderPaymentStatus,
  AccountOrderStatus,
  AccountOrderTimelineEvent,
  AccountRepository,
  AccountReviewMutationResult,
  AccountSavedPaymentMethod,
  PreparedSavedPaymentDelete,
} from "../routes/account.js";

type RepositoryNow = Date | string | (() => Date | string);

export interface AccountSavedPaymentMethodRow {
  readonly id: string;
  readonly auth_user_id: string;
  readonly provider: "paypal";
  readonly method_type: "paypal_wallet" | "card";
  readonly status: "active" | "pending" | "disabled" | "deleted";
  readonly vault_id: string | null;
  readonly paypal_customer_id: string | null;
  readonly brand: string | null;
  readonly last4: string | null;
  readonly expiry_month: number | null;
  readonly expiry_year: number | null;
  readonly label: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AccountAddressRow {
  readonly id: string;
  readonly auth_user_id: string;
  readonly label: string | null;
  readonly recipient_name: string;
  readonly phone: string | null;
  readonly address_line1: string;
  readonly address_line2: string | null;
  readonly city: string;
  readonly state: string | null;
  readonly postal_code: string;
  readonly country_code: string;
  readonly is_default_shipping: boolean;
  readonly is_default_billing: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AccountUserProfileRow {
  readonly email: string;
}

export interface AccountOrderRow {
  readonly id: string;
  readonly profile_id: string;
  readonly order_number: string;
  readonly auth_user_id: string | null;
  readonly fulfillment_mode: AccountOrderFulfillmentMode;
  readonly status: AccountOrderStatus;
  readonly payment_status: AccountOrderPaymentStatus;
  readonly currency_code: string;
  readonly subtotal_minor: number;
  readonly discount_minor: number;
  readonly tax_minor: number;
  readonly shipping_minor: number;
  readonly total_minor: number;
  readonly created_at: string;
}

export interface AccountOrderItemRow {
  readonly id: string;
  readonly order_id: string;
  readonly product_id: string;
  readonly product_name_snapshot: string;
  readonly product_url_snapshot: string | null;
  readonly product_image_url_snapshot: string | null;
  readonly unit_price_minor: number;
  readonly quantity: number;
  readonly line_total_minor: number;
}

export interface AccountOrderAddressRow {
  readonly id: string;
  readonly order_id: string;
  readonly address_type: AccountOrderAddress["address_type"];
  readonly recipient_name: string;
  readonly city: string;
  readonly state: string | null;
  readonly postal_code: string;
  readonly country_code: string;
}

export interface AccountOrderLifecycleEventRow {
  readonly id: string;
  readonly order_id: string;
  readonly from_status: AccountOrderStatus | null;
  readonly to_status: AccountOrderStatus;
  readonly note: string | null;
  readonly created_at: string;
}

export interface AccountOrderReviewRow {
  readonly id: string;
  readonly profile_id: string;
  readonly product_id: string;
  readonly order_id: string;
  readonly order_item_id: string;
  readonly auth_user_id: string;
  readonly rating: number;
  readonly title: string | null;
  readonly body: string | null;
  readonly status: "active" | "deleted";
  readonly created_at: string;
  readonly updated_at: string;
}

export interface GuestOrderAccessRow {
  readonly id: string;
  readonly order_id: string;
  readonly guest_email_hash: string;
}

export interface AccountDataSource {
  readonly findUserProfileByEmail: (
    email: string,
  ) => Promise<AccountUserProfileRow | null>;
  readonly listSavedPaymentMethods: (
    authUserId: string,
  ) => Promise<readonly AccountSavedPaymentMethodRow[]>;
  readonly listAddresses: (
    authUserId: string,
  ) => Promise<readonly AccountAddressRow[]>;
  readonly listOrders: (
    authUserId: string,
  ) => Promise<readonly AccountOrderRow[]>;
  readonly listGuestOrderAccessByEmailHash: (
    guestEmailHash: string,
  ) => Promise<readonly GuestOrderAccessRow[]>;
  readonly claimGuestOrderForUser: (input: {
    readonly orderId: string;
    readonly authUserId: string;
  }) => Promise<AccountOrderRow | null>;
  readonly getOrderByNumberForUser: (input: {
    readonly authUserId: string;
    readonly orderNumber: string;
  }) => Promise<AccountOrderRow | null>;
  readonly listOrderItems: (
    orderId: string,
  ) => Promise<readonly AccountOrderItemRow[]>;
  readonly listOrderAddresses: (
    orderId: string,
  ) => Promise<readonly AccountOrderAddressRow[]>;
  readonly listOrderLifecycleEvents: (
    orderId: string,
  ) => Promise<readonly AccountOrderLifecycleEventRow[]>;
  readonly listOrderReviews: (
    orderId: string,
  ) => Promise<readonly AccountOrderReviewRow[]>;
  readonly createOrderReview: (
    review: Omit<AccountOrderReviewRow, "created_at" | "id" | "updated_at">,
  ) => Promise<AccountOrderReviewRow>;
  readonly getActiveReviewForOrderItem: (input: {
    readonly authUserId: string;
    readonly orderId: string;
    readonly orderItemId: string;
  }) => Promise<AccountOrderReviewRow | null>;
  readonly updateOrderReview: (
    id: string,
    patch: Partial<AccountOrderReviewRow>,
  ) => Promise<AccountOrderReviewRow>;
  readonly createAddress: (
    address: Omit<AccountAddressRow, "created_at" | "id" | "updated_at">,
  ) => Promise<AccountAddressRow>;
  readonly getAddressForUser: (input: {
    readonly authUserId: string;
    readonly addressId: string;
  }) => Promise<AccountAddressRow | null>;
  readonly updateAddress: (
    id: string,
    patch: Partial<AccountAddressRow>,
  ) => Promise<AccountAddressRow>;
  readonly clearDefaultShipping: (authUserId: string) => Promise<void>;
  readonly clearDefaultBilling: (authUserId: string) => Promise<void>;
  readonly deleteAddress: (id: string) => Promise<void>;
  readonly getSavedPaymentMethodForUser: (input: {
    readonly authUserId: string;
    readonly savedPaymentId: string;
  }) => Promise<AccountSavedPaymentMethodRow | null>;
  readonly updateSavedPaymentMethod: (
    id: string,
    patch: Partial<AccountSavedPaymentMethodRow>,
  ) => Promise<AccountSavedPaymentMethodRow>;
}

export interface CreateSupabaseAccountRepositoryInput {
  readonly dataSource: AccountDataSource;
  readonly hashGuestEmail?: (email: string) => string;
  readonly now?: RepositoryNow;
}

export function createSupabaseAccountRepository(
  input: CreateSupabaseAccountRepositoryInput,
): AccountRepository {
  const hashGuestEmail = input.hashGuestEmail ?? defaultGuestEmailHash;

  return {
    async lookupAuthEmail(email) {
      const normalizedEmail = email.trim().toLowerCase();
      const profile =
        await input.dataSource.findUserProfileByEmail(normalizedEmail);

      return {
        email: profile ? profile.email.trim().toLowerCase() : normalizedEmail,
        status: profile ? "existing" : "new",
      } satisfies AccountAuthEmailLookupResult;
    },
    async listSavedPayments(authUserId) {
      const rows = await input.dataSource.listSavedPaymentMethods(authUserId);
      return rows.map(mapSavedPaymentMethod);
    },
    async listAddresses(authUserId) {
      const rows = await input.dataSource.listAddresses(authUserId);
      return rows.map(mapAddress);
    },
    async listOrders(authUserId) {
      const rows = await input.dataSource.listOrders(authUserId);
      return Promise.all(
        rows.map((row) => mapAccountOrder(input.dataSource, row)),
      );
    },
    async getOrder(getInput) {
      const row = await input.dataSource.getOrderByNumberForUser(getInput);
      return row ? mapAccountOrder(input.dataSource, row) : null;
    },
    async linkGuestOrders(linkInput) {
      const guestEmailHash = hashGuestEmail(linkInput.email);
      const guestOrderAccessRows =
        await input.dataSource.listGuestOrderAccessByEmailHash(guestEmailHash);
      let linkedOrderCount = 0;

      for (const access of guestOrderAccessRows) {
        const claimedOrder = await input.dataSource.claimGuestOrderForUser({
          authUserId: linkInput.authUserId,
          orderId: access.order_id,
        });
        if (claimedOrder) {
          linkedOrderCount += 1;
        }
      }

      return {
        linked_order_count: linkedOrderCount,
      } satisfies AccountGuestOrderLinkResult;
    },
    async createAddress(createInput) {
      await clearRequestedDefaults(input.dataSource, {
        authUserId: createInput.authUserId,
        isDefaultShipping: createInput.address.is_default_shipping,
        isDefaultBilling: createInput.address.is_default_billing,
      });
      await input.dataSource.createAddress({
        ...createInput.address,
        auth_user_id: createInput.authUserId,
      });
      const rows = await input.dataSource.listAddresses(createInput.authUserId);
      return rows.map(mapAddress);
    },
    async updateAddress(updateInput) {
      const existingAddress = await input.dataSource.getAddressForUser({
        authUserId: updateInput.authUserId,
        addressId: updateInput.addressId,
      });
      if (!existingAddress) {
        const rows = await input.dataSource.listAddresses(
          updateInput.authUserId,
        );
        return rows.map(mapAddress);
      }

      await clearRequestedDefaults(input.dataSource, {
        authUserId: updateInput.authUserId,
        isDefaultShipping: updateInput.patch.is_default_shipping === true,
        isDefaultBilling: updateInput.patch.is_default_billing === true,
      });
      await input.dataSource.updateAddress(updateInput.addressId, {
        ...updateInput.patch,
        updated_at: resolveNow(input.now),
      });
      const rows = await input.dataSource.listAddresses(updateInput.authUserId);
      return rows.map(mapAddress);
    },
    async deleteAddress(deleteInput) {
      const rows = await input.dataSource.listAddresses(deleteInput.authUserId);
      const address = rows.find((row) => row.id === deleteInput.addressId);
      if (!address) {
        return {
          status: "deleted",
          addresses: rows.map(mapAddress),
        } satisfies AccountAddressDeleteResult;
      }

      const blockedReasons = defaultDeleteBlockReasons(address);
      if (blockedReasons.length > 0) {
        return {
          status: "blocked",
          reason: `Choose another default ${blockedReasons.join(
            " and ",
          )} address before deleting this address.`,
          addresses: rows.map(mapAddress),
        } satisfies AccountAddressDeleteResult;
      }

      await input.dataSource.deleteAddress(deleteInput.addressId);
      const refreshedRows = await input.dataSource.listAddresses(
        deleteInput.authUserId,
      );
      return {
        status: "deleted",
        addresses: refreshedRows.map(mapAddress),
      } satisfies AccountAddressDeleteResult;
    },
    async prepareSavedPaymentDelete(deleteInput) {
      const savedPayment =
        await input.dataSource.getSavedPaymentMethodForUser(deleteInput);
      if (!savedPayment) {
        return null;
      }

      return {
        savedPaymentId: savedPayment.id,
        vaultId: savedPayment.vault_id,
      } satisfies PreparedSavedPaymentDelete;
    },
    async completeSavedPaymentDelete(deleteInput) {
      await input.dataSource.updateSavedPaymentMethod(
        deleteInput.savedPaymentId,
        {
          status: "deleted",
          updated_at: resolveNow(input.now),
        },
      );
      const rows = await input.dataSource.listSavedPaymentMethods(
        deleteInput.authUserId,
      );
      return rows.map(mapSavedPaymentMethod);
    },
    async submitOrderItemReview(reviewInput) {
      const target = await resolveReviewTarget(input.dataSource, reviewInput);
      if (!target) {
        return {
          status: "not_found",
        } satisfies AccountReviewMutationResult;
      }
      if (!isOrderReviewEligible(target.order.status)) {
        return {
          status: "not_eligible",
          reason: "Reviews open after delivery or pickup is complete.",
        } satisfies AccountReviewMutationResult;
      }
      if (target.activeReview) {
        return {
          status: "not_eligible",
          reason: "This order item already has an active review.",
        } satisfies AccountReviewMutationResult;
      }

      await input.dataSource.createOrderReview({
        profile_id: target.order.profile_id,
        product_id: target.item.product_id,
        order_id: target.order.id,
        order_item_id: target.item.id,
        auth_user_id: reviewInput.authUserId,
        rating: reviewInput.review.rating,
        title: reviewInput.review.title,
        body: reviewInput.review.body,
        status: "active",
      });

      return {
        status: "updated",
        order: await mapAccountOrder(input.dataSource, target.order),
      } satisfies AccountReviewMutationResult;
    },
    async updateOrderItemReview(reviewInput) {
      const target = await resolveReviewTarget(input.dataSource, reviewInput);
      if (!target?.activeReview) {
        return {
          status: "not_found",
        } satisfies AccountReviewMutationResult;
      }
      if (!isOrderReviewEligible(target.order.status)) {
        return {
          status: "not_eligible",
          reason: "Reviews open after delivery or pickup is complete.",
        } satisfies AccountReviewMutationResult;
      }

      await input.dataSource.updateOrderReview(target.activeReview.id, {
        rating: reviewInput.review.rating,
        title: reviewInput.review.title,
        body: reviewInput.review.body,
        updated_at: resolveNow(input.now),
      });

      return {
        status: "updated",
        order: await mapAccountOrder(input.dataSource, target.order),
      } satisfies AccountReviewMutationResult;
    },
    async deleteOrderItemReview(deleteInput) {
      const target = await resolveReviewTarget(input.dataSource, deleteInput);
      if (!target?.activeReview) {
        return {
          status: "not_found",
        } satisfies AccountReviewMutationResult;
      }

      await input.dataSource.updateOrderReview(target.activeReview.id, {
        status: "deleted",
        updated_at: resolveNow(input.now),
      });

      return {
        status: "updated",
        order: await mapAccountOrder(input.dataSource, target.order),
      } satisfies AccountReviewMutationResult;
    },
  };
}

async function resolveReviewTarget(
  dataSource: AccountDataSource,
  input: {
    readonly authUserId: string;
    readonly itemId: string;
    readonly orderNumber: string;
  },
): Promise<{
  readonly activeReview: AccountOrderReviewRow | null;
  readonly item: AccountOrderItemRow;
  readonly order: AccountOrderRow;
} | null> {
  const order = await dataSource.getOrderByNumberForUser({
    authUserId: input.authUserId,
    orderNumber: input.orderNumber,
  });
  if (!order) {
    return null;
  }

  const items = await dataSource.listOrderItems(order.id);
  const item = resolvePublicOrderItem(items, input.itemId);
  if (!item) {
    return null;
  }

  const activeReview = await dataSource.getActiveReviewForOrderItem({
    authUserId: input.authUserId,
    orderId: order.id,
    orderItemId: item.id,
  });

  return {
    activeReview,
    item,
    order,
  };
}

function resolvePublicOrderItem(
  items: readonly AccountOrderItemRow[],
  itemId: string,
): AccountOrderItemRow | null {
  const match = /^line_([1-9][0-9]*)$/.exec(itemId);
  if (!match) {
    return null;
  }

  const itemIndex = Number(match[1]) - 1;
  return items[itemIndex] ?? null;
}

function mapSavedPaymentMethod(
  row: AccountSavedPaymentMethodRow,
): AccountSavedPaymentMethod {
  return {
    id: row.id,
    method_type: row.method_type,
    status: row.status,
    brand: row.brand,
    last4: row.last4,
    expiry_month: row.expiry_month,
    expiry_year: row.expiry_year,
    label: row.label,
  };
}

function mapAddress(row: AccountAddressRow): AccountAddress {
  return {
    id: row.id,
    label: row.label,
    recipient_name: row.recipient_name,
    phone: row.phone,
    address_line1: row.address_line1,
    address_line2: row.address_line2,
    city: row.city,
    state: row.state,
    postal_code: row.postal_code,
    country_code: row.country_code,
    is_default_shipping: row.is_default_shipping,
    is_default_billing: row.is_default_billing,
  };
}

async function mapAccountOrder(
  dataSource: AccountDataSource,
  row: AccountOrderRow,
): Promise<AccountOrder> {
  const [items, addresses, timelineEvents, reviews] = await Promise.all([
    dataSource.listOrderItems(row.id),
    dataSource.listOrderAddresses(row.id),
    dataSource.listOrderLifecycleEvents(row.id),
    dataSource.listOrderReviews(row.id),
  ]);
  const activeReviewsByItemId = new Map(
    reviews
      .filter((review) => review.status === "active")
      .map((review) => [review.order_item_id, review]),
  );
  const reviewEligible = isOrderReviewEligible(row.status);

  return {
    order_number: row.order_number,
    placed_at: row.created_at,
    fulfillment_mode: row.fulfillment_mode,
    status: row.status,
    payment_status: row.payment_status,
    currency_code: row.currency_code,
    review_eligible: reviewEligible,
    fulfillment_label: formatOrderFulfillmentLabel(row, addresses),
    totals: {
      subtotal_minor: row.subtotal_minor,
      discount_minor: row.discount_minor,
      tax_minor: row.tax_minor,
      shipping_minor: row.shipping_minor,
      total_minor: row.total_minor,
    },
    items: items.map((item, index) =>
      mapAccountOrderItem(item, {
        activeReviewsByItemId,
        index,
        reviewEligible,
      }),
    ),
    timeline: mapAccountTimeline(row, timelineEvents),
    addresses: addresses.map(mapAccountOrderAddress),
  };
}

function mapAccountOrderItem(
  item: AccountOrderItemRow,
  context: {
    readonly activeReviewsByItemId: ReadonlyMap<string, AccountOrderReviewRow>;
    readonly index: number;
    readonly reviewEligible: boolean;
  },
): AccountOrderItem {
  const review = context.activeReviewsByItemId.get(item.id) ?? null;
  const reviewSubmitted = Boolean(review);

  return {
    id: `line_${context.index + 1}`,
    product_name: item.product_name_snapshot,
    product_url: item.product_url_snapshot,
    product_image_url: item.product_image_url_snapshot,
    unit_price_minor: item.unit_price_minor,
    quantity: item.quantity,
    line_total_minor: item.line_total_minor,
    review_eligible: context.reviewEligible && !reviewSubmitted,
    review_submitted: reviewSubmitted,
    review: review ? mapAccountOrderItemReview(review) : null,
  };
}

function mapAccountOrderItemReview(
  review: AccountOrderReviewRow,
): AccountOrderItemReview {
  return {
    rating: review.rating,
    title: review.title,
    body: review.body,
  };
}

function mapAccountOrderAddress(
  address: AccountOrderAddressRow,
): AccountOrderAddress {
  return {
    address_type: address.address_type,
    recipient_name: address.recipient_name,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country_code: address.country_code,
  };
}

function mapAccountTimeline(
  order: AccountOrderRow,
  events: readonly AccountOrderLifecycleEventRow[],
): readonly AccountOrderTimelineEvent[] {
  const sortedEvents = [...events].sort((left, right) =>
    left.created_at.localeCompare(right.created_at),
  );

  if (sortedEvents.length === 0) {
    return [
      {
        label: formatOrderTimelineLabel(order.status),
        description: "Order status is up to date.",
        status: "current",
        occurred_at: order.created_at,
      },
    ];
  }

  return sortedEvents.map((event, index) => ({
    label: formatOrderTimelineLabel(event.to_status),
    description: event.note ?? "Order status updated.",
    status:
      index === sortedEvents.length - 1 || event.to_status === order.status
        ? "current"
        : "complete",
    occurred_at: event.created_at,
  }));
}

function formatOrderFulfillmentLabel(
  order: AccountOrderRow,
  addresses: readonly AccountOrderAddressRow[],
): string {
  if (order.fulfillment_mode === "delivery") {
    return "Delivery order";
  }

  const pickupStore = addresses.find(
    (address) => address.address_type === "pickup_store",
  );
  const storeName = pickupStore
    ? pickupStore.recipient_name.replace(/^S2S\s+/i, "")
    : "selected store";

  return `Pickup at ${storeName}`;
}

function formatOrderTimelineLabel(status: AccountOrderStatus): string {
  switch (status) {
    case "pending":
      return "Pending payment";
    case "paid":
      return "Paid";
    case "preparing_pickup":
      return "Preparing pickup";
    case "ready_for_pickup":
      return "Ready for pickup";
    case "picked_up":
      return "Picked up";
    default:
      return status
        .split("_")
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(" ");
  }
}

function isOrderReviewEligible(status: AccountOrderStatus): boolean {
  return status === "delivered" || status === "picked_up";
}

async function clearRequestedDefaults(
  dataSource: AccountDataSource,
  input: {
    readonly authUserId: string;
    readonly isDefaultShipping: boolean;
    readonly isDefaultBilling: boolean;
  },
): Promise<void> {
  if (input.isDefaultShipping) {
    await dataSource.clearDefaultShipping(input.authUserId);
  }

  if (input.isDefaultBilling) {
    await dataSource.clearDefaultBilling(input.authUserId);
  }
}

function defaultDeleteBlockReasons(
  address: AccountAddressRow,
): readonly string[] {
  const reasons: string[] = [];

  if (address.is_default_shipping) {
    reasons.push("shipping");
  }

  if (address.is_default_billing) {
    reasons.push("billing");
  }

  return reasons;
}

function defaultGuestEmailHash(email: string): string {
  return `sha256:${createHash("sha256")
    .update(`paypal-retail-demo-v1:${email.trim().toLowerCase()}`)
    .digest("hex")}`;
}

function resolveNow(now: RepositoryNow | undefined): string {
  const value = typeof now === "function" ? now() : now;
  const date =
    typeof value === "string" || value instanceof Date ? value : new Date();
  return date instanceof Date ? date.toISOString() : date;
}

type SupabasePrimitive = string | number | boolean | null;

interface SupabaseAccountError {
  readonly message: string;
}

interface SupabaseAccountResult<TData> {
  readonly data: TData | null;
  readonly error: SupabaseAccountError | null;
}

interface SupabaseAccountQuery extends PromiseLike<
  SupabaseAccountResult<unknown>
> {
  readonly select: (columns: string) => SupabaseAccountQuery;
  readonly eq: (
    column: string,
    value: SupabasePrimitive,
  ) => SupabaseAccountQuery;
  readonly is: (
    column: string,
    value: SupabasePrimitive,
  ) => SupabaseAccountQuery;
  readonly delete: () => SupabaseAccountQuery;
  readonly insert: (
    values: Record<string, unknown> | readonly Record<string, unknown>[],
  ) => SupabaseAccountQuery;
  readonly order: (
    column: string,
    options?: { readonly ascending?: boolean },
  ) => SupabaseAccountQuery;
  readonly update: (values: Record<string, unknown>) => SupabaseAccountQuery;
  readonly maybeSingle: () => PromiseLike<SupabaseAccountResult<unknown>>;
  readonly single: () => PromiseLike<SupabaseAccountResult<unknown>>;
}

export interface SupabaseAccountClient {
  readonly from: (table: string) => SupabaseAccountQuery;
}

const savedPaymentMethodColumns = [
  "id",
  "auth_user_id",
  "provider",
  "method_type",
  "status",
  "vault_id",
  "paypal_customer_id",
  "brand",
  "last4",
  "expiry_month",
  "expiry_year",
  "label",
  "created_at",
  "updated_at",
].join(", ");

const userProfileColumns = ["email"].join(", ");

const addressColumns = [
  "id",
  "auth_user_id",
  "label",
  "recipient_name",
  "phone",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "postal_code",
  "country_code",
  "is_default_shipping",
  "is_default_billing",
  "created_at",
  "updated_at",
].join(", ");

const orderColumns = [
  "id",
  "profile_id",
  "order_number",
  "auth_user_id",
  "fulfillment_mode",
  "status",
  "payment_status",
  "currency_code",
  "subtotal_minor",
  "discount_minor",
  "tax_minor",
  "shipping_minor",
  "total_minor",
  "created_at",
].join(", ");

const orderItemColumns = [
  "id",
  "order_id",
  "product_id",
  "product_name_snapshot",
  "product_url_snapshot",
  "product_image_url_snapshot",
  "unit_price_minor",
  "quantity",
  "line_total_minor",
].join(", ");

const orderAddressColumns = [
  "id",
  "order_id",
  "address_type",
  "recipient_name",
  "city",
  "state",
  "postal_code",
  "country_code",
].join(", ");

const orderLifecycleEventColumns = [
  "id",
  "order_id",
  "from_status",
  "to_status",
  "note",
  "created_at",
].join(", ");

const orderReviewColumns = [
  "id",
  "profile_id",
  "product_id",
  "order_id",
  "order_item_id",
  "auth_user_id",
  "rating",
  "title",
  "body",
  "status",
  "created_at",
  "updated_at",
].join(", ");

const guestOrderAccessColumns = ["id", "order_id", "guest_email_hash"].join(
  ", ",
);

export function createSupabaseAccountDataSource(
  supabase: SupabaseAccountClient,
): AccountDataSource {
  return {
    async findUserProfileByEmail(email) {
      return queryOne<AccountUserProfileRow>(
        supabase
          .from("user_profiles")
          .select(userProfileColumns)
          .eq("email", email)
          .maybeSingle(),
        `Find user profile ${email}`,
      );
    },
    async listSavedPaymentMethods(authUserId) {
      return queryMany<AccountSavedPaymentMethodRow>(
        supabase
          .from("saved_payment_methods")
          .select(savedPaymentMethodColumns)
          .eq("auth_user_id", authUserId)
          .order("created_at", { ascending: false }),
        `List saved payment methods ${authUserId}`,
      );
    },
    async listAddresses(authUserId) {
      return queryMany<AccountAddressRow>(
        supabase
          .from("addresses")
          .select(addressColumns)
          .eq("auth_user_id", authUserId)
          .order("created_at", { ascending: false }),
        `List addresses ${authUserId}`,
      );
    },
    async listOrders(authUserId) {
      return queryMany<AccountOrderRow>(
        supabase
          .from("orders")
          .select(orderColumns)
          .eq("auth_user_id", authUserId)
          .order("created_at", { ascending: false }),
        `List orders ${authUserId}`,
      );
    },
    async listGuestOrderAccessByEmailHash(guestEmailHash) {
      return queryMany<GuestOrderAccessRow>(
        supabase
          .from("guest_order_access")
          .select(guestOrderAccessColumns)
          .eq("guest_email_hash", guestEmailHash),
        `List guest order access ${guestEmailHash}`,
      );
    },
    async claimGuestOrderForUser(input) {
      return queryOne<AccountOrderRow>(
        supabase
          .from("orders")
          .update({ auth_user_id: input.authUserId })
          .eq("id", input.orderId)
          .is("auth_user_id", null)
          .select(orderColumns)
          .maybeSingle(),
        `Claim guest order ${input.orderId}`,
      );
    },
    async getOrderByNumberForUser(input) {
      return queryOne<AccountOrderRow>(
        supabase
          .from("orders")
          .select(orderColumns)
          .eq("auth_user_id", input.authUserId)
          .eq("order_number", input.orderNumber)
          .maybeSingle(),
        `Load order ${input.orderNumber}`,
      );
    },
    async listOrderItems(orderId) {
      return queryMany<AccountOrderItemRow>(
        supabase
          .from("order_items")
          .select(orderItemColumns)
          .eq("order_id", orderId)
          .order("created_at", { ascending: true }),
        `List order items ${orderId}`,
      );
    },
    async listOrderAddresses(orderId) {
      return queryMany<AccountOrderAddressRow>(
        supabase
          .from("order_addresses")
          .select(orderAddressColumns)
          .eq("order_id", orderId),
        `List order addresses ${orderId}`,
      );
    },
    async listOrderLifecycleEvents(orderId) {
      return queryMany<AccountOrderLifecycleEventRow>(
        supabase
          .from("order_lifecycle_events")
          .select(orderLifecycleEventColumns)
          .eq("order_id", orderId)
          .order("created_at", { ascending: true }),
        `List order lifecycle events ${orderId}`,
      );
    },
    async listOrderReviews(orderId) {
      return queryMany<AccountOrderReviewRow>(
        supabase
          .from("reviews")
          .select(orderReviewColumns)
          .eq("order_id", orderId),
        `List order reviews ${orderId}`,
      );
    },
    async createOrderReview(review) {
      return queryRequired<AccountOrderReviewRow>(
        supabase
          .from("reviews")
          .insert(review as Record<string, unknown>)
          .select(orderReviewColumns)
          .single(),
        `Create order item review ${review.order_item_id}`,
      );
    },
    async getActiveReviewForOrderItem(input) {
      return queryOne<AccountOrderReviewRow>(
        supabase
          .from("reviews")
          .select(orderReviewColumns)
          .eq("auth_user_id", input.authUserId)
          .eq("order_id", input.orderId)
          .eq("order_item_id", input.orderItemId)
          .eq("status", "active")
          .maybeSingle(),
        `Load active review ${input.orderItemId}`,
      );
    },
    async updateOrderReview(id, patch) {
      return queryRequired<AccountOrderReviewRow>(
        supabase
          .from("reviews")
          .update(patch as Record<string, unknown>)
          .eq("id", id)
          .select(orderReviewColumns)
          .single(),
        `Update review ${id}`,
      );
    },
    async createAddress(address) {
      return queryRequired<AccountAddressRow>(
        supabase
          .from("addresses")
          .insert(address as Record<string, unknown>)
          .select(addressColumns)
          .single(),
        `Create address ${address.auth_user_id}`,
      );
    },
    async getAddressForUser(input) {
      return queryOne<AccountAddressRow>(
        supabase
          .from("addresses")
          .select(addressColumns)
          .eq("id", input.addressId)
          .eq("auth_user_id", input.authUserId)
          .maybeSingle(),
        `Load address ${input.addressId}`,
      );
    },
    async updateAddress(id, patch) {
      return queryRequired<AccountAddressRow>(
        supabase
          .from("addresses")
          .update(patch as Record<string, unknown>)
          .eq("id", id)
          .select(addressColumns)
          .single(),
        `Update address ${id}`,
      );
    },
    async clearDefaultShipping(authUserId) {
      await queryMutation(
        supabase
          .from("addresses")
          .update({ is_default_shipping: false })
          .eq("auth_user_id", authUserId)
          .eq("is_default_shipping", true),
        `Clear default shipping ${authUserId}`,
      );
    },
    async clearDefaultBilling(authUserId) {
      await queryMutation(
        supabase
          .from("addresses")
          .update({ is_default_billing: false })
          .eq("auth_user_id", authUserId)
          .eq("is_default_billing", true),
        `Clear default billing ${authUserId}`,
      );
    },
    async deleteAddress(id) {
      await queryMutation(
        supabase.from("addresses").delete().eq("id", id),
        `Delete address ${id}`,
      );
    },
    async getSavedPaymentMethodForUser(input) {
      return queryOne<AccountSavedPaymentMethodRow>(
        supabase
          .from("saved_payment_methods")
          .select(savedPaymentMethodColumns)
          .eq("id", input.savedPaymentId)
          .eq("auth_user_id", input.authUserId)
          .maybeSingle(),
        `Load saved payment method ${input.savedPaymentId}`,
      );
    },
    async updateSavedPaymentMethod(id, patch) {
      return queryRequired<AccountSavedPaymentMethodRow>(
        supabase
          .from("saved_payment_methods")
          .update(patch as Record<string, unknown>)
          .eq("id", id)
          .select(savedPaymentMethodColumns)
          .single(),
        `Update saved payment method ${id}`,
      );
    },
  };
}

async function queryOne<TRow>(
  query: PromiseLike<SupabaseAccountResult<unknown>>,
  description: string,
): Promise<TRow | null> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return result.data === null ? null : (result.data as TRow);
}

async function queryMany<TRow>(
  query: PromiseLike<SupabaseAccountResult<unknown>>,
  description: string,
): Promise<readonly TRow[]> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return (result.data ?? []) as readonly TRow[];
}

async function queryRequired<TRow>(
  query: PromiseLike<SupabaseAccountResult<unknown>>,
  description: string,
): Promise<TRow> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error(`${description}: no row returned`);
  }
  return result.data as TRow;
}

async function queryMutation(
  query: PromiseLike<SupabaseAccountResult<unknown>>,
  description: string,
): Promise<void> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
}
