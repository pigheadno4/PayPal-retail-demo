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
  activeFilterCount = 0,
  onRetryPayment,
  onRetryRuntime,
  onClearFilters,
  onNextPayment,
  onNextRuntime,
}: AdminDiagnosticsWorkbenchProps) {
  const [tab, setTab] = useState("payment");
  const request = tab === "payment" ? paymentRequest : runtimeRequest;

  return (
    <AdminWorkbenchPanel
      title="Diagnostics"
      description="Trace canonical payment evidence separately from sanitized runtime events."
      itemLabel={tab === "payment" ? "payment sessions" : "runtime events"}
      request={request}
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
        onValueChange={setTab}
        className="admin-workbench__tabs"
      >
        <TabsList aria-label="Diagnostics datasets">
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="runtime">Runtime logs</TabsTrigger>
        </TabsList>
        {children ? (
          <div
            className="admin-workbench__diagnostics-content"
            data-diagnostics-dataset={tab}
          >
            {children}
          </div>
        ) : (
          <>
            <TabsContent value="payment">{paymentContent}</TabsContent>
            <TabsContent value="runtime">{runtimeContent}</TabsContent>
          </>
        )}
      </Tabs>
    </AdminWorkbenchPanel>
  );
}
