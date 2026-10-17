import type { ReactNode } from "react"
import NavBar from "./NavBar"

export default function AppShell({
  children,
  active,
  authenticated = true,
  login
}: {
  children: ReactNode;
  active: "analyze" | "history";
  authenticated?: boolean;
  login?: string | null
}) {
  return (
    <div className="app-shell">
      <NavBar active={active} isAuthenticated={authenticated} login={login} />

      <main className="app-main ui-route-enter">
        {children}
      </main>

      <footer className="app-footer">
        <span>Less complexity. More clarity.</span>
        <span>Public GitHub repositories · JavaScript &amp; TypeScript</span>
      </footer>
    </div>
  )
}