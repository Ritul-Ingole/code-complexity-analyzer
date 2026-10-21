"use client"

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Never render error.message/digest — recovery is the explicit reset action.
  return (
    <main className="app-shell">
      <section className="app-main" aria-labelledby="workspace-error-title">
        <h1 id="workspace-error-title">This workspace could not load</h1>
        <p role="alert">Please try again. Your saved analyses have not been changed by this page.</p>
        <button type="button" className="secondary-action ui-press" onClick={reset}>Try again</button>
        <a href="/" className="ui-link">Return home</a>
      </section>
    </main>
  )
}
