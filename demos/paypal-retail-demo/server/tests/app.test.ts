import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { requestApp } from "./helpers/requestApp.js";

describe("Express app shell", () => {
  it("returns the standard API success shape from the health endpoint", async () => {
    const response = await requestApp(createApp(), "GET", "/api/health");

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        service: "paypal-retail-demo",
        status: "ok",
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("returns the standard API error shape for unknown routes", async () => {
    const response = await requestApp(createApp(), "GET", "/api/missing-route");

    expect(response.status).toBe(404);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "The requested API route was not found.",
        details: {
          path: "/api/missing-route",
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});
