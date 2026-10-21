import Link from "next/link"

export default function NotFound() {
  return (
    <main className="app-shell">
      <section className="app-main" aria-labelledby="not-found-title">
        <h1 id="not-found-title">Page not found</h1>
        <p>The address may be incorrect or the page is no longer available.</p>
        <Link href="/" className="primary-action">Return home</Link>
      </section>
    </main>
  )
}
