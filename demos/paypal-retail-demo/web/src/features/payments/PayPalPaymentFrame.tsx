import { type ReactNode } from "react";

import { FieldLegend, FieldSet } from "@/components/ui/field";

export interface PayPalPaymentFrameProps {
  readonly children: ReactNode;
  readonly className: string;
  readonly legend?: string;
}

export function PayPalPaymentFrame({
  children,
  className,
  legend = "Secured by PayPal",
}: PayPalPaymentFrameProps) {
  return (
    <FieldSet className={className}>
      <FieldLegend>{legend}</FieldLegend>
      {children}
    </FieldSet>
  );
}
