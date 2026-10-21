export default function WorkspaceLoading() {
  return (
    <main className="app-shell">
      <section className="app-main">
        <p role="status" aria-live="polite">Loading workspace.</p>
        <div aria-hidden="true" className="ui-skeleton rounded-panel"
          style={{ minHeight: "var(--ui-chart-height)" }} />
      </section>
    </main>
  )
}
