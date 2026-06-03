import type { StorefrontShellPanels } from "../../state/storefrontState.js";

export interface MinicartShellProps {
  readonly state: StorefrontShellPanels["minicart"];
}

export function MinicartShell({ state }: MinicartShellProps) {
  return (
    <aside
      className="minicart-shell"
      aria-label="Minicart"
      aria-hidden={state === "closed"}
      data-panel-state={state}
    >
      <header className="minicart-shell__header">
        <h2>Cart</h2>
      </header>
      <div className="minicart-shell__body">
        <p>Your bag is ready for the next drop.</p>
      </div>
    </aside>
  );
}
