import type { ReactNode } from "react";
import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { AdminSection } from "../../app/routes";

export interface AdminWorkbenchRequest {
  readonly status: "idle" | "loading" | "ready" | "empty" | "error";
  readonly totalCount: number;
  readonly nextCursor: string | null;
  readonly errorMessage: string | null;
  readonly lastUpdatedAt: string | null;
}

interface AdminShellProps {
  readonly section: AdminSection;
  readonly sessionId?: string | null;
  readonly lastUpdatedAt?: string | null;
  readonly onRefresh: () => void;
  readonly onLogout: () => void;
  readonly isRefreshing?: boolean;
  readonly isLoggingOut?: boolean;
  readonly context?: ReactNode;
  readonly filters?: ReactNode;
  readonly children: ReactNode;
}

const sections: readonly {
  readonly id: AdminSection;
  readonly label: string;
}[] = [
  { id: "orders", label: "Orders" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "inventory", label: "Inventory" },
  { id: "webhooks", label: "Webhooks" },
  { id: "diagnostics", label: "Diagnostics" },
];

export function AdminShell({
  section,
  sessionId,
  lastUpdatedAt,
  onRefresh,
  onLogout,
  isRefreshing = false,
  isLoggingOut = false,
  context,
  filters,
  children,
}: AdminShellProps) {
  return (
    <div
      className="app-shell admin-shell"
      data-route-scope="admin"
      data-route-page="admin"
      data-route-section={section}
    >
      <main className="admin-shell__main">
        <section className="admin-shell__panel">
          <header className="admin-shell__header">
            <div>
              <p className="admin-shell__eyebrow">Operations</p>
              <h1>Admin Portal</h1>
              <p className="admin-shell__header-meta">
                {sessionId ? `Session ${sessionId}` : "Protected session"}
                {lastUpdatedAt
                  ? ` · Updated ${formatAdminTimestamp(lastUpdatedAt)}`
                  : " · Not refreshed yet"}
              </p>
            </div>
            <div className="admin-shell__header-actions">
              <Button
                type="button"
                variant="outline"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCwIcon aria-hidden="true" />
                {isRefreshing ? "Refreshing" : "Refresh"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                disabled={isLoggingOut}
              >
                Log out
              </Button>
            </div>
          </header>
          <nav aria-label="Admin sections" className="admin-shell__nav">
            {sections.map((item) => (
              <a
                key={item.id}
                href={`/admin/${item.id}`}
                aria-current={section === item.id ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          {context}
          {filters}
          {children}
        </section>
      </main>
    </div>
  );
}

interface AdminWorkbenchPanelProps {
  readonly title: string;
  readonly description: string;
  readonly itemLabel: string;
  readonly request: AdminWorkbenchRequest;
  readonly activeFilterCount?: number;
  readonly onRetry?: () => void;
  readonly onClearFilters?: () => void;
  readonly onNext?: () => void;
  readonly children?: ReactNode;
}

export function AdminWorkbenchPanel({
  title,
  description,
  itemLabel,
  request,
  activeFilterCount = 0,
  onRetry,
  onClearFilters,
  onNext,
  children,
}: AdminWorkbenchPanelProps) {
  const isEmpty =
    (request.status === "ready" || request.status === "empty") &&
    request.totalCount === 0;

  return (
    <section
      className="admin-workbench"
      aria-labelledby="admin-workbench-title"
    >
      <div className="admin-workbench__heading">
        <div>
          <h2 id="admin-workbench-title">{title}</h2>
          <p>{description}</p>
        </div>
        {request.status === "ready" ? (
          <p className="admin-workbench__result-count" aria-live="polite">
            {request.totalCount} {itemLabel}
          </p>
        ) : null}
      </div>
      <Card className="admin-workbench__card" size="sm">
        <CardHeader className="sr-only">
          <CardTitle>{title} results</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {request.status === "loading" || request.status === "idle" ? (
            <div className="admin-workbench__state" aria-busy="true">
              <p>Loading {title.toLowerCase()}.</p>
              <div className="admin-workbench__skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
          {request.status === "error" ? (
            <div className="admin-workbench__state" role="alert">
              <strong>
                {request.errorMessage ?? `Unable to load ${title}.`}
              </strong>
              {onRetry ? (
                <Button type="button" variant="outline" onClick={onRetry}>
                  Try again
                </Button>
              ) : null}
            </div>
          ) : null}
          {isEmpty ? (
            <div className="admin-workbench__state">
              <strong>
                {activeFilterCount > 0
                  ? `No ${title.toLowerCase()} match these filters.`
                  : `No ${title.toLowerCase()} are available yet.`}
              </strong>
              {activeFilterCount > 0 && onClearFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClearFilters}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : null}
          {request.status === "ready" && request.totalCount > 0
            ? children
            : null}
          {request.status === "ready" && request.nextCursor && onNext ? (
            <div className="admin-workbench__pagination">
              <Button type="button" variant="outline" onClick={onNext}>
                Next page
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function formatAdminTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}
