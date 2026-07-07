import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../", import.meta.url);

function readProjectFile(path: string): string {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

describe("evidence scripts", () => {
  it("registers the Round 3 checkout pickup drawer evidence helper", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts?: Record<string, string>;
    };
    const helperPath = join(
      "tools",
      "round3-checkout-pickup-drawer-evidence.playwright.js",
    );
    const helperSource = readProjectFile(helperPath);

    expect(packageJson.scripts).toMatchObject({
      "evidence:round3:checkout-pickup-drawer": `playwright-cli --raw run-code --filename=${helperPath}`,
    });

    for (const rowId of [
      "pickup-picker-open-390",
      "pickup-picker-cancel-390",
      "pickup-picker-confirm-390",
      "preselected-pickup-store-summary-390",
      "delivery-billing-latency-390",
      "delivery-billing-failure-390",
      "checkout-selected-paypal-390",
      "checkout-selected-paylater-390",
      "checkout-selected-apple-pay-390",
      "checkout-selected-google-pay-390",
      "checkout-selected-venmo-390",
      "checkout-selected-card-390",
      "checkout-expanded-order-details-390",
    ]) {
      expect(helperSource).toContain(rowId);
    }

    for (const requiredMetric of [
      "selectedProviderRects",
      "pickerHeaderOverlap",
      "storeSummaryHasContinue",
      "drawerTrigger",
      "billingTransitionMs",
      "createOrderRequests",
      "providerCounts",
    ]) {
      expect(helperSource).toContain(requiredMetric);
    }
  });
});
