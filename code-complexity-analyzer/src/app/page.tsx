import { getSession } from "@/lib/session"
import ExpandingHeroSection from "@/components/ExpandingHeroSection"
import Link from "next/link"
import { Link2, Gauge, TrendingUp, ArrowRight, Lock } from "lucide-react"

interface NavProps {
  isAuthenticated: boolean
  login?: string
}

function Navbar({ isAuthenticated, login }: NavProps) {
  return (
    <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e6e0d4] bg-[#f4f1ea]/85 px-6 py-4 backdrop-blur-md md:px-16 lg:px-24">
      <Link
        href="/"
        className="font-mono text-sm tracking-tight text-[#2b2620]"
      >
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
  const steps = [
    {
      icon: Link2,
      n: "01",
      title: "Paste a repo URL",
      copy: "Any public GitHub repository. No install, no tokens, nothing to configure.",
    },
    {
      icon: Gauge,
      n: "02",
      title: "Get scored in seconds",
      copy: "Every JS/TS file is ranked by cyclomatic complexity, LOC and function count.",
    },
    {
      icon: TrendingUp,
      n: "03",
      title: "Track it over time",
      copy: "Sign in to keep your history, watch trends, and compare against older versions.",
    },
  ]

  return (
    <section className="relative z-10 bg-[#faf8f3]/95 px-6 py-24 md:px-16 lg:px-24">
      <div className="mx-auto max-w-5xl">
        <span className="text-xs font-mono tracking-wide text-[#a85c42]">03 — HOW IT WORKS</span>
        <h2 className="mt-4 text-3xl font-bold text-[#2b2620] md:text-4xl">
          Three steps. No setup.
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-[#e6e0d4] bg-white p-7"
            >
              <div className="flex items-center justify-between">
                <step.icon className="h-5 w-5 text-[#c1694f]" />
                <span className="font-mono text-xs text-[#8a8172]">{step.n}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#2b2620]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6f665a]">{step.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
      <ExpandingHeroSection isAuthenticated={!!session} login={session?.login} />
      <HowItWorks isAuthenticated={!!session} />
    </div>
  )
}
