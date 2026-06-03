import type { StorefrontShellPanels } from "../../state/storefrontState.js";

export interface AuthModalShellProps {
  readonly state: StorefrontShellPanels["authModal"];
}

export function AuthModalShell({ state }: AuthModalShellProps) {
  if (state === "closed") {
    return null;
  }

  const titleByState = {
    email: "Sign in",
    password: "Enter password",
    register: "Create account",
  } as const;
  const titleId = `auth-modal-title-${state}`;

  return (
    <section
      className="auth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="auth-modal__panel">
        <h2 id={titleId}>{titleByState[state]}</h2>
        <form className="auth-modal__form">
          <label>
            Email
            <input type="email" autoComplete="email" />
          </label>
          <button type="submit">Continue</button>
        </form>
      </div>
    </section>
  );
}
