import Link from "next/link"
import { Lock } from "lucide-react"

interface NavBarProps {
  isAuthenticated: boolean
  login?: string
  /** Marks the current page with aria-current + a subtle active pill (app pages). */
  active?: "analyze" | "history"
}

// Site-wide navigation — the same floating glass pill on the landing and the
// app pages, so there is exactly one nav implementation to keep in sync.
export default function NavBar({ isAuthenticated, login, active }: NavBarProps) {
  const linkCls = (isActive: boolean) =>
    `inline-flex items-center rounded-full px-3 py-1.5 text-sm transition-colors ${
      isActive
        ? "bg-white/70 text-[#2b2620]"
        : "text-[#6f665a] hover:bg-white/60 hover:text-[#2b2620]"
    }`

  return (
    <div className="intro-nav sticky top-0 z-30 px-4 pt-4 sm:px-6 md:px-10">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-[#e6e0d4] bg-[#f4f1ea]/50 py-2.5 pl-6 pr-3 shadow-[0_8px_30px_rgba(43,38,32,0.06)] backdrop-blur-md">
        <Link href="/" className="inline-flex items-center font-mono text-sm tracking-tight text-[#2b2620]">
          code<span className="text-[#c1694f]">·</span>complexity
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/analyze"
            aria-current={active === "analyze" ? "page" : undefined}
            className={linkCls(active === "analyze")}
          >
            Analyze
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                href="/history"
                aria-current={active === "history" ? "page" : undefined}
                className={linkCls(active === "history")}
              >
                History
              </Link>
              <span className="hidden font-mono text-xs text-[#a85c42] md:inline">{login}</span>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full border border-[#d8d2c4] bg-[#faf8f3] px-4 py-1.5 text-xs font-medium text-[#2b2620] transition-[border-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-[#a89f8c] active:scale-95"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <a
              href="/api/auth/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d8d2c4] bg-[#faf8f3] px-4 py-1.5 text-xs font-medium text-[#2b2620] transition-[border-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-[#a89f8c] active:scale-95"
            >
              <Lock className="h-3 w-3" />
              Sign in
            </a>
          )}
        </div>
      </nav>
    </div>
  )
}
