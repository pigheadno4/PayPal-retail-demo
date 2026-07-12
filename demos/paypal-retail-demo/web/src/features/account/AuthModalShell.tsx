import { useEffect, useState, type FormEvent } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BuyerSafeImage } from "@/components/BuyerSafeImage";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    setLocalError(null);
    setIsSubmitting(false);
    setIsPasswordVisible(false);
    if (state === "email") {
      setPassword("");
    }
    if (state !== "register") {
      setTermsAccepted(false);
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
  const emailInputId = `auth-modal-email-${state}`;
  const passwordInputId = `auth-modal-password-${state}`;
  const termsInputId = `auth-modal-terms-${state}`;
  const termsError = "Accept the terms before creating an account.";
  const isEmailInvalid = localError === "Enter a valid email address.";
  const isPasswordInvalid = localError === "Enter your password.";
  const isTermsInvalid = localError === termsError;
  const formStatusMessage =
    localError && !isEmailInvalid && !isPasswordInvalid && !isTermsInvalid
      ? localError
      : statusMessage;
  const isRegisterState = state === "register";
  const shouldShowEmailSummary = state !== "email";

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

    if (state === "register" && !termsAccepted) {
      setLocalError(termsError);
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
    <Dialog
      open={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose?.();
        }
      }}
    >
      <DialogContent
        className={
          isRegisterState
            ? "auth-modal__panel auth-modal__panel--register"
            : "auth-modal__panel"
        }
        showCloseButton={Boolean(onClose)}
      >
        <DialogHeader className="auth-modal__header">
          <DialogTitle>{titleByState[state]}</DialogTitle>
          <DialogDescription
            className={formStatusMessage ? "auth-modal__status" : undefined}
          >
            {formStatusMessage ?? resolveDescription(state)}
          </DialogDescription>
        </DialogHeader>
        {isRegisterState ? (
          <div className="auth-modal__register-layout">
            <aside
              aria-label="Account benefits"
              className="auth-modal__benefits"
            >
              <div className="auth-modal__media">
                <BuyerSafeImage
                  alt="POP MART account benefits collectible"
                  fallbackClassName="auth-modal__benefit-image auth-modal__benefit-image--fallback"
                  className="auth-modal__benefit-image"
                  src="/assets/popmart/products/blind-boxes-2-1.png"
                />
              </div>
              <div className="auth-modal__benefit-copy">
                <span>Collector perks</span>
                <h3>Keep your drops and orders easy to find.</h3>
              </div>
              <ul className="auth-modal__benefit-list">
                <li>
                  <strong>Faster checkout</strong>
                  <span>Keep your buyer email ready for checkout flows.</span>
                </li>
                <li>
                  <strong>Order updates</strong>
                  <span>Review paid, pending, and recovered orders.</span>
                </li>
                <li>
                  <strong>Wishlist readiness</strong>
                  <span>Wishlist is coming soon for account holders.</span>
                </li>
              </ul>
            </aside>
            <section
              aria-label="Account creation form"
              className="auth-modal__form-card"
            >
              <Tabs value="register" className="auth-modal__tabs">
                <TabsList
                  aria-label="Account access mode"
                  className="auth-modal__tabs-list"
                  variant="line"
                >
                  <TabsTrigger
                    type="button"
                    value="signin"
                    onClick={() => {
                      setPassword("");
                      setLocalError(null);
                      onChangeEmail?.();
                    }}
                  >
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger type="button" value="register">
                    Create account
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {renderAuthForm()}
            </section>
          </div>
        ) : (
          renderAuthForm()
        )}
      </DialogContent>
    </Dialog>
  );

  function renderAuthForm() {
    return (
      <form
        className="auth-modal__form"
        noValidate
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <FieldGroup>
          {shouldShowEmailSummary ? (
            <Field
              className="auth-modal__email-summary-field"
              data-invalid={isEmailInvalid ? "true" : undefined}
            >
              <div className="auth-modal__email-summary">
                <div>
                  <span>Email</span>
                  <strong>{email}</strong>
                </div>
                <Button
                  className="auth-modal__email-edit"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setPassword("");
                    setLocalError(null);
                    onChangeEmail?.();
                  }}
                >
                  Edit email
                </Button>
              </div>
              {isEmailInvalid ? <FieldError>{localError}</FieldError> : null}
            </Field>
          ) : (
            <Field data-invalid={isEmailInvalid ? "true" : undefined}>
              <FieldLabel htmlFor={emailInputId}>Email</FieldLabel>
              <Input
                id={emailInputId}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                value={email}
                aria-invalid={isEmailInvalid ? true : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
              />
              {isEmailInvalid ? <FieldError>{localError}</FieldError> : null}
            </Field>
          )}
          {state !== "email" ? (
            <Field data-invalid={isPasswordInvalid ? "true" : undefined}>
              <FieldLabel htmlFor={passwordInputId}>Password</FieldLabel>
              <div className="auth-modal__password-control">
                <Input
                  id={passwordInputId}
                  className="auth-modal__password-input"
                  type={isPasswordVisible ? "text" : "password"}
                  autoComplete={
                    state === "password" ? "current-password" : "new-password"
                  }
                  autoFocus
                  value={password}
                  aria-invalid={isPasswordInvalid ? true : undefined}
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                />
                <Button
                  aria-label={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  className="auth-modal__password-toggle"
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsPasswordVisible((currentValue) => !currentValue);
                  }}
                >
                  {isPasswordVisible ? (
                    <EyeOffIcon aria-hidden="true" />
                  ) : (
                    <EyeIcon aria-hidden="true" />
                  )}
                </Button>
              </div>
              {isPasswordInvalid ? <FieldError>{localError}</FieldError> : null}
            </Field>
          ) : null}
          {state === "register" ? (
            <Field
              className="auth-modal__terms"
              data-invalid={isTermsInvalid ? "true" : undefined}
              orientation="horizontal"
            >
              <Checkbox
                id={termsInputId}
                aria-invalid={isTermsInvalid ? true : undefined}
                checked={termsAccepted}
                onCheckedChange={(checked) => {
                  setTermsAccepted(checked === true);
                  if (localError === termsError) {
                    setLocalError(null);
                  }
                }}
              />
              <FieldContent>
                <FieldLabel htmlFor={termsInputId}>
                  I agree to the Terms of Service and Privacy Policy.
                </FieldLabel>
                <FieldDescription>
                  Required before creating an account.
                </FieldDescription>
                {isTermsInvalid ? <FieldError>{localError}</FieldError> : null}
              </FieldContent>
            </Field>
          ) : null}
        </FieldGroup>
        {state === "register" ? (
          <div
            className="auth-modal__social"
            aria-label="Social sign-up options"
          >
            <Button
              aria-label="Google sign-up unavailable"
              disabled
              type="button"
              variant="outline"
            >
              Google unavailable
            </Button>
            <Button
              aria-label="Apple sign-up unavailable"
              disabled
              type="button"
              variant="outline"
            >
              Apple unavailable
            </Button>
            <p>Social sign-up is unavailable for this checkout.</p>
          </div>
        ) : null}
        <div className="auth-modal__actions">
          <Button
            className="auth-modal__primary-action"
            type="submit"
            disabled={isSubmitting}
          >
            {resolveSubmitLabel(state, isSubmitting)}
          </Button>
        </div>
      </form>
    );
  }
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
    if (state === "email") {
      return "Checking...";
    }

    return state === "password" ? "Signing in..." : "Creating account...";
  }

  if (state === "password") {
    return "Sign in";
  }

  if (state === "register") {
    return "Create account";
  }

  return "Continue";
}

function resolveDescription(state: AuthModalState) {
  if (state === "register") {
    return "Create a collector account with email and password.";
  }

  if (state === "password") {
    return "Enter your password to continue.";
  }

  return "Use your email to continue checkout.";
}
