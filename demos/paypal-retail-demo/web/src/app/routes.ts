export type AppRoute =
  | {
      readonly scope: "buyer";
      readonly page: "home";
    }
  | {
      readonly scope: "buyer";
      readonly page: "catalog";
    }
  | {
      readonly scope: "buyer";
      readonly page: "product";
      readonly productSlug: string;
    }
  | {
      readonly scope: "buyer";
      readonly page: "checkout";
    }
  | {
      readonly scope: "buyer";
      readonly page: "cart";
    }
  | {
      readonly scope: "buyer";
      readonly page: "account";
      readonly section: "orders" | "settings";
    }
  | {
      readonly scope: "buyer";
      readonly page: "not_found";
    }
  | {
      readonly scope: "admin";
      readonly page: "admin";
    };

export function resolveAppRoute(pathname: string): AppRoute {
  const path = normalizePath(pathname);

  if (path === "/admin" || path.startsWith("/admin/")) {
    return {
      scope: "admin",
      page: "admin",
    };
  }

  if (path === "/") {
    return {
      scope: "buyer",
      page: "home",
    };
  }

  if (path === "/products" || path === "/categories") {
    return {
      scope: "buyer",
      page: "catalog",
    };
  }

  if (path.startsWith("/products/")) {
    const productSlug = path.slice("/products/".length);
    return productSlug
      ? {
          scope: "buyer",
          page: "product",
          productSlug,
        }
      : {
          scope: "buyer",
          page: "not_found",
        };
  }

  if (path === "/checkout") {
    return {
      scope: "buyer",
      page: "checkout",
    };
  }

  if (path === "/cart") {
    return {
      scope: "buyer",
      page: "cart",
    };
  }

  if (path === "/account" || path === "/account/settings") {
    return {
      scope: "buyer",
      page: "account",
      section: "settings",
    };
  }

  if (path === "/account/orders" || path.startsWith("/account/orders/")) {
    return {
      scope: "buyer",
      page: "account",
      section: "orders",
    };
  }

  return {
    scope: "buyer",
    page: "not_found",
  };
}

function normalizePath(pathname: string): string {
  const path = pathname.trim() || "/";
  const withoutQuery = path.split(/[?#]/, 1)[0] ?? "/";
  const normalized = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;

  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
}
