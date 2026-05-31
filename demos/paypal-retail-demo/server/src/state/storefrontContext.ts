import type { StorefrontContext } from "../routes/catalog.js";

export interface ActiveStorefrontContextStore {
  readonly get: () => StorefrontContext;
  readonly set: (context: StorefrontContext) => StorefrontContext;
}

export function createInMemoryActiveStorefrontContextStore(
  initialContext: StorefrontContext = {
    profileSlug: "popmart",
    marketCode: "US",
  },
): ActiveStorefrontContextStore {
  let context = normalizeContext(initialContext);

  return {
    get() {
      return context;
    },
    set(nextContext) {
      context = normalizeContext(nextContext);
      return context;
    },
  };
}

function normalizeContext(context: StorefrontContext): StorefrontContext {
  return {
    profileSlug: context.profileSlug,
    marketCode: context.marketCode.toUpperCase(),
  };
}
