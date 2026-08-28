import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { App } from "./app";

describe("App", () => {
  it("renders one passive semantic foundation shell", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("<header");
    expect(html).toContain("<main");
    expect(html).toContain("<h1");
    expect(html).toContain("AI Service Studio");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<form");
  });

  it("does not render checkout or provider controls in the foundation task", () => {
    const html = renderToStaticMarkup(<App />).toLowerCase();

    expect(html).not.toContain("checkout");
    expect(html).not.toContain("paypal");
    expect(html).not.toContain("stripe");
    expect(html).not.toContain("apple pay");
    expect(html).not.toContain("google pay");
  });
});
