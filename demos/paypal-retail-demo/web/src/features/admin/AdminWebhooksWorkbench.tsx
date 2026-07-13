import type { ReactNode } from "react";

import { AdminWorkbenchPanel, type AdminWorkbenchRequest } from "./AdminShell";

interface AdminWebhooksWorkbenchProps {
  readonly request: AdminWorkbenchRequest;
  readonly activeFilterCount?: number;
  readonly onRetry?: () => void;
  readonly onClearFilters?: () => void;
  readonly onNext?: () => void;
  readonly children?: ReactNode;
}

export function AdminWebhooksWorkbench(props: AdminWebhooksWorkbenchProps) {
  return (
    <AdminWorkbenchPanel
      title="Webhooks"
      description="Search genuine received PayPal events and inspect sanitized read-only detail."
      itemLabel="events"
      {...props}
    />
  );
}
