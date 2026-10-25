"use client"

import Link from "next/link"
import { Check, ShieldCheck, Sparkles, ArrowRight, Link2, Gauge, TrendingUp } from "lucide-react"
import ScrollReveal from "@/components/ScrollReveal"
import AnimatedCounter from "@/components/AnimatedCounter"
import AuthLink from "@/components/AuthLink"

// Double-bezel card system: outer shell (hairline ring + padding) and inner
// core (own surface, concentric radius). Solid paper — no backdrop-blur on
// scrolling content. Slight lift + tinted shadow on hover, custom easing.
const SHELL =
  "rounded-[1.625rem] bg-white/40 p-1.5 ring-1 ring-[#e6e0d4] shadow-[0_1px_2px_rgba(43,38,32,0.04),0_16px_40px_-24px_rgba(43,38,32,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1"
const CORE = "rounded-[1.25rem] bg-[#faf8f3] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
// Same card visuals without the hover-lift — used by step cards that deliberately have no hover state
const SHELL_STATIC =
  "rounded-[1.625rem] bg-white/40 p-1.5 ring-1 ring-[#e6e0d4] shadow-[0_1px_2px_rgba(43,38,32,0.04),0_16px_40px_-24px_rgba(43,38,32,0.2)]"

const MOCK_METRICS: Array<{ label: string; value: number; decimals: number }> = [
  { label: "Total LOC", value: 48213, decimals: 0 },
  { label: "Functions", value: 3187, decimals: 0 },
  { label: "Avg Complexity", value: 4.2, decimals: 1 },
  { label: "Files", value: 612, decimals: 0 },
]

const TREND_ROWS = [
  { label: "Avg Complexity", delta: "-0.9 (-17.6%)", positive: true },
  { label: "Total LOC", delta: "+1,204 (+2.6%)", positive: false },
  { label: "Functions", delta: "+58 (+1.9%)", positive: false },
]

const FAQS = [
  {
    q: "Which languages are supported?",
    a: "JavaScript and TypeScript today, including JSX/TSX. Support for other AST-parseable languages is not available yet.",
  },
  {
    q: "Do you store my source code?",
    a: "No. Files are parsed in-memory for metrics only; nothing is written to disk or retained after the analysis completes.",
  },
  {
    q: "How long is history kept?",
    a: "Signed-in analyses are retained for 30 days so you can track complexity trends over time, then automatically expire.",
  },
  {
    q: "Can I analyze private repositories?",
    a: "Public GitHub repositories only for now. Private repo support with scoped access tokens is not available yet.",
  },
]

function SectionHeading({
  kicker,
  title,
  description,
}: {
  kicker: string
  title: string
  description?: string
}) {
  return (
    <ScrollReveal>
      <div className="text-center md:text-left">
        <span className="font-mono text-xs tracking-wider text-[#a85c42]">{kicker}</span>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2b2620] text-balance md:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#6f665a] md:mx-0 md:text-base text-pretty">
            {description}
          </p>
        )}
      </div>
    </ScrollReveal>
  )
}

const MetricTile = ({ m }: { m: (typeof MOCK_METRICS)[number] }) => (
  <div className="rounded-xl border border-[#e6e0d4]/80 bg-white/70 p-4 transition-[transform,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-[#c1694f]/30">
    <p className="text-sm text-[#6f665a]">{m.label}</p>
    <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#2b2620]">
      <AnimatedCounter value={m.value} decimals={m.decimals} />
    </p>
  </div>
)

const StepCard = ({
  icon,
  step,
  title,
  children,
}: {
  icon: React.ReactNode
  step: string
  title: string
  children: React.ReactNode
}) => (
  <div className={`${SHELL_STATIC} h-full`}>
    <div className={`${CORE} h-full flex flex-col`}>
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

// ===================== 02 — How It Works =====================
export function HowItWorks() {
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
        <div className="relative mt-16 grid grid-cols-1 items-center gap-x-8 gap-y-6 lg:grid-cols-[1fr_minmax(280px,380px)_1fr]">
          <div className="spine-line hidden lg:block" />

          {/* One flat grid: the DOM order (01, 02, 03, FAST) is also the reading and
              stacking order at every width, and the lg:* placement classes reproduce
              the original two-column arc on desktop. */}
            <ScrollReveal
              delay={0}
              direction="left"
              className="h-[17rem] lg:col-start-1 lg:row-start-1"
              rootMargin="0px 0px 15% 0px"
            >
              <StepCard
                icon={<Link2 className="h-4 w-4" strokeWidth={1.5} />}
                step="01"
                title="Paste any repo URL"
              >
                Point to any public GitHub repository. Zero install, no tokens required, and
                nothing to configure.
              </StepCard>
            </ScrollReveal>

            <ScrollReveal
              delay={150}
              direction="right"
              className="h-[17rem] lg:col-start-3 lg:row-start-1"
              rootMargin="0px 0px 15% 0px"
            >
              <StepCard
                icon={<Gauge className="h-4 w-4" strokeWidth={1.5} />}
                step="02"
                title="Condense into core metrics"
              >
                AST parsing condenses thousands of lines into cyclomatic complexity, lines of
                code, and function counts — the three numbers the report leads with.
              </StepCard>
            </ScrollReveal>

            <ScrollReveal
              delay={300}
              direction="left"
              className="h-[17rem] max-lg:mt-2 lg:col-start-1 lg:row-start-2"
              rootMargin="0px 0px 15% 0px"
            >
              <StepCard
                icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
                step="03"
                title="Surface the hotspots"
              >
                Watch the complexity field burst open into prioritized file ranks, warning
                indicators, and concrete refactoring opportunities.
              </StepCard>
            </ScrollReveal>

            <ScrollReveal
              delay={450}
              direction="right"
              className="h-[17rem] lg:col-start-3 lg:row-start-2"
              rootMargin="0px 0px 15% 0px"
            >
              <div className={`${SHELL_STATIC} h-full`}>
                <div className={`${CORE} h-full flex flex-col`}>
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

          {/* Center corridor: deliberately transparent and open so the 3D sphere and
              particle burst shine through. Positioned by grid placement, and last in the
              DOM because it is decorative (aria-hidden). */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden h-[460px] w-full lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex items-center justify-center"
          >
            <div className="corridor-ring h-48 w-48 rounded-full border border-[#c1694f]/15" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ===================== 03 — Product Preview =====================
export function ProductPreview() {
  return (
    <section className="relative z-10 min-h-[140vh] px-6 py-28 md:px-16 lg:px-24">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          kicker="03 — SEE THE SIGNAL, NOT THE NOISE"
          title="A report built for triage, not just data."
          description="Every analysis condenses into a scannable summary, a trend line against your last run, and a ranked list of files worth your attention first."
        />

        {/* Corridor grid: left preview card, transparent center gutter (keeps the fixed 3D scene visible), right preview card */}
        <div className="relative mt-16 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_minmax(200px,320px)_1fr]">
          <div className="spine-line hidden lg:block" />

          <ScrollReveal
            delay={0}
            direction="left"
            className="h-80"
            rootMargin="0px 0px 15% 0px"
          >
            <div className={`${SHELL} h-full lg:-rotate-3 lg:hover:rotate-0`}>
              <div className={`${CORE} h-full flex flex-col`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#8a8172]">ANALYSIS SUMMARY</span>
                  <Sparkles className="h-4 w-4 text-[#c1694f]" strokeWidth={1.5} />
                </div>
                <div className="mt-5 grid flex-1 grid-cols-2 grid-rows-2 gap-3">
                {MOCK_METRICS.map((m) => (
                  <MetricTile key={m.label} m={m} />
                ))}
              </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Corridor: deliberately transparent so the fixed 3D sphere & particle burst shine through uninterrupted */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden h-[420px] w-full lg:block"
          />

          <ScrollReveal
            delay={0}
            direction="right"
            className="h-80"
            rootMargin="0px 0px 15% 0px"
          >
            <div className={`${SHELL} h-full lg:rotate-3 lg:hover:rotate-0`}>
              <div className={`${CORE} h-full flex flex-col`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#8a8172]">TREND VS. LAST RUN</span>
                  <ShieldCheck className="h-4 w-4 text-[#4d7142]" strokeWidth={1.5} />
                </div>
                <div className="mt-5 flex flex-1 flex-col justify-between gap-3">
                  {TREND_ROWS.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-xl border border-[#e6e0d4]/80 bg-white/70 px-4 py-3 transition-colors duration-300 hover:border-[#c1694f]/30"
                    >
                      <span className="text-sm text-[#4a4238]">{row.label}</span>
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          row.positive ? "text-[#4d7142]" : "text-[#b4493d]"
                        }`}
                      >
                        {row.delta}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

// ===================== 04 — Trends Teaser =====================
export function TrendsTeaser({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative z-10 px-6 py-28 md:px-16 lg:px-24">
      <div className="mx-auto w-full max-w-5xl">
        <SectionHeading
          kicker="04 — TRACK IT OVER TIME"
          title="Complexity isn't a single number. It's a direction."
          description="Sign in to keep a 30-day history of every analysis and see whether your codebase is trending toward clarity or toward risk."
        />

        <ScrollReveal delay={80}>
          <div className={`${SHELL} mt-12`}>
            <div className={CORE}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-ui-success" />
                  <span className="text-sm font-medium text-ui-text">
                    Improving over last 3 analyses
                  </span>
                </div>
                <span className="font-mono text-xs text-ui-text-muted">example/repo</span>
              </div>
              {/* The deltas below are fixture data, not a live trend: the label sits
                  with the numbers (not only in the card header) and its 16px line is
                  paid for by the grid losing mt-6 → mt-1, so the section height — and
                  therefore the Orb's scroll progress — stays identical. */}
              <p className="mt-1 text-xs text-ui-text-muted">Illustrative example, not live data</p>
              <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TREND_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-xl border border-ui-border bg-white/70 p-4 hover:border-ui-accent"
                  >
                    <p className="text-xs text-ui-text-muted">{row.label}</p>
                    <p
                      className={`mt-1 font-mono text-sm font-semibold tabular-nums ${
                        row.positive ? "text-ui-success" : "text-ui-danger"
                      }`}
                    >
                      {row.delta}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {!isAuthenticated && (
          <ScrollReveal delay={160}>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-2xl border border-ui-border bg-ui-surface p-8 text-center sm:flex-row">
              <p className="text-sm text-ui-secondary">
                Sign in with GitHub to start tracking your repositories&apos; trends.
              </p>
              <AuthLink next="/" className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-ui-border-strong bg-ui-surface-raised px-5 py-2.5 text-sm font-semibold text-ui-text hover:border-ui-taupe-faint">
                Sign in
                <ArrowRight className="h-4 w-4" />
              </AuthLink>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  )
}

// ===================== 05 — Trust / FAQ =====================
export function TrustFaq({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative z-10 px-6 py-28 md:px-16 lg:px-24">
      <div className="mx-auto w-full max-w-5xl">
        <SectionHeading kicker="05 — QUESTIONS, ANSWERED" title="Built to be trusted with your codebase." />

        {/* Divided list — hairline separators instead of a wall of identical cards */}
        <div className="mt-12 grid grid-cols-1 gap-x-16 sm:grid-cols-2">
          {FAQS.map((faq, idx) => (
            <ScrollReveal key={faq.q} delay={idx * 80}>
              <div className="border-t border-ui-border py-6">
                <div className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-ui-clay-deep" strokeWidth={1.75} />
                  <h3 className="text-base font-semibold text-ui-text">{faq.q}</h3>
                </div>
                <p className="mt-2 pl-6 text-sm leading-relaxed text-ui-secondary">{faq.a}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Closing band — a slightly deeper shade of the same palette, not a theme swap */}
        <ScrollReveal delay={160}>
          <div className="mt-16 rounded-[2.5rem] bg-[#ece5d6] px-6 py-20 text-center ring-1 ring-ui-border">
            <p className="font-mono text-xs tracking-wider text-ui-clay-deep">06 — START NOW</p>
            <h2 className="mx-auto mt-4 max-w-xl font-display text-3xl font-semibold tracking-tight text-ui-text text-balance md:text-4xl">
              Your worst file is one paste away.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-ui-secondary text-pretty">
              Free analysis — no login, no install, and source code is never stored.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4">
              <Link href="/analyze" className="btn-primary">
                Analyze your first repo
                <span className="btn-orb">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
              {!isAuthenticated && (
                <AuthLink next="/" className="text-sm font-medium text-ui-secondary underline underline-offset-4 hover:text-ui-text">
                  or sign in to save your analyses
                </AuthLink>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
