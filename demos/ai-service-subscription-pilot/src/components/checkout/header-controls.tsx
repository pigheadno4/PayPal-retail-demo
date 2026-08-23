"use client";

import { useState, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function subscribeToColorScheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function HeaderControls() {
  const systemDark = useSyncExternalStore(subscribeToColorScheme, () => window.matchMedia("(prefers-color-scheme: dark)").matches, () => false);
  const [chosenTheme, setChosenTheme] = useState<Theme | null>(null);
  const theme: Theme = chosenTheme ?? (systemDark ? "dark" : "light");
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setChosenTheme(next);
    document.documentElement.dataset.theme = next;
  }
  return <div className="header-actions"><button className="theme-toggle" aria-label="Toggle theme" aria-pressed={theme === "dark"} onClick={toggleTheme}>{theme === "dark" ? "☀" : "◐"}</button><span className="header-separator" aria-hidden="true" /><span className="account-cue">Demo account</span></div>;
}
