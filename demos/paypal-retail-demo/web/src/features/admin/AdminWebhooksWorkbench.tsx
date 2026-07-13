import type { ReactNode } from "react";

import { AdminWorkbenchPanel, type AdminWorkbenchRequest } from "./AdminShell";

interface AdminWebhooksWorkbenchProps {
  readonly request: AdminWorkbenchRequest;
  readonly activeFilterCount?: number;
  readonly onRetry?: () => void;
  readonly onClearFilters?: () => void;
  readonly onNext?: () => void;
  readonly children?: ReactNode;
  readonly rows?: readonly AdminWebhookWorkbenchRow[];
  readonly selectedRowId?: string | null;
  readonly onSelectRow?: (id: string) => void;
}

export interface AdminWebhookWorkbenchRow {
  readonly id: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly verificationStatus: string;
  readonly processingStatus: string;
  readonly receivedAt: string;
}

export function AdminWebhooksWorkbench({
  rows = [],
  selectedRowId = null,
  onSelectRow,
  children,
  ...panelProps
}: AdminWebhooksWorkbenchProps) {
  return (
    <AdminWorkbenchPanel
      title="Webhooks"
      description="Search genuine received PayPal events and inspect sanitized read-only detail."
      itemLabel="events"
      {...panelProps}
    >
      {rows.length > 0 ? (
        <div className="admin-workbench__table-scroll">
          <table className="admin-workbench__table">
            <caption className="sr-only">Webhook event results</caption>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Type</th>
                <th scope="col">Verification</th>
                <th scope="col">Processing</th>
                <th scope="col">Received</th>
                <th scope="col">
                  <span className="sr-only">Inspect detail</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-selected={selectedRowId === row.id}>
                  <th scope="row">{row.eventId}</th>
                  <td>{row.eventType}</td>
                  <td>{row.verificationStatus}</td>
                  <td>{row.processingStatus}</td>
                  <td>{row.receivedAt}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-workbench__table-action"
                      aria-pressed={selectedRowId === row.id}
                      onClick={() => onSelectRow?.(row.id)}
                    >
                      Inspect {row.eventId}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {children}
    </AdminWorkbenchPanel>
  );
}
