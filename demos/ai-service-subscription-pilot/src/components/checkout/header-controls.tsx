"use client";

import { useState } from "react";

export function HeaderControls() {
  const [dark, setDark] = useState(false);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
  }
  return <div className="header-actions"><button className="theme-toggle" aria-label="Toggle theme" aria-pressed={dark} onClick={toggleTheme}>{dark ? "☀" : "◐"}</button><span className="header-separator" aria-hidden="true" /><span className="account-cue">Demo account</span></div>;
}
