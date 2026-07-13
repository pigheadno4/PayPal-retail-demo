import type { ReactNode } from "react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AdminWorkbenchPanel, type AdminWorkbenchRequest } from "./AdminShell";

interface AdminDiagnosticsWorkbenchProps {
  readonly paymentRequest: AdminWorkbenchRequest;
  readonly runtimeRequest: AdminWorkbenchRequest;
  readonly paymentContent?: ReactNode;
  readonly runtimeContent?: ReactNode;
  readonly children?: ReactNode;
  readonly activeTab?: "payment" | "runtime";
  readonly onTabChange?: (tab: "payment" | "runtime") => void;
  readonly activeFilterCount?: number;
  readonly onRetryPayment?: () => void;
  readonly onRetryRuntime?: () => void;
  readonly onClearFilters?: () => void;
  readonly onNextPayment?: () => void;
  readonly onNextRuntime?: () => void;
}

export function AdminDiagnosticsWorkbench({
  paymentRequest,
  runtimeRequest,
  paymentContent,
  runtimeContent,
  children,
  activeTab,
  onTabChange,
  activeFilterCount = 0,
  onRetryPayment,
  onRetryRuntime,
  onClearFilters,
  onNextPayment,
  onNextRuntime,
}: AdminDiagnosticsWorkbenchProps) {
  const [internalTab, setInternalTab] = useState<"payment" | "runtime">(
    "payment",
  );
  const tab = activeTab ?? internalTab;
  const request = tab === "payment" ? paymentRequest : runtimeRequest;
  const canRenderContent = request.status === "ready" && request.totalCount > 0;

  return (
    <AdminWorkbenchPanel
      title="Diagnostics"
      description="Trace canonical payment evidence separately from sanitized runtime events."
      itemLabel={tab === "payment" ? "payment sessions" : "runtime events"}
      emptyLabel={tab === "payment" ? "payment sessions" : "runtime events"}
      request={request}
      renderChildrenAlways
      activeFilterCount={activeFilterCount}
      {...(tab === "payment" && onRetryPayment
        ? { onRetry: onRetryPayment }
        : tab === "runtime" && onRetryRuntime
          ? { onRetry: onRetryRuntime }
          : {})}
      {...(onClearFilters ? { onClearFilters } : {})}
      {...(tab === "payment" && onNextPayment
        ? { onNext: onNextPayment }
        : tab === "runtime" && onNextRuntime
          ? { onNext: onNextRuntime }
          : {})}
    >
      <Tabs
        value={tab}
        onValueChange={(value) => {
          const nextTab = value === "runtime" ? "runtime" : "payment";
          setInternalTab(nextTab);
          onTabChange?.(nextTab);
        }}
        className="admin-workbench__tabs"
      >
        <TabsList aria-label="Diagnostics datasets">
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="runtime">Runtime logs</TabsTrigger>
        </TabsList>
        {children ? (
          <TabsContent value={tab}>
            {canRenderContent ? (
              <div
                className="admin-workbench__diagnostics-content"
                data-diagnostics-dataset={tab}
              >
                {children}
              </div>
            ) : null}
          </TabsContent>
        ) : (
          <>
            <TabsContent value="payment">
              {tab === "payment" && canRenderContent ? paymentContent : null}
            </TabsContent>
            <TabsContent value="runtime">
              {tab === "runtime" && canRenderContent ? runtimeContent : null}
            </TabsContent>
          </>
        )}
      </Tabs>
    </AdminWorkbenchPanel>
  );
}
