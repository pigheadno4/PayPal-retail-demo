import type { ReactNode } from "react";

import { AdminWorkbenchPanel, type AdminWorkbenchRequest } from "./AdminShell";

interface AdminOrdersWorkbenchProps {
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

export interface AdminOrderWorkbenchRow {
  readonly id: string;
  readonly orderNumber: string;
  readonly fulfillment: string;
  readonly status: string;
  readonly paymentStatus: string;
  readonly total: string;
  readonly placedAt: string;
  readonly updatedAt: string;
  readonly nextAction: string;
}

export function AdminOrdersWorkbench({
  rows = [],
  selectedRowId = null,
  onSelectRow,
  children,
  ...panelProps
}: AdminOrdersWorkbenchProps) {
  return (
    <AdminWorkbenchPanel
      title="Orders"
      description="Find an order, inspect canonical commerce evidence, and open its drill-down detail."
      itemLabel="orders"
      {...panelProps}
    >
      {rows.length > 0 ? (
        <div className="admin-workbench__table-scroll">
          <table className="admin-workbench__table">
            <caption className="sr-only">Order search results</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Status</th>
                <th scope="col">Fulfillment</th>
                <th scope="col">Payment</th>
                <th scope="col">Total</th>
                <th scope="col">Placed</th>
                <th scope="col">
                  <span className="sr-only">Open detail</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-selected={selectedRowId === row.id}>
                  <th scope="row">{row.orderNumber}</th>
                  <td>{row.status}</td>
                  <td>{row.fulfillment}</td>
                  <td>{row.paymentStatus}</td>
                  <td>{row.total}</td>
                  <td>{row.placedAt}</td>
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
