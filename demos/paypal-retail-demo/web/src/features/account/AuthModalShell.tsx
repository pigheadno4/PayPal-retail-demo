import { useEffect, useState, type FormEvent } from "react";

import type { StorefrontShellPanels } from "../../state/storefrontState.js";

type AuthModalState = StorefrontShellPanels["authModal"];

export interface AuthModalPasswordInput {
  readonly email: string;
  readonly password: string;
}

export interface AuthModalShellProps {
  readonly state: AuthModalState;
  readonly statusMessage?: string | undefined;
  readonly onClose?: () => void;
  readonly onChangeEmail?: () => void;
  readonly onEmailSubmit?: (email: string) => Promise<void> | void;
  readonly onPasswordSubmit?: (
    input: AuthModalPasswordInput,
  ) => Promise<void> | void;
  readonly onRegisterSubmit?: (
    input: AuthModalPasswordInput,
  ) => Promise<void> | void;
}

export function AuthModalShell({
  state,
  statusMessage,
  onClose,
  onChangeEmail,
  onEmailSubmit,
  onPasswordSubmit,
  onRegisterSubmit,
}: AuthModalShellProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLocalError(null);
    setIsSubmitting(false);
    if (state === "email") {
      setPassword("");
    }
  }, [state]);

  if (state === "closed") {
    return null;
  }

  const titleByState = {
    email: "Sign in",
    password: "Enter password",
    register: "Create account",
  } as const;
  const titleId = `auth-modal-title-${state}`;
  const messageId = `auth-modal-message-${state}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!isValidEmail(normalizedEmail)) {
      setLocalError("Enter a valid email address.");
      return;
    }

    if (state !== "email" && !trimmedPassword) {
      setLocalError("Enter your password.");
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);
    try {
      if (state === "email") {
        await onEmailSubmit?.(normalizedEmail);
      } else if (state === "password") {
        await onPasswordSubmit?.({
          email: normalizedEmail,
          password: trimmedPassword,
        });
      } else {
        await onRegisterSubmit?.({
          email: normalizedEmail,
          password: trimmedPassword,
        });
      }
    } catch (error) {
      console.error("[paypal-retail-demo] Auth modal submit failed", {
        error,
        state,
      });
      setLocalError("We could not continue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className="auth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="auth-modal__panel">
        <div className="auth-modal__header">
          <h2 id={titleId}>{titleByState[state]}</h2>
          {onClose ? (
            <button type="button" className="link-button" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
        {statusMessage || localError ? (
          <p
            className={localError ? "auth-modal__error" : "auth-modal__status"}
            id={messageId}
          >
            {localError ?? statusMessage}
          </p>
        ) : null}
        <form
          className="auth-modal__form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              readOnly={state !== "email"}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </label>
          {state !== "email" ? (
            <label>
              Password
              <input
                type="password"
                autoComplete={
                  state === "password" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
              />
            </label>
          ) : null}
          <div className="auth-modal__actions">
            {state !== "email" ? (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setPassword("");
                  setLocalError(null);
                  onChangeEmail?.();
                }}
              >
                Change email
              </button>
            ) : null}
            <button type="submit" disabled={isSubmitting}>
              {resolveSubmitLabel(state, isSubmitting)}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function isValidEmail(email: string): boolean {
  const atIndex = email.indexOf("@");
  const dotIndex = email.lastIndexOf(".");
  return (
    atIndex > 0 &&
    atIndex === email.lastIndexOf("@") &&
    dotIndex > atIndex + 1 &&
    dotIndex < email.length - 1
  );
}

function resolveSubmitLabel(state: AuthModalState, isSubmitting: boolean) {
  if (isSubmitting) {
    return state === "email" ? "Checking..." : "Submitting...";
  }

  if (state === "password") {
    return "Sign in";
  }

  if (state === "register") {
    return "Create account";
  }

  return "Continue";
}
