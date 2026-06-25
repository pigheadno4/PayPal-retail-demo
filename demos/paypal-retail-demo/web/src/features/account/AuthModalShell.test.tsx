// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
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
        statusMessage="Enter your email to continue."
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
    ).toBe("Enter your email to continue.");
    expect(dialog.querySelector('[data-slot="field-group"]')).toBeTruthy();
    expect(dialog.querySelectorAll('[data-slot="field"]')).toHaveLength(1);
    expect(dialog.querySelector("form")?.noValidate).toBe(true);
    expect(
      within(dialog).getByLabelText("Email").getAttribute("data-slot"),
    ).toBe("input");
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
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

  it("keeps the password visibility control explicit and reversible", async () => {
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
    await user.click(
      within(registerDialog).getByRole("button", { name: "Show password" }),
    );
    expect(passwordInput.getAttribute("type")).toBe("text");
    await user.click(
      within(registerDialog).getByRole("button", { name: "Hide password" }),
    );
    expect(passwordInput.getAttribute("type")).toBe("password");
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
