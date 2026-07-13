import type { ReactNode } from "react";

import { AdminWorkbenchPanel, type AdminWorkbenchRequest } from "./AdminShell";

interface AdminOrdersWorkbenchProps {
  readonly request: AdminWorkbenchRequest;
  readonly activeFilterCount?: number;
  readonly onRetry?: () => void;
  readonly onClearFilters?: () => void;
  readonly onNext?: () => void;
  readonly children?: ReactNode;
}

export function AdminOrdersWorkbench(props: AdminOrdersWorkbenchProps) {
  return (
    <AdminWorkbenchPanel
      title="Orders"
      description="Find an order, inspect canonical commerce evidence, and open its drill-down detail."
      itemLabel="orders"
      {...props}
    />
  );
}
