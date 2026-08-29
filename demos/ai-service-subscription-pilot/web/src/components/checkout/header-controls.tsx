import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function HeaderControls() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="header-controls">
      <span className="account-context">Identity first</span>
      <span className="vertical-separator" aria-hidden="true" />
      <button
        className="icon-button"
        type="button"
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        <span aria-hidden="true">{theme === "light" ? "◐" : "☀"}</span>
      </button>
    </div>
  );
}
