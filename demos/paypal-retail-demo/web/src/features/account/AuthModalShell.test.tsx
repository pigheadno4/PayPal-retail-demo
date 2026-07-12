// @vitest-environment jsdom

import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AuthModalShell } from "./AuthModalShell.js";

class TestResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

describe("AuthModalShell", () => {
  beforeAll(() => {
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the email step through shadcn Dialog and Field primitives", () => {
    render(
      <AuthModalShell
        state="email"
        statusMessage="Use your checkout email for order recovery."
        onClose={() => {}}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Sign in" });

    expect(dialog.getAttribute("data-slot")).toBe("dialog-content");
    expect(
      dialog.querySelector('[data-slot="dialog-title"]')?.textContent,
    ).toBe("Sign in");
    expect(
      dialog.querySelector('[data-slot="dialog-description"]')?.textContent,
    ).toBe("Use your checkout email for order recovery.");
    expect(dialog.querySelector('[data-slot="field-group"]')).toBeTruthy();
    expect(dialog.querySelectorAll('[data-slot="field"]')).toHaveLength(1);
    expect(dialog.querySelector("form")?.noValidate).toBe(true);
    expect(
      within(dialog).getByLabelText("Email").getAttribute("data-slot"),
    ).toBe("input");
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("keeps the email step centered around one full-width primary action", () => {
    render(<AuthModalShell state="email" onEmailSubmit={() => {}} />);

    const dialog = screen.getByRole("dialog", { name: "Sign in" });
    const emailInput = within(dialog).getByLabelText("Email");
    const continueButton = within(dialog).getByRole("button", {
      name: "Continue",
    });

    expect(
      dialog.querySelector('[data-slot="dialog-description"]')?.textContent,
    ).toBe("Use your email to continue checkout.");
    expect(emailInput.getAttribute("inputmode")).toBe("email");
    expect(
      continueButton.classList.contains("auth-modal__primary-action"),
    ).toBe(true);
    expect(within(dialog).queryByRole("button", { name: "Change email" })).toBe(
      null,
    );
  });

  it("marks the email field invalid with shadcn field semantics", async () => {
    const user = userEvent.setup();

    render(<AuthModalShell state="email" onEmailSubmit={() => {}} />);

    const dialog = screen.getByRole("dialog", { name: "Sign in" });

    await user.click(within(dialog).getByRole("button", { name: "Continue" }));

    const emailInput = within(dialog).getByLabelText("Email");

    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(
      dialog.querySelector('[data-slot="field"][data-invalid="true"]'),
    ).toBeTruthy();
    expect(within(dialog).getByRole("alert").textContent).toBe(
      "Enter a valid email address.",
    );
  });

  it("renders register as a split POP MART account surface with tabs, terms, and disabled social auth", async () => {
    const user = userEvent.setup();
    const handleRegister = vi.fn();

    render(<AuthFlowHarness onRegisterSubmit={handleRegister} />);

    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "new.collector@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );

    const registerDialog = screen.getByRole("dialog", {
      name: "Create account",
    });

    expect(
      within(registerDialog).getByRole("img", {
        name: "POP MART account benefits collectible",
      }),
    ).toBeTruthy();
    expect(
      within(registerDialog).getByRole("tablist", {
        name: "Account access mode",
      }),
    ).toBeTruthy();
    expect(
      within(registerDialog)
        .getByRole("tab", { name: "Create account" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(within(registerDialog).getByText("Faster checkout")).toBeTruthy();
    expect(within(registerDialog).getByText("Order updates")).toBeTruthy();
    expect(within(registerDialog).getByText("Wishlist readiness")).toBeTruthy();
    expect(
      (
        within(registerDialog).getByRole("button", {
          name: "Google sign-up unavailable",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        within(registerDialog).getByRole("button", {
          name: "Apple sign-up unavailable",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      within(registerDialog).queryByRole("button", {
        name: "Google sign-up unavailable",
      }),
    ).toBeTruthy();

    await user.type(
      within(registerDialog).getByLabelText("Password"),
      "secret",
    );
    await user.click(
      within(registerDialog).getByRole("button", { name: "Create account" }),
    );

    expect(within(registerDialog).getByRole("alert").textContent).toBe(
      "Accept the terms before creating an account.",
    );
    expect(handleRegister).not.toHaveBeenCalled();

    await user.click(
      within(registerDialog).getByLabelText(
        "I agree to the Terms of Service and Privacy Policy.",
      ),
    );
    await user.click(
      within(registerDialog).getByRole("button", { name: "Create account" }),
    );

    expect(handleRegister).toHaveBeenCalledWith({
      email: "new.collector@example.test",
      password: "secret",
    });
  });

  it("replaces failed register artwork with a buyer-safe fallback", async () => {
    const user = userEvent.setup();

    render(<AuthFlowHarness onRegisterSubmit={() => {}} />);

    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "new.collector@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );

    const registerDialog = screen.getByRole("dialog", {
      name: "Create account",
    });
    fireEvent.error(
      within(registerDialog).getByRole("img", {
        name: "POP MART account benefits collectible",
      }),
    );

    expect(
      within(registerDialog).getByRole("img", {
        name: "POP MART account benefits collectible unavailable",
      }),
    ).toBeTruthy();
    expect(within(registerDialog).getByText("Image unavailable")).toBeTruthy();
  });

  it("keeps the password visibility control inline and reversible", async () => {
    const user = userEvent.setup();

    render(<AuthFlowHarness onRegisterSubmit={() => {}} />);

    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "new.collector@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );

    const registerDialog = screen.getByRole("dialog", {
      name: "Create account",
    });
    const passwordInput = within(registerDialog).getByLabelText("Password");

    expect(passwordInput.getAttribute("type")).toBe("password");
    const showPasswordButton = within(registerDialog).getByRole("button", {
      name: "Show password",
    });
    expect(
      showPasswordButton.classList.contains("auth-modal__password-toggle"),
    ).toBe(true);
    expect(showPasswordButton.textContent).toBe("");
    expect(showPasswordButton.closest(".auth-modal__password-control")).toBe(
      passwordInput.parentElement,
    );
    expect(passwordInput.getAttribute("autocomplete")).toBe("new-password");

    await user.click(showPasswordButton);
    expect(passwordInput.getAttribute("type")).toBe("text");
    await user.click(
      within(registerDialog).getByRole("button", { name: "Hide password" }),
    );
    expect(passwordInput.getAttribute("type")).toBe("password");
  });

  it("uses password-specific loading copy and returns to email through Edit email", async () => {
    const user = userEvent.setup();
    const handlePasswordSubmit = vi.fn(
      () =>
        new Promise<void>(() => {
          // Keep the form pending so the loading label is observable.
        }),
    );

    render(<PasswordFlowHarness onPasswordSubmit={handlePasswordSubmit} />);

    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "alice.la@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );

    const passwordDialog = screen.getByRole("dialog", {
      name: "Enter password",
    });

    expect(
      within(passwordDialog).queryByRole("button", { name: "Change email" }),
    ).toBe(null);
    expect(
      within(passwordDialog).getByRole("button", { name: "Edit email" }),
    ).toBeTruthy();

    await user.type(
      within(passwordDialog).getByLabelText("Password"),
      "collector-secret",
    );
    await user.click(
      within(passwordDialog).getByRole("button", { name: "Sign in" }),
    );

    expect(
      within(passwordDialog).getByRole("button", { name: "Signing in..." }),
    ).toBeTruthy();
    expect(handlePasswordSubmit).toHaveBeenCalledWith({
      email: "alice.la@example.test",
      password: "collector-secret",
    });
  });

  it("preserves the email and clears password state when editing the email", async () => {
    const user = userEvent.setup();

    render(<PasswordFlowHarness onPasswordSubmit={() => {}} />);

    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "alice.la@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );

    const passwordDialog = screen.getByRole("dialog", {
      name: "Enter password",
    });
    await user.type(
      within(passwordDialog).getByLabelText("Password"),
      "temporary-password",
    );
    await user.click(
      within(passwordDialog).getByRole("button", { name: "Edit email" }),
    );

    const returnedEmailDialog = screen.getByRole("dialog", { name: "Sign in" });
    expect(
      (within(returnedEmailDialog).getByLabelText("Email") as HTMLInputElement)
        .value,
    ).toBe("alice.la@example.test");

    await user.click(
      within(returnedEmailDialog).getByRole("button", { name: "Continue" }),
    );

    const returnedPasswordDialog = screen.getByRole("dialog", {
      name: "Enter password",
    });
    expect(
      (
        within(returnedPasswordDialog).getByLabelText(
          "Password",
        ) as HTMLInputElement
      ).value,
    ).toBe("");
  });

  it("uses register-specific loading copy for account creation", async () => {
    const user = userEvent.setup();
    const handleRegister = vi.fn(
      () =>
        new Promise<void>(() => {
          // Keep the form pending so the loading label is observable.
        }),
    );

    render(<AuthFlowHarness onRegisterSubmit={handleRegister} />);

    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "new.collector@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );

    const registerDialog = screen.getByRole("dialog", {
      name: "Create account",
    });

    await user.type(
      within(registerDialog).getByLabelText("Password"),
      "secret",
    );
    await user.click(
      within(registerDialog).getByLabelText(
        "I agree to the Terms of Service and Privacy Policy.",
      ),
    );
    await user.click(
      within(registerDialog).getByRole("button", { name: "Create account" }),
    );

    expect(
      within(registerDialog).getByRole("button", {
        name: "Creating account...",
      }),
    ).toBeTruthy();
  });
});

function AuthFlowHarness({
  onRegisterSubmit,
}: {
  readonly onRegisterSubmit: NonNullable<
    Parameters<typeof AuthModalShell>[0]["onRegisterSubmit"]
  >;
}) {
  const [state, setState] = useState<"email" | "register">("email");

  return (
    <AuthModalShell
      state={state}
      onEmailSubmit={() => {
        setState("register");
      }}
      onChangeEmail={() => {
        setState("email");
      }}
      onRegisterSubmit={onRegisterSubmit}
    />
  );
}

function PasswordFlowHarness({
  onPasswordSubmit,
}: {
  readonly onPasswordSubmit: NonNullable<
    Parameters<typeof AuthModalShell>[0]["onPasswordSubmit"]
  >;
}) {
  const [state, setState] = useState<"email" | "password">("email");

  return (
    <AuthModalShell
      state={state}
      onEmailSubmit={() => {
        setState("password");
      }}
      onChangeEmail={() => {
        setState("email");
      }}
      onPasswordSubmit={onPasswordSubmit}
    />
  );
}
