export const buyerLifecycleNoteMaxLength = 240;

export type BuyerLifecycleNoteRejectionReason =
  | "invalid_type"
  | "too_long"
  | "control_characters"
  | "technical_identifier";

export type BuyerLifecycleNoteResult =
  | { readonly ok: true; readonly note: string | null }
  | {
      readonly ok: false;
      readonly reason: BuyerLifecycleNoteRejectionReason;
    };

const technicalIdentifierPatterns = [
  /\b(?:payment_session|paypal_(?:order|capture|request)|webhook(?:_event)?|debug|dbg)_[a-z0-9][a-z0-9_-]*\b/i,
  /\b(?:payment\s+session|paypal\s+(?:order|capture|request)|webhook(?:\s+event)?|debug)(?:\s+id)?\s*[:=#]\s*[a-z0-9][a-z0-9_-]*\b/i,
  /\b(?:payment\s+session|paypal\s+(?:order|capture|request)|webhook(?:\s+event)?|debug)(?:\s+id)?\s+[a-z0-9][a-z0-9_-]{11,}\b/i,
] as const;

export function parseBuyerSafeLifecycleNote(
  value: unknown,
): BuyerLifecycleNoteResult {
  if (value === null || typeof value === "undefined") {
    return { ok: true, note: null };
  }
  if (typeof value !== "string") {
    return { ok: false, reason: "invalid_type" };
  }
  if (hasControlCharacter(value)) {
    return { ok: false, reason: "control_characters" };
  }

  const note = value.trim();
  if (!note) {
    return { ok: true, note: null };
  }
  if (note.length > buyerLifecycleNoteMaxLength) {
    return { ok: false, reason: "too_long" };
  }
  if (technicalIdentifierPatterns.some((pattern) => pattern.test(note))) {
    return { ok: false, reason: "technical_identifier" };
  }

  return { ok: true, note };
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      typeof codePoint === "number" &&
      (codePoint <= 0x1f ||
        (codePoint >= 0x7f && codePoint <= 0x9f) ||
        codePoint === 0x2028 ||
        codePoint === 0x2029)
    );
  });
}

export function toBuyerSafeLifecycleDescription(note: string | null): string {
  const parsed = parseBuyerSafeLifecycleNote(note);
  return parsed.ok && parsed.note ? parsed.note : "Order status updated.";
}
