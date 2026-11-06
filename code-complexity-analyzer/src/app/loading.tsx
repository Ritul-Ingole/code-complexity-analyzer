import { AsciiSkeleton } from "ascii-reveal"

export default function WorkspaceLoading() {
  return (
    <main className="app-shell">
      <section className="app-main">
        <p role="status" aria-live="polite">Loading workspace.</p>
        <div aria-hidden="true">
          <AsciiSkeleton as="div" rows={12} width="100%" style={{ minHeight: "var(--ui-chart-height)" }} />
        </div>
      </section>
    </main>
  )
}
