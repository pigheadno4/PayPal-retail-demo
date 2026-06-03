import type { ReactNode } from "react";

export type StatusRegionTone = "polite" | "assertive";

export interface StatusRegionProps {
  readonly id: string;
  readonly tone?: StatusRegionTone;
  readonly className?: string;
  readonly children: ReactNode;
}

export function StatusRegion({
  id,
  tone = "polite",
  className,
  children,
}: StatusRegionProps) {
  const role = tone === "assertive" ? "alert" : "status";

  return (
    <div
      id={id}
      role={role}
      aria-live={tone}
      aria-atomic="true"
      className={joinClassNames("status-region", className)}
    >
      {children}
    </div>
  );
}

export interface FieldErrorProps {
  readonly id: string;
  readonly className?: string;
  readonly children: ReactNode;
}

export function FieldError({ id, className, children }: FieldErrorProps) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className={joinClassNames("field-error", className)}
    >
      {children}
    </div>
  );
}

export interface VisuallyHiddenProps {
  readonly children: ReactNode;
}

export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return <span className="sr-only">{children}</span>;
}

export function mergeDescribedByIds(
  ...ids: readonly (string | null | undefined | false)[]
): string | undefined {
  const mergedIds = ids
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter(Boolean);

  return mergedIds.length > 0 ? mergedIds.join(" ") : undefined;
}

function joinClassNames(
  ...classNames: readonly (string | null | undefined | false)[]
): string | undefined {
  const joinedClassNames = classNames.filter(Boolean).join(" ");

  return joinedClassNames || undefined;
}
