import type {
  CatalogMarketRow,
  CatalogProfileRow,
  SupabaseCatalogClient,
} from "./catalogRepository.js";

interface SupabaseAdminError {
  readonly message: string;
}

interface SupabaseAdminResult<TData> {
  readonly data: TData | null;
  readonly error: SupabaseAdminError | null;
}

export interface AdminProfileMarketRepository {
  readonly getProfileById: (id: string) => Promise<CatalogProfileRow | null>;
  readonly getMarketById: (
    id: string,
  ) => Promise<Pick<CatalogMarketRow, "id" | "code"> | null>;
}

export function createSupabaseAdminProfileMarketRepository(
  supabase: SupabaseCatalogClient,
): AdminProfileMarketRepository {
  return {
    async getProfileById(id) {
      return queryOne<CatalogProfileRow>(
        supabase
          .from("profiles")
          .select("id, slug, display_name, brand_mode")
          .eq("id", id)
          .maybeSingle(),
        `Load admin profile ${id}`,
      );
    },
    async getMarketById(id) {
      return queryOne<Pick<CatalogMarketRow, "id" | "code">>(
        supabase.from("markets").select("id, code").eq("id", id).maybeSingle(),
        `Load admin market ${id}`,
      );
    },
  };
}

async function queryOne<TRow>(
  query: PromiseLike<SupabaseAdminResult<unknown>>,
  description: string,
): Promise<TRow | null> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return result.data === null ? null : (result.data as TRow);
}
