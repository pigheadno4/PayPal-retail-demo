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
      </header>

      <main className="foundation-main">
        <section className="reading-surface foundation-copy">
          <p className="eyebrow">AI service subscription demo</p>
          <h1>Create with a plan shaped around your work.</h1>
          <p className="lede">
            One warm, focused space will bring service access, allowance, and
            account context together.
          </p>
        </section>

        <div className="ambient-panel glass-surface" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </main>
    </div>
  );
}
