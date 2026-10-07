export type CreationDiagnostic = Readonly<{
  stage: "review" | "claim" | "oauth" | "create_request" | "create_response" | "json_parse" | "id_projection" | "persistence";
  outcome: "success" | "failure";
  category: "none" | "exception" | "transport" | "http";
  httpStatus?: number;
}>;
export type CreationDiagnosticSink = (record: CreationDiagnostic) => void;

export function emitCreationDiagnostic(sink: CreationDiagnosticSink | undefined, record: CreationDiagnostic): void {
  // Diagnostics cannot change payment classification, persistence or retry decisions.
  try {
    sink?.(Object.freeze({ stage: record.stage, outcome: record.outcome, category: record.category,
      ...(Number.isInteger(record.httpStatus) && record.httpStatus! >= 100 && record.httpStatus! <= 599 ? { httpStatus: record.httpStatus } : {}),
    }));
  } catch { /* Logging is strictly best effort. */ }
}

export async function observeCreation<T>(sink: CreationDiagnosticSink | undefined, stage: CreationDiagnostic["stage"], operation: () => Promise<T>, category: CreationDiagnostic["category"] = "exception"): Promise<T> {
  try {
    const result = await operation();
    emitCreationDiagnostic(sink, { stage, outcome: "success", category: "none" });
    return result;
  } catch (error) {
    emitCreationDiagnostic(sink, { stage, outcome: "failure", category });
    throw error;
  }
}
