import { getSession } from "@/lib/session"
import HeroSection from "@/components/hero/HeroSection"
import Link from "next/link"
import { Link2, Gauge, TrendingUp, ArrowRight, Lock } from "lucide-react"

interface NavProps {
  isAuthenticated: boolean
  login?: string
}

function Navbar({ isAuthenticated, login }: NavProps) {
  return (
    <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e6e0d4] bg-[#f4f1ea]/85 px-6 py-4 backdrop-blur-md md:px-16 lg:px-24">
      <Link href="/" className="font-mono text-sm tracking-tight text-[#2b2620]">
        code<span className="text-[#c1694f]">·</span>complexity
      </Link>
      <div className="flex items-center gap-5">
        <Link
          href="/analyze"
          className="text-sm text-[#6f665a] transition-colors hover:text-[#2b2620]"
        >
          Analyze
        </Link>
        {isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              className="text-sm text-[#6f665a] transition-colors hover:text-[#2b2620]"
            >
              History
            </Link>
            <span className="font-mono text-xs text-[#a85c42]">{login}</span>
          </>
        ) : (
          <a
            href="/api/auth/login"
            className="flex items-center gap-1.5 rounded-full border border-[#d8d2c4] bg-[#faf8f3] px-4 py-1.5 text-xs font-medium text-[#2b2620] transition-colors hover:border-[#a89f8c]"
          >
            <Lock className="h-3 w-3" />
            Sign in
          </a>
        )}
      </div>
    </nav>
  )
}

function HowItWorks({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative z-10 min-h-[150vh] px-6 py-28 md:px-16 lg:px-24 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-7xl">
        {/* Section title */}
        <div className="text-center md:text-left">
          <span className="font-mono text-xs tracking-wider text-[#a85c42]">
            02 — THREE STEPS, INSTANT CLARITY
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#2b2620] md:text-5xl">
            From complex graph to pure signal.
          </h2>
          <p className="mt-3 max-w-lg text-sm md:text-base text-[#6f665a]">
            Watch hundreds of files, imports, and dependencies collapse into a unified
            score, then explode into prioritized hotspots.
          </p>
        </div>

        {/* Split container: Left Column, Open Center Corridor (for 3D scene), Right Column */}
        <div className="mt-16 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_minmax(280px,380px)_1fr]">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-[#e6e0d4]/90 bg-[#faf8f3]/80 p-7 shadow-sm backdrop-blur-md transition-all hover:bg-[#faf8f3]/95">
              <div className="flex items-center justify-between">
                <Link2 className="h-5 w-5 text-[#c1694f]" />
                <span className="font-mono text-xs text-[#8a8172]">01</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#2b2620]">Paste any repo URL</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6f665a]">
                Point to any public GitHub repository. Zero install, no tokens required, and nothing
                to configure.
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6e0d4]/90 bg-[#faf8f3]/80 p-7 shadow-sm backdrop-blur-md transition-all hover:bg-[#faf8f3]/95">
              <div className="flex items-center justify-between">
                <Gauge className="h-5 w-5 text-[#c1694f]" />
                <span className="font-mono text-xs text-[#8a8172]">02</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#2b2620]">
                Condense into core metrics
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6f665a]">
                AST parsing condenses thousands of lines into cyclomatic complexity, Halstead volume,
                and maintainability indices in seconds.
              </p>
            </div>
          </div>

          {/* Center Corridor: deliberately transparent & open so 3D sphere & particle burst shine through */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden h-[460px] w-full lg:flex items-center justify-center"
          >
            {/* Visual focal guide (subtle subtle ring outline) */}
            <div className="h-48 w-48 rounded-full border border-[#c1694f]/15" />
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-[#e6e0d4]/90 bg-[#faf8f3]/80 p-7 shadow-sm backdrop-blur-md transition-all hover:bg-[#faf8f3]/95">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 text-[#c1694f]" />
                <span className="font-mono text-xs text-[#8a8172]">03</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#2b2620]">Surface the hotspots</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6f665a]">
                Watch the complexity field burst open into prioritized file ranks, warning indicators,
                and concrete refactoring opportunities.
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6e0d4]/90 bg-[#faf8f3]/80 p-7 shadow-sm backdrop-blur-md transition-all hover:bg-[#faf8f3]/95">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#c1694f]">FAST & SECURE</span>
                <span className="font-mono text-xs text-[#8a8172]">STATS</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#2b2620]">
                Built for rapid feedback
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6f665a]">
                Serverless AWS Lambda backend scores large repositories in &lt;10s with zero code
                stored on our servers.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Action Card */}
        <div className="mt-24 flex flex-col items-center justify-center gap-4 rounded-3xl border border-[#e6e0d4]/80 bg-[#faf8f3]/85 p-10 text-center shadow-sm backdrop-blur-md sm:flex-row">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-[#d9a441] px-7 py-3.5 font-semibold text-[#2b2620] transition-colors hover:bg-[#cc9738]"
          >
            Analyze your first repo
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!isAuthenticated && (
            <a
              href="/api/auth/login"
              className="text-sm font-medium text-[#6f665a] underline underline-offset-4 transition-colors hover:text-[#2b2620]"
            >
              or sign in for unlimited analyses
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

export default async function Home() {
  const session = await getSession()

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <Navbar isAuthenticated={!!session} login={session?.login} />
      <HeroSection isAuthenticated={!!session} login={session?.login} />
      <HowItWorks isAuthenticated={!!session} />
    </div>
  )
}
