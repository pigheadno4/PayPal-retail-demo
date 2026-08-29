import { Route, Routes } from "react-router";

import { HeaderControls } from "./components/checkout/header-controls.js";
import { CheckoutRoute } from "./routes/checkout.js";
import { HomeRoute } from "./routes/home.js";

export function App() {
  return (
    <div className="app-frame">
      <header className="site-header glass-surface">
        <a className="brand" href="/" aria-label="AI Service Studio home">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>AI Service Studio</span>
        </a>
        <HeaderControls />
      </header>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/checkout/:intentId" element={<CheckoutRoute />} />
        <Route path="*" element={<main className="route-status"><h1>Page not found</h1><a href="/">Return home</a></main>} />
      </Routes>
    </div>
  );
}
