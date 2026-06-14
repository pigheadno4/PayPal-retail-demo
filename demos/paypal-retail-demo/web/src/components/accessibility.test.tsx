import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  FieldError,
  StatusRegion,
  VisuallyHidden,
  mergeDescribedByIds,
} from "./accessibility.js";

describe("accessibility primitives", () => {
  it("renders reusable status and error regions with live-region semantics", () => {
    const html = renderToStaticMarkup(
      <>
        <StatusRegion id="checkout-status">Totals recalculated.</StatusRegion>
        <StatusRegion id="checkout-error" tone="assertive">
          Shipping address is required.
        </StatusRegion>
        <FieldError id="email-error">Enter a valid email.</FieldError>
      </>,
    );

    expect(html).toContain('id="checkout-status"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('id="checkout-error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('id="email-error"');
  });

  it("supports hidden-but-readable text and compact described-by composition", () => {
    const hidden = renderToStaticMarkup(
      <VisuallyHidden>Close minicart</VisuallyHidden>,
    );

    expect(hidden).toContain('class="sr-only"');
    expect(hidden).toContain("Close minicart");
    expect(mergeDescribedByIds("email-hint", null, "", "email-error")).toBe(
      "email-hint email-error",
    );
  });
});
