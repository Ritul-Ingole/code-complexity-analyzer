import { getSession } from "@/lib/session"
import HeroSection from "@/components/hero/HeroSection"
import { ProductPreview, TrendsTeaser, TrustFaq } from "@/components/hero/LandingSections"
import ScrollReveal from "@/components/ScrollReveal"
import NavBar from "@/components/NavBar"
import Link from "next/link"
import { Link2, Gauge, TrendingUp } from "lucide-react"
import IntroLoader from "@/components/hero/IntroLoader"

// Card system: "double-bezel" — an outer shell with a hairline ring and
// padding, an inner core with its own surface and concentric radius.
// No backdrop-blur on scrolling content (GPU repaints); solid paper instead.
const STEP_SHELL =
  "rounded-[1.625rem] bg-white/40 p-1.5 ring-1 ring-[#e6e0d4] shadow-[0_1px_2px_rgba(43,38,32,0.04),0_16px_40px_-24px_rgba(43,38,32,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1"
const STEP_CORE =
  "rounded-[1.25rem] bg-[#faf8f3] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"

function StepCard({
  icon,
  step,
  title,
  children,
}: {
  icon: React.ReactNode
  step: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className={STEP_SHELL}>
      <div className={STEP_CORE}>
        <div className="flex items-start justify-between">
          <span className="font-display text-5xl font-semibold leading-none text-[#c1694f]">
            {step}
          </span>
          <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f1ea] text-[#c1694f]">
            {icon}
          </span>
        </div>
        <h3 className="mt-5 text-lg font-semibold text-[#2b2620]">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#6f665a]">{children}</p>
      </div>
    </div>
  )
}

function HowItWorks() {
  return (
    <section className="relative z-10 min-h-[150vh] px-6 py-28 md:px-16 lg:px-24 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-7xl">
        {/* Section title */}
        <ScrollReveal>
          <div className="text-center md:text-left">
            <span className="font-mono text-xs tracking-wider text-[#a85c42]">
              02 — THREE STEPS, INSTANT CLARITY
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2b2620] text-balance md:text-5xl">
              From complex graph to pure signal.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-[#6f665a] md:mx-0 md:text-base text-pretty">
              Watch hundreds of files, imports, and dependencies collapse into a unified
              score, then explode into prioritized hotspots.
            </p>
          </div>
        </ScrollReveal>

        {/* Split container: Left Column, Open Center Corridor (for 3D scene), Right Column */}
        <div className="relative mt-16 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_minmax(280px,380px)_1fr]">
          <div className="spine-line hidden lg:block" />
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <ScrollReveal delay={0}>
              <StepCard
                icon={<Link2 className="h-4 w-4" strokeWidth={1.5} />}
                step="01"
                title="Paste any repo URL"
              >
                Point to any public GitHub repository. Zero install, no tokens required, and
                nothing to configure.
              </StepCard>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <StepCard
                icon={<Gauge className="h-4 w-4" strokeWidth={1.5} />}
                step="02"
                title="Condense into core metrics"
              >
                AST parsing condenses thousands of lines into cyclomatic complexity, Halstead
                volume, and maintainability indices in seconds.
              </StepCard>
            </ScrollReveal>
          </div>

          {/* Center Corridor: deliberately transparent & open so the 3D sphere & particle burst shine through */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden h-[460px] w-full lg:flex items-center justify-center"
          >
            <div className="corridor-ring h-48 w-48 rounded-full border border-[#c1694f]/15" />
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <ScrollReveal delay={0}>
              <StepCard
                icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
                step="03"
                title="Surface the hotspots"
              >
                Watch the complexity field burst open into prioritized file ranks, warning
                indicators, and concrete refactoring opportunities.
              </StepCard>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className={STEP_SHELL}>
                <div className={STEP_CORE}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#c1694f]">FAST &amp; SECURE</span>
                    <span className="font-mono text-xs text-[#8a8172]">STATS</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#2b2620]">
                    Built for rapid feedback
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6f665a]">
                    Serverless AWS Lambda backend scores large repositories in &lt;10s with zero
                    code stored on our servers.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <footer className="relative z-10 border-t border-[#e6e0d4] px-6 py-10 md:px-16 lg:px-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="font-mono text-xs text-[#8a8172]">
          © {new Date().getFullYear()} code·complexity
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/analyze"
            className="text-xs font-medium text-[#6f665a] transition-colors hover:text-[#2b2620]"
          >
            Analyze
          </Link>
          {isAuthenticated && (
            <Link
              href="/history"
              className="text-xs font-medium text-[#6f665a] transition-colors hover:text-[#2b2620]"
            >
              History
            </Link>
          )}
        </div>
        <span className="font-mono text-xs text-[#8a8172]">
          Public GitHub repositories · JavaScript &amp; TypeScript
        </span>
      </div>
    </footer>
  )
}

export default async function Home() {
  const session = await getSession()

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <IntroLoader />
      <NavBar isAuthenticated={!!session} login={session?.login} />
      <HeroSection isAuthenticated={!!session} login={session?.login} />
      <HowItWorks />
      <ProductPreview />
      <TrendsTeaser isAuthenticated={!!session} />
      <TrustFaq isAuthenticated={!!session} />
      <Footer isAuthenticated={!!session} />
    </div>
  )
}
