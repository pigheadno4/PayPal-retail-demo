import type {
  AccountAddress,
  AccountAddressDeleteResult,
  AccountAuthEmailLookupResult,
  AccountRepository,
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
  readonly now?: RepositoryNow;
}

export function createSupabaseAccountRepository(
  input: CreateSupabaseAccountRepositoryInput,
): AccountRepository {
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
  };
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
