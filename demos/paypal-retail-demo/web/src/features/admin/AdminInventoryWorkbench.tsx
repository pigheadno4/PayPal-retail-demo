import type { ReactNode } from "react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AdminWorkbenchPanel, type AdminWorkbenchRequest } from "./AdminShell";

interface AdminInventoryWorkbenchProps {
  readonly stockRequest: AdminWorkbenchRequest;
  readonly pickupRequest: AdminWorkbenchRequest;
  readonly stockContent?: ReactNode;
  readonly pickupContent?: ReactNode;
  readonly children?: ReactNode;
  readonly activeFilterCount?: number;
  readonly onRetryStock?: () => void;
  readonly onRetryPickup?: () => void;
  readonly onClearFilters?: () => void;
  readonly onNextStock?: () => void;
  readonly onNextPickup?: () => void;
}

export function AdminInventoryWorkbench({
  stockRequest,
  pickupRequest,
  stockContent,
  pickupContent,
  children,
  activeFilterCount = 0,
  onRetryStock,
  onRetryPickup,
  onClearFilters,
  onNextStock,
  onNextPickup,
}: AdminInventoryWorkbenchProps) {
  const [tab, setTab] = useState("stock");
  const request = tab === "stock" ? stockRequest : pickupRequest;

  return (
    <AdminWorkbenchPanel
      title="Inventory"
      description="Manage stock and Pickup capacity without mixing their result streams."
      itemLabel={tab === "stock" ? "stock rows" : "pickup dates"}
      request={request}
      activeFilterCount={activeFilterCount}
      {...(tab === "stock" && onRetryStock
        ? { onRetry: onRetryStock }
        : tab === "pickup" && onRetryPickup
          ? { onRetry: onRetryPickup }
          : {})}
      {...(onClearFilters ? { onClearFilters } : {})}
      {...(tab === "stock" && onNextStock
        ? { onNext: onNextStock }
        : tab === "pickup" && onNextPickup
          ? { onNext: onNextPickup }
          : {})}
    >
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="admin-workbench__tabs"
      >
        <TabsList aria-label="Inventory datasets">
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="pickup">Pickup capacity</TabsTrigger>
        </TabsList>
        {children ? (
          <div
            className="admin-workbench__inventory-content"
            data-inventory-dataset={tab}
          >
            {children}
          </div>
        ) : (
          <>
            <TabsContent value="stock">{stockContent}</TabsContent>
            <TabsContent value="pickup">{pickupContent}</TabsContent>
          </>
        )}
      </Tabs>
    </AdminWorkbenchPanel>
  );
}
