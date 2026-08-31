export function ActionConfirmation(props: Readonly<{
  available: number;
  busy: boolean;
  onConfirm: () => void;
  onChooseAnother: () => void;
}>) {
  return (
    <section className="action-confirmation reading-surface" aria-label="Generate answer confirmation">
      <p><strong>Generate answer</strong> costs exactly 10 units.</p>
      <p>{props.available} units now · {Math.max(0, props.available - 10)} units after success</p>
      <div className="workspace-actions">
        <button className="primary-button" type="button" disabled={props.busy} onClick={props.onConfirm}>
          Generate · 10 units
        </button>
        <button className="secondary-button" type="button" disabled={props.busy} onClick={props.onChooseAnother}>
          Choose another prompt
        </button>
      </div>
    </section>
  );
}
