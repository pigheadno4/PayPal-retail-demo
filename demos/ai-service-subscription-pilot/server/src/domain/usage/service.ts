import type {
  AccountUsageSummary,
  GenerateAnswerOutcome,
  GenerateAnswerRequest,
} from "../../../../shared/src/usage.js";
import type { FixtureRunner, SimulatedAnswer } from "./fixtures.js";

export class UsageNotFoundError extends Error {
  constructor() { super("usage_not_found"); }
}

export class UsageNotAvailableError extends Error {
  constructor() { super("usage_not_available"); }
}

export type UsageRepository = Readonly<{
  activate(authUserId: string, now: Date): Promise<AccountUsageSummary>;
  readSummary(authUserId: string, now: Date): Promise<AccountUsageSummary>;
  reserve(authUserId: string, input: GenerateAnswerRequest, now: Date): Promise<Readonly<{
    ownsRunner: boolean;
    outcome: GenerateAnswerOutcome;
  }>>;
  commit(authUserId: string, clientOperationId: string, answer: SimulatedAnswer, now: Date): Promise<GenerateAnswerOutcome>;
  release(authUserId: string, clientOperationId: string, now: Date): Promise<GenerateAnswerOutcome>;
}>;

type Dependencies = Readonly<{
  repository: UsageRepository;
  clock: () => Date;
}>;

export function activateGo(authUserId: string, dependencies: Dependencies) {
  return dependencies.repository.activate(authUserId, dependencies.clock());
}

export function readUsageSummary(authUserId: string, dependencies: Dependencies) {
  return dependencies.repository.readSummary(authUserId, dependencies.clock());
}

export async function generateAnswer(
  authUserId: string,
  input: GenerateAnswerRequest,
  dependencies: Dependencies & Readonly<{ runFixture: FixtureRunner }>,
): Promise<GenerateAnswerOutcome> {
  const reservation = await dependencies.repository.reserve(
    authUserId,
    input,
    dependencies.clock(),
  );
  if (!reservation.ownsRunner || reservation.outcome.state !== "reserved") {
    return reservation.outcome;
  }
  try {
    const answer = await dependencies.runFixture(input.promptKey);
    return await dependencies.repository.commit(
      authUserId,
      input.clientOperationId,
      answer,
      dependencies.clock(),
    );
  } catch {
    return dependencies.repository.release(
      authUserId,
      input.clientOperationId,
      dependencies.clock(),
    );
  }
}
