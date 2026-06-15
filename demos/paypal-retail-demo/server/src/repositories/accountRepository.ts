import type {
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
