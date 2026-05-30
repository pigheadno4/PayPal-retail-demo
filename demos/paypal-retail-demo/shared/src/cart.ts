import { assertMinorUnit, type MinorUnit } from "./money.js";

export type CartRefreshTrigger =
  | "minicart_open"
  | "cart_open"
  | "checkout_start"
  | "express_payment_start"
  | "login_register"
  | "pending_resume";

export interface CartContext {
  readonly profileId: string;
  readonly marketId: string;
  readonly currencyCode: string;
}

export interface CartLine {
  readonly productId: string;
  readonly optionKey?: string | null;
  readonly quantity: number;
  readonly unitPriceMinorSnapshot: number;
  readonly currencyCode: string;
  readonly updatedAt: string;
  readonly isCheckoutEligible?: boolean;
}

export interface CartLineRule {
  readonly productId: string;
  readonly optionKey?: string | null;
  readonly maxQuantity: number;
  readonly currentPriceMinor: number;
  readonly currencyCode: string;
  readonly isPurchasable: boolean;
}

export type CartAdjustment =
  | {
      readonly type: "merged";
      readonly productId: string;
      readonly optionKey: string | null;
      readonly targetQuantity: number;
      readonly incomingQuantity: number;
      readonly finalQuantity: number;
    }
  | {
      readonly type: "appended";
      readonly productId: string;
      readonly optionKey: string | null;
      readonly finalQuantity: number;
    }
  | {
      readonly type: "quantity_capped";
      readonly productId: string;
      readonly optionKey: string | null;
      readonly requestedQuantity: number;
      readonly finalQuantity: number;
      readonly maxQuantity: number;
    }
  | {
      readonly type: "price_refreshed";
      readonly productId: string;
      readonly optionKey: string | null;
      readonly previousPriceMinor: MinorUnit;
      readonly currentPriceMinor: MinorUnit;
    }
  | {
      readonly type: "checkout_blocked";
      readonly productId: string;
      readonly optionKey: string | null;
      readonly reason: "missing_rule" | "not_purchasable";
    };

export interface MergeCartLinesInput {
  readonly targetContext: CartContext;
  readonly incomingContext: CartContext;
  readonly targetLines: readonly CartLine[];
  readonly incomingLines: readonly CartLine[];
  readonly rules: readonly CartLineRule[];
}

export interface MergeCartLinesResult {
  readonly lines: readonly CartLine[];
  readonly adjustments: readonly CartAdjustment[];
}

export interface RefreshCartLinesInput {
  readonly lines: readonly CartLine[];
  readonly rules: readonly CartLineRule[];
  readonly refreshedAt: string;
}

export interface RefreshCartLinesResult {
  readonly lines: readonly CartLine[];
  readonly adjustments: readonly CartAdjustment[];
  readonly hasCheckoutBlockers: boolean;
}

export interface BrowserCartBindingInput {
  readonly profileId: string;
  readonly marketId: string;
  readonly cartPublicId: string;
  readonly cartClientSecret: string;
}

export type BrowserCartBinding = BrowserCartBindingInput;

export function mergeCartLines(
  input: MergeCartLinesInput,
): MergeCartLinesResult {
  assertSameContext(input.targetContext, input.incomingContext);
  const adjustments: CartAdjustment[] = [];
  const rulesByKey = indexRules(input.rules);
  const lines = input.targetLines.map((line) =>
    normalizeCartLine(line, input.targetContext.currencyCode),
  );
  const lineIndexes = new Map(
    lines.map((line, index) => [cartLineKey(line), index]),
  );

  for (const incomingLine of input.incomingLines) {
    const incoming = normalizeCartLine(
      incomingLine,
      input.incomingContext.currencyCode,
    );
    const key = cartLineKey(incoming);
    const existingIndex = lineIndexes.get(key);
    const rule = rulesByKey.get(key);

    if (existingIndex === undefined) {
      const finalQuantity = capQuantity(incoming.quantity, rule);
      lines.push({ ...incoming, quantity: finalQuantity });
      lineIndexes.set(key, lines.length - 1);
      adjustments.push({
        type: "appended",
        productId: incoming.productId,
        optionKey: normalizeOptionKey(incoming.optionKey),
        finalQuantity,
      });
      addCapAdjustment(
        adjustments,
        incoming,
        incoming.quantity,
        finalQuantity,
        rule,
      );
      continue;
    }

    const existing = lines[existingIndex];
    if (!existing) {
      throw new Error("cart line index is out of sync");
    }
    const requestedQuantity = existing.quantity + incoming.quantity;
    const finalQuantity = capQuantity(requestedQuantity, rule);
    const latest = latestLine(existing, incoming);
    lines[existingIndex] = {
      ...latest,
      quantity: finalQuantity,
    };
    adjustments.push({
      type: "merged",
      productId: incoming.productId,
      optionKey: normalizeOptionKey(incoming.optionKey),
      targetQuantity: existing.quantity,
      incomingQuantity: incoming.quantity,
      finalQuantity,
    });
    addCapAdjustment(
      adjustments,
      incoming,
      requestedQuantity,
      finalQuantity,
      rule,
    );
  }

  return {
    lines,
    adjustments,
  };
}

export function refreshCartLines(
  input: RefreshCartLinesInput,
): RefreshCartLinesResult {
  assertValidDate(input.refreshedAt, "refreshedAt");
  const adjustments: CartAdjustment[] = [];
  const rulesByKey = indexRules(input.rules);
  let hasCheckoutBlockers = false;

  const lines = input.lines.map((line) => {
    const normalizedLine = normalizeCartLine(line, line.currencyCode);
    const rule = rulesByKey.get(cartLineKey(normalizedLine));
    if (!rule) {
      hasCheckoutBlockers = true;
      adjustments.push({
        type: "checkout_blocked",
        productId: normalizedLine.productId,
        optionKey: normalizeOptionKey(normalizedLine.optionKey),
        reason: "missing_rule",
      });
      return {
        ...normalizedLine,
        updatedAt: input.refreshedAt,
        isCheckoutEligible: false,
      };
    }

    if (normalizedLine.currencyCode !== rule.currencyCode) {
      throw new Error("cannot refresh cart line across currency");
    }

    if (!rule.isPurchasable) {
      hasCheckoutBlockers = true;
      adjustments.push({
        type: "checkout_blocked",
        productId: normalizedLine.productId,
        optionKey: normalizeOptionKey(normalizedLine.optionKey),
        reason: "not_purchasable",
      });
      return {
        ...normalizedLine,
        updatedAt: input.refreshedAt,
        isCheckoutEligible: false,
      };
    }

    const maxQuantity = assertQuantity(rule.maxQuantity, "max quantity");
    const finalQuantity = Math.min(normalizedLine.quantity, maxQuantity);
    const currentPriceMinor = assertMinorUnit(
      rule.currentPriceMinor,
      "current price",
    );

    if (finalQuantity !== normalizedLine.quantity) {
      adjustments.push({
        type: "quantity_capped",
        productId: normalizedLine.productId,
        optionKey: normalizeOptionKey(normalizedLine.optionKey),
        requestedQuantity: normalizedLine.quantity,
        finalQuantity,
        maxQuantity,
      });
    }
    if (currentPriceMinor !== normalizedLine.unitPriceMinorSnapshot) {
      adjustments.push({
        type: "price_refreshed",
        productId: normalizedLine.productId,
        optionKey: normalizeOptionKey(normalizedLine.optionKey),
        previousPriceMinor: normalizedLine.unitPriceMinorSnapshot,
        currentPriceMinor,
      });
    }

    return {
      ...normalizedLine,
      quantity: finalQuantity,
      unitPriceMinorSnapshot: currentPriceMinor,
      updatedAt: input.refreshedAt,
      isCheckoutEligible: true,
    };
  });

  return {
    lines,
    adjustments,
    hasCheckoutBlockers,
  };
}

export function requiresCartRefreshBefore(
  trigger: CartRefreshTrigger,
): boolean {
  switch (trigger) {
    case "minicart_open":
    case "cart_open":
    case "checkout_start":
    case "express_payment_start":
    case "login_register":
    case "pending_resume":
      return true;
  }
}

export function buildBrowserCartBinding(
  input: BrowserCartBindingInput,
): BrowserCartBinding {
  return {
    profileId: input.profileId,
    marketId: input.marketId,
    cartPublicId: input.cartPublicId,
    cartClientSecret: input.cartClientSecret,
  };
}

function assertSameContext(
  targetContext: CartContext,
  incomingContext: CartContext,
): void {
  if (
    targetContext.profileId !== incomingContext.profileId ||
    targetContext.marketId !== incomingContext.marketId ||
    targetContext.currencyCode !== incomingContext.currencyCode
  ) {
    throw new Error("cannot merge carts across profile, market, or currency");
  }
}

function indexRules(rules: readonly CartLineRule[]): Map<string, CartLineRule> {
  return new Map(
    rules.map((rule) => {
      assertQuantity(rule.maxQuantity, "max quantity");
      assertMinorUnit(rule.currentPriceMinor, "current price");
      return [cartLineKey(rule), rule];
    }),
  );
}

function normalizeCartLine(line: CartLine, currencyCode: string): CartLine {
  if (line.currencyCode !== currencyCode) {
    throw new Error("cart line currency must match cart context");
  }
  assertQuantity(line.quantity, "cart quantity");
  assertMinorUnit(line.unitPriceMinorSnapshot, "cart price snapshot");
  assertValidDate(line.updatedAt, "updatedAt");
  return {
    ...line,
    optionKey: normalizeOptionKey(line.optionKey),
  };
}

function latestLine(left: CartLine, right: CartLine): CartLine {
  return new Date(right.updatedAt).getTime() >
    new Date(left.updatedAt).getTime()
    ? right
    : left;
}

function capQuantity(
  requestedQuantity: number,
  rule: CartLineRule | undefined,
): number {
  if (!rule) {
    return requestedQuantity;
  }
  return Math.min(
    requestedQuantity,
    assertQuantity(rule.maxQuantity, "max quantity"),
  );
}

function addCapAdjustment(
  adjustments: CartAdjustment[],
  line: CartLine,
  requestedQuantity: number,
  finalQuantity: number,
  rule: CartLineRule | undefined,
): void {
  if (!rule || finalQuantity === requestedQuantity) {
    return;
  }
  adjustments.push({
    type: "quantity_capped",
    productId: line.productId,
    optionKey: normalizeOptionKey(line.optionKey),
    requestedQuantity,
    finalQuantity,
    maxQuantity: rule.maxQuantity,
  });
}

function cartLineKey(line: {
  readonly productId: string;
  readonly optionKey?: string | null;
}): string {
  return `${line.productId}\u001f${normalizeOptionKey(line.optionKey) ?? ""}`;
}

function normalizeOptionKey(value: string | null | undefined): string | null {
  return value ?? null;
}

function assertQuantity(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function assertValidDate(value: string, label: string): void {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new Error(`${label} must be a valid date`);
  }
}
