import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { HomeRoute } from "./home.js";

describe("HomeRoute", () => {
  it("renders only the approved Go Monthly selection", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter><HomeRoute /></MemoryRouter>,
    );

    expect(html).toContain("Choose Go Monthly");
    expect(html).toContain("50% off your first month");
    expect(html).toContain("100 units");
    expect(html).not.toMatch(/paypal|stripe|activation|allowance balance/i);
  });
});
