"use client"

import Link from "next/link"
import { Check, ShieldCheck, Sparkles, ArrowRight } from "lucide-react"
import ScrollReveal from "@/components/ScrollReveal"
import Magnetic from "@/components/Magnetic"
import AnimatedCounter from "@/components/AnimatedCounter"

const CARD =
  "rounded-2xl border border-[#e6e0d4]/90 bg-[#faf8f3]/80 p-7 shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-[#faf8f3]/95 hover:shadow-md hover:border-[#c1694f]/30"

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
    a: "JavaScript and TypeScript today, including JSX/TSX. Support for additional AST-parseable languages is on the roadmap.",
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
    a: "Public GitHub repositories only for now. Private repo support with scoped tokens is planned for a future release.",
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
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#2b2620] md:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-lg text-sm md:text-base text-[#6f665a] md:mx-0 mx-auto">
            {description}
          </p>
        )}
      </div>
    </ScrollReveal>
  )
}

const MetricTile = ({ m }: { m: (typeof MOCK_METRICS)[number] }) => (
  <div className="rounded-xl border border-[#e6e0d4]/80 bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:border-[#c1694f]/30">
    <p className="text-sm text-[#6f665a]">{m.label}</p>
    <p className="mt-1 font-display text-2xl font-semibold text-[#2b2620]">
      <AnimatedCounter value={m.value} decimals={m.decimals} />
    </p>
  </div>
)

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

          <ScrollReveal delay={0}>
            <div className={CARD}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#8a8172]">ANALYSIS SUMMARY</span>
                <Sparkles className="h-4 w-4 text-[#c1694f]" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {MOCK_METRICS.map((m) => (
                  <MetricTile key={m.label} m={m} />
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Corridor: deliberately transparent so the fixed 3D sphere & particle burst shine through uninterrupted */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden h-[420px] w-full lg:block"
          />

          <ScrollReveal delay={100}>
            <div className={CARD}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#8a8172]">TREND VS. LAST RUN</span>
                <ShieldCheck className="h-4 w-4 text-[#4d7142]" />
              </div>
              <div className="mt-5 space-y-3">
                {TREND_ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-xl border border-[#e6e0d4]/80 bg-white/70 px-4 py-3 transition-all hover:border-[#c1694f]/30"
                  >
                    <span className="text-sm text-[#4a4238]">{row.label}</span>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        row.positive ? "text-[#4d7142]" : "text-[#b4493d]"
                      }`}
                    >
                      {row.delta}
                    </span>
                  </div>
                ))}
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
          <div className={`${CARD} mt-12`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#4d7142]" />
                <span className="text-sm font-medium text-[#2b2620]">
                  Improving over last 3 analyses
                </span>
              </div>
              <span className="font-mono text-xs text-[#8a8172]">acme/web-client</span>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TREND_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-[#e6e0d4]/80 bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:border-[#c1694f]/30"
                >
                  <p className="text-xs text-[#8a8172]">{row.label}</p>
                  <p
                    className={`mt-1 font-mono text-sm font-semibold ${
                      row.positive ? "text-[#4d7142]" : "text-[#b4493d]"
                    }`}
                  >
                    {row.delta}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {!isAuthenticated && (
          <ScrollReveal delay={160}>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#e6e0d4]/80 bg-[#faf8f3]/70 p-8 text-center sm:flex-row">
              <p className="text-sm text-[#6f665a]">
                Sign in with GitHub to start tracking your repositories' trends.
              </p>
              <Magnetic>
                <a
                  href="/api/auth/login"
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#d8d2c4] bg-white px-5 py-2.5 text-sm font-semibold text-[#2b2620] transition-colors hover:border-[#a89f8c]"
                >
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Magnetic>
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

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FAQS.map((faq, idx) => (
            <ScrollReveal key={faq.q} delay={idx * 80}>
              <div className={CARD}>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#c1694f]" />
                  <h3 className="text-base font-semibold text-[#2b2620]">{faq.q}</h3>
                </div>
                <p className="mt-2 pl-6 text-sm leading-relaxed text-[#6f665a]">{faq.a}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={160}>
          <div className="mt-16 flex flex-col items-center justify-center gap-4 rounded-3xl border border-[#e6e0d4]/80 bg-[#faf8f3]/85 p-10 text-center shadow-sm backdrop-blur-md sm:flex-row">
            <Magnetic>
              <Link
                href="/analyze"
                className="inline-flex items-center gap-2 rounded-lg bg-[#d9a441] px-7 py-3.5 font-semibold text-[#2b2620] transition-colors hover:bg-[#cc9738]"
              >
                Analyze your first repo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Magnetic>
            {!isAuthenticated && (
              <a
                href="/api/auth/login"
                className="text-sm font-medium text-[#6f665a] underline underline-offset-4 transition-colors hover:text-[#2b2620]"
              >
                or sign in for unlimited analyses
              </a>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
