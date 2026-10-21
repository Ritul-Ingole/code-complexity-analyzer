"use client"

// Last-resort boundary: replaces the root layout on failure, so it renders
// its own html/body and uses inline styles — global CSS may not have loaded.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "var(--font-sans), Arial, sans-serif", padding: "var(--ui-space-6)" }}>
        <h1>Something went wrong</h1>
        <p role="alert">Please try again.</p>
        <button type="button" onClick={reset}>Try again</button>
      </body>
    </html>
  )
}
