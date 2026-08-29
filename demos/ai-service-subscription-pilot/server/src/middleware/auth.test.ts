import { describe, expect, it, vi } from "vitest";

import {
  AuthenticationError,
  verifyBearerAuthorization,
} from "./auth";

describe("bearer authentication", () => {
  it("catches treating the demo cookie as an authentication fallback", async () => {
    const verifyToken = vi.fn();

    await expect(verifyBearerAuthorization(undefined, verifyToken)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("rejects malformed and unverified bearer values", async () => {
    const verifyToken = vi.fn().mockResolvedValue(null);

    await expect(verifyBearerAuthorization("Basic fixture", verifyToken)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    await expect(verifyBearerAuthorization("Bearer rejected", verifyToken)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(verifyToken).toHaveBeenCalledTimes(1);
  });

  it("returns only verified identity context", async () => {
    const verifyToken = vi.fn().mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "customer@example.com",
    });

    await expect(verifyBearerAuthorization("Bearer verified-token", verifyToken)).resolves.toEqual({
      userId: "11111111-1111-4111-8111-111111111111",
      email: "customer@example.com",
    });
    expect(verifyToken).toHaveBeenCalledWith("verified-token");
  });
});
