import { type FormEvent, type ReactNode, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

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

export type AdminLifecycleActionResult = "updated" | "stale" | "error";

interface AdminLifecycleActionProps {
  readonly orderNumber: string;
  readonly currentStatusLabel: string;
  readonly nextStatusLabel: string;
  readonly disabled?: boolean;
  readonly errorMessage?: string | null;
  readonly onConfirm: (
    note: string | null,
  ) => Promise<AdminLifecycleActionResult>;
}

export function AdminLifecycleAction({
  orderNumber,
  currentStatusLabel,
  nextStatusLabel,
  disabled = false,
  errorMessage = null,
  onConfirm,
}: AdminLifecycleActionProps) {
  const noteId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSaving) {
      return;
    }
    setIsOpen(nextOpen);
    if (!nextOpen) {
      setNote("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const normalizedNote = note.trim() || null;
      const result = await onConfirm(normalizedNote);
      if (result !== "error") {
        setIsOpen(false);
        setNote("");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled}>
          Mark {nextStatusLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={handleSubmit}
          aria-busy={isSaving}
        >
          <DialogHeader>
            <DialogTitle>Confirm lifecycle update</DialogTitle>
            <DialogDescription>
              {orderNumber} will move from {currentStatusLabel} to{" "}
              {nextStatusLabel}. This adds one merchant lifecycle event for the
              buyer timeline.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={noteId}>Merchant note (optional)</FieldLabel>
            <Textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a buyer-safe fulfillment note"
              disabled={isSaving}
              maxLength={240}
            />
          </Field>
          {errorMessage ? (
            <p
              className="admin-shell__feedback"
              data-status="error"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving update" : "Confirm update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
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
      renderChildrenAlways={selectedRowId !== null}
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
