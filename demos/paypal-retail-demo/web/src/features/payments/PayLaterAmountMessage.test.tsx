// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PayLaterAmountMessage } from "./PayLaterStandaloneAction.js";

const paypalMessageMockState = vi.hoisted(() => ({
  fetchCalls: [] as Array<{
    readonly amount?: string;
    readonly buyerCountry?: string;
    readonly currencyCode?: string;
  }>,
  isReady: true,
}));

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  PayLaterOneTimePaymentButton: () => null,
  usePayPalMessages: () => ({
    error: null,
    handleCreateLearnMore: vi.fn(),
    handleFetchContent: vi.fn(
      (options: {
        readonly amount?: string;
        readonly buyerCountry?: string;
        readonly currencyCode?: string;
        readonly onReady?: (content: Record<string, unknown>) => void;
      }) => {
        paypalMessageMockState.fetchCalls.push({
          ...(options.amount ? { amount: options.amount } : {}),
          ...(options.buyerCountry
            ? { buyerCountry: options.buyerCountry }
            : {}),
          ...(options.currencyCode
            ? { currencyCode: options.currencyCode }
            : {}),
        });
        const content = { message: `official ${options.amount ?? "none"}` };
        options.onReady?.(content);

        return Promise.resolve(content);
      },
    ),
    isReady: paypalMessageMockState.isReady,
  }),
}));

beforeEach(() => {
  paypalMessageMockState.fetchCalls = [];
  paypalMessageMockState.isReady = true;
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PayLaterAmountMessage", () => {
  it("refreshes official Pay Later message content when checkout totals change", async () => {
    const setContent = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "setContent", {
      configurable: true,
      value: setContent,
    });

    const { rerender } = render(
      <PayLaterAmountMessage
        amountLabel="$25.98"
        buyerCountry="US"
        currencyCode="USD"
        placement="order-summary"
      />,
    );

    await waitFor(() => {
      expect(paypalMessageMockState.fetchCalls).toHaveLength(1);
    });
    expect(paypalMessageMockState.fetchCalls[0]).toMatchObject({
      amount: "25.98",
      buyerCountry: "US",
      currencyCode: "USD",
    });
    expect(
      document
        .querySelector('[data-paylater-message-placement="order-summary"]')
        ?.getAttribute("data-paylater-message-amount"),
    ).toBe("25.98");

    rerender(
      <PayLaterAmountMessage
        amountLabel="$37.98"
        buyerCountry="US"
        currencyCode="USD"
        placement="order-summary"
      />,
    );

    await waitFor(() => {
      expect(paypalMessageMockState.fetchCalls).toHaveLength(2);
    });

    expect(paypalMessageMockState.fetchCalls[1]).toMatchObject({
      amount: "37.98",
      buyerCountry: "US",
      currencyCode: "USD",
    });
    expect(setContent).toHaveBeenLastCalledWith({
      message: "official 37.98",
    });
    expect(
      document
        .querySelector('[data-paylater-message-placement="order-summary"]')
        ?.getAttribute("data-paylater-message-amount"),
    ).toBe("37.98");

    await act(async () => {
      await Promise.resolve();
    });
  });
});
