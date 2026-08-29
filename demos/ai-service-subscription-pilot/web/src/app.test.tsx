import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { App } from "./app.js";

describe("App", () => {
  it("routes the root to the approved Go selection shell", () => {
    const html = renderToStaticMarkup(<MemoryRouter><App /></MemoryRouter>);

    expect(html).toContain("<header");
    expect(html).toContain("<main");
    expect(html).toContain("<h1");
    expect(html).toContain("AI Service Studio");
    expect(html).toContain("Choose Go Monthly");
    expect(html).not.toContain("<form");
  });

  it("does not render checkout or provider controls in the foundation task", () => {
    const html = renderToStaticMarkup(<MemoryRouter><App /></MemoryRouter>).toLowerCase();

    expect(html).not.toContain("checkout");
    expect(html).not.toContain("paypal");
    expect(html).not.toContain("stripe");
    expect(html).not.toContain("apple pay");
    expect(html).not.toContain("google pay");
  });
});
