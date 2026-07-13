import type { ReactNode } from "react";

import { AdminWorkbenchPanel, type AdminWorkbenchRequest } from "./AdminShell";
import type { AdminOrderWorkbenchRow } from "./AdminOrdersWorkbench";

interface AdminLifecycleWorkbenchProps {
  readonly request: AdminWorkbenchRequest;
  readonly activeFilterCount?: number;
  readonly onRetry?: () => void;
  readonly onClearFilters?: () => void;
  readonly onNext?: () => void;
  readonly children?: ReactNode;
  readonly rows?: readonly AdminOrderWorkbenchRow[];
  readonly selectedRowId?: string | null;
  readonly onSelectRow?: (id: string) => void;
}

export function AdminLifecycleWorkbench({
  rows = [],
  selectedRowId = null,
  onSelectRow,
  children,
  ...panelProps
}: AdminLifecycleWorkbenchProps) {
  return (
    <AdminWorkbenchPanel
      title="Lifecycle"
      description="Work the actionable Delivery and Pickup queue one merchant step at a time."
      itemLabel="orders"
      {...panelProps}
    >
      {rows.length > 0 ? (
        <div className="admin-workbench__table-scroll">
          <table className="admin-workbench__table">
            <caption className="sr-only">Lifecycle action queue</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Fulfillment</th>
                <th scope="col">Current status</th>
                <th scope="col">Next action</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="sr-only">Open detail</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-selected={selectedRowId === row.id}>
                  <th scope="row">{row.orderNumber}</th>
                  <td>{row.fulfillment}</td>
                  <td>{row.status}</td>
                  <td>{row.nextAction}</td>
                  <td>{row.updatedAt}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-workbench__table-action"
                      aria-pressed={selectedRowId === row.id}
                      onClick={() => onSelectRow?.(row.id)}
                    >
                      Open {row.orderNumber}
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
