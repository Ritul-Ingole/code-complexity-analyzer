import Link from "next/link"
import type { ReactNode } from "react"

export default function AppShell({
  children,
  active,
  authenticated = true
}: {
  children: ReactNode;
  active: "analyze" | "dashboard";
  authenticated?: boolean
}) {
  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link className="app-brand" href="/">
          code<span>·</span>complexity
        </Link>
        
        <nav aria-label="Main navigation">
          <Link 
            href="/analyze" 
            aria-current={active === "analyze" ? "page" : undefined}
          >
            Analyze
          </Link>
          
          {authenticated ? (
            <>
              <Link 
                href="/dashboard" 
                aria-current={active === "dashboard" ? "page" : undefined}
              >
                History
              </Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit">Logout</button>
              </form>
            </>
          ) : (
            <Link href="/api/auth/login">
              Sign in ↗
            </Link>
          )}
        </nav>
      </header>

      <main className="app-main">
        {children}
      </main>

      <footer className="app-footer">
        <span>Less complexity. More clarity.</span>
        <span>Public GitHub repositories · JavaScript &amp; TypeScript</span>
      </footer>
    </div>
  )
}