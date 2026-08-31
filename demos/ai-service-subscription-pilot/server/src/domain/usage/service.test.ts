import { describe, expect, it, vi } from "vitest";

import type { AccountUsageSummary, GenerateAnswerOutcome } from "../../../../shared/src/usage.js";
import { activateGo, generateAnswer } from "./service.js";

const summary = (reserved = 0, committed = 0): AccountUsageSummary => ({
  tier: "go",
  allowance: { granted: 100, reserved, committed, available: 100 - reserved - committed },
  resetsAt: "2026-09-30T00:00:00.000Z",
  operations: [],
});

describe("usage service", () => {
  it("activates only through the repository's verified-funded ownership boundary", async () => {
    const repository = {
      activate: vi.fn().mockResolvedValue(summary()),
      readSummary: vi.fn(), reserve: vi.fn(), commit: vi.fn(), release: vi.fn(),
    };
    expect(await activateGo("auth-user", { repository, clock: () => new Date(0) })).toEqual(summary());
    expect(repository.activate).toHaveBeenCalledWith("auth-user", new Date(0));
  });

  it("runs one deterministic fixture only for the reservation owner and commits once", async () => {
    const committed: GenerateAnswerOutcome = {
      state: "committed",
      answer: { label: "Simulated AI", title: "Renewal recovery playbook", body: ["Prevent avoidable failures."] },
      summary: summary(0, 10),
    };
    const repository = {
      activate: vi.fn(), readSummary: vi.fn(),
      reserve: vi.fn().mockResolvedValue({ ownsRunner: true, outcome: { state: "reserved", summary: summary(10, 0) } }),
      commit: vi.fn().mockResolvedValue(committed), release: vi.fn(),
    };
    const runFixture = vi.fn().mockResolvedValue(committed.answer);
    const result = await generateAnswer("auth-user", {
      clientOperationId: "11111111-1111-4111-8111-111111111111",
      promptKey: "renewal-recovery",
      confirmed: true,
    }, { repository, runFixture, clock: () => new Date(0) });
    expect(result).toEqual(committed);
    expect(runFixture).toHaveBeenCalledOnce();
    expect(repository.commit).toHaveBeenCalledOnce();
  });

  it("returns an existing reservation without running a second fixture", async () => {
    const reserved: GenerateAnswerOutcome = { state: "reserved", summary: summary(10, 0) };
    const repository = {
      activate: vi.fn(), readSummary: vi.fn(),
      reserve: vi.fn().mockResolvedValue({ ownsRunner: false, outcome: reserved }),
      commit: vi.fn(), release: vi.fn(),
    };
    const runFixture = vi.fn();
    expect(await generateAnswer("auth-user", {
      clientOperationId: "11111111-1111-4111-8111-111111111111",
      promptKey: "renewal-recovery",
      confirmed: true,
    }, { repository, runFixture, clock: () => new Date(0) })).toEqual(reserved);
    expect(runFixture).not.toHaveBeenCalled();
    expect(repository.commit).not.toHaveBeenCalled();
  });

  it("releases once and returns no answer when the deterministic runner fails", async () => {
    const released: GenerateAnswerOutcome = { state: "released", summary: summary() };
    const repository = {
      activate: vi.fn(), readSummary: vi.fn(),
      reserve: vi.fn().mockResolvedValue({ ownsRunner: true, outcome: { state: "reserved", summary: summary(10, 0) } }),
      commit: vi.fn(), release: vi.fn().mockResolvedValue(released),
    };
    const result = await generateAnswer("auth-user", {
      clientOperationId: "11111111-1111-4111-8111-111111111111",
      promptKey: "renewal-recovery",
      confirmed: true,
    }, { repository, runFixture: vi.fn().mockRejectedValue(new Error("fixture_failed")), clock: () => new Date(0) });
    expect(result).toEqual(released);
    expect(result).not.toHaveProperty("answer");
    expect(repository.release).toHaveBeenCalledOnce();
  });
});
