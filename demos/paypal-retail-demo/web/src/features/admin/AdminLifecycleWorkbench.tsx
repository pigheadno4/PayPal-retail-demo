import type { ReactNode } from "react";

import { AdminWorkbenchPanel, type AdminWorkbenchRequest } from "./AdminShell";

interface AdminLifecycleWorkbenchProps {
  readonly request: AdminWorkbenchRequest;
  readonly activeFilterCount?: number;
  readonly onRetry?: () => void;
  readonly onClearFilters?: () => void;
  readonly onNext?: () => void;
  readonly children?: ReactNode;
}

export function AdminLifecycleWorkbench(props: AdminLifecycleWorkbenchProps) {
  return (
    <AdminWorkbenchPanel
      title="Lifecycle"
      description="Work the actionable Delivery and Pickup queue one merchant step at a time."
      itemLabel="orders"
      {...props}
    />
  );
}
