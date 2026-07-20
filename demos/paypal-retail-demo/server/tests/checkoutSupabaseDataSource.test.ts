import { describe, expect, it } from "vitest";

import {
  createSupabaseCheckoutDataSource,
  type SupabaseCheckoutClient,
} from "../src/repositories/checkoutRepository.js";

interface RecordedOperation {
  readonly method: string;
  readonly args: readonly unknown[];
}

describe("Supabase checkout data source", () => {
  it("hydrates checkout cart items from the ordered product image table", async () => {
    const client = new RecordingSupabaseCheckoutClient({
      cart_items: [
        {
          id: "cart_item_molly",
          cart_id: "cart_guest",
          product_id: "product_molly",
          quantity: 2,
          unit_price_minor_snapshot: 1969,
        },
      ],
      products: [
        {
          id: "product_molly",
          category_id: "category_blind_boxes",
          name: "Molly Blind Boxes 2",
        },
      ],
      product_images: [
        {
          product_id: "product_molly",
          image_path: "/images/products/blind-boxes-1-1.png",
          sort_order: 0,
        },
      ],
    });
    const dataSource = createSupabaseCheckoutDataSource(client);

    await expect(dataSource.listCartItems("cart_guest")).resolves.toEqual([
      {
        id: "cart_item_molly",
        cart_id: "cart_guest",
        product_id: "product_molly",
        product_name: "Molly Blind Boxes 2",
        product_image_path: "/images/products/blind-boxes-1-1.png",
        category_id: "category_blind_boxes",
        quantity: 2,
        unit_price_minor_snapshot: 1969,
      },
    ]);
    expect(client.queryFor("products").operations).toContainEqual({
      method: "select",
      args: ["id, category_id, name"],
    });
    expect(client.queryFor("product_images").operations).toEqual([
      {
        method: "select",
        args: ["product_id, image_path, sort_order"],
      },
      {
        method: "in",
        args: ["product_id", ["product_molly"]],
      },
      {
        method: "order",
        args: ["sort_order", { ascending: true }],
      },
    ]);
  });
});

class RecordingSupabaseCheckoutClient implements SupabaseCheckoutClient {
  readonly queries: RecordingSupabaseCheckoutQuery[] = [];

  constructor(
    private readonly rowsByTable: Readonly<Record<string, readonly unknown[]>>,
  ) {}

  from(table: string) {
    const query = new RecordingSupabaseCheckoutQuery(
      table,
      this.rowsByTable[table] ?? [],
    );
    this.queries.push(query);
    return query;
  }

  queryFor(table: string): RecordingSupabaseCheckoutQuery {
    const query = this.queries.find((candidate) => candidate.table === table);
    if (!query) {
      throw new Error(`Missing query for ${table}`);
    }
    return query;
  }
}

class RecordingSupabaseCheckoutQuery
  implements
    PromiseLike<{
      readonly data: unknown;
      readonly error: null;
    }>
{
  readonly operations: RecordedOperation[] = [];
  private singleRow = false;

  constructor(
    readonly table: string,
    private readonly rows: readonly unknown[],
  ) {}

  select(columns: string) {
    return this.record("select", columns);
  }

  eq(column: string, value: string | number | boolean | null) {
    return this.record("eq", column, value);
  }

  in(
    column: string,
    values: readonly (string | number | boolean | null)[],
  ) {
    return this.record("in", column, values);
  }

  or(filters: string) {
    return this.record("or", filters);
  }

  order(column: string, options?: { readonly ascending?: boolean }) {
    return this.record("order", column, options);
  }

  insert(values: Record<string, unknown> | readonly Record<string, unknown>[]) {
    return this.record("insert", values);
  }

  update(values: Record<string, unknown>) {
    return this.record("update", values);
  }

  maybeSingle() {
    this.singleRow = true;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  then<
    TResult1 = {
      readonly data: unknown;
      readonly error: null;
    },
    TResult2 = never,
  >(
    onfulfilled?:
      | ((value: {
          readonly data: unknown;
          readonly error: null;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({
      data: this.singleRow ? (this.rows[0] ?? null) : [...this.rows],
      error: null as const,
    }).then(onfulfilled, onrejected);
  }

  private record(method: string, ...args: readonly unknown[]) {
    this.operations.push({ method, args });
    return this;
  }
}
