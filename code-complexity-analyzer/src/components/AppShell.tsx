import type { ReactNode } from "react"
import NavBar from "./NavBar"

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
      <NavBar active={active} isAuthenticated={authenticated} />

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