import Link from "next/link"
import {
  ArrowRight,
  Gift,
  GitBranch,
  FolderGit2,
  GitCompare,
  History,
  Share2,
  ShieldCheck,
  TrendingDown,
  Lock,
  TrendingUp,
  Zap,
} from "lucide-react"

// Landing sections 03–05, rendered below HowItWorks. Purely presentational
// server components — demo numbers mirror the real product's metric names,
// complexity thresholds (>40 red, >25 yellow) and trend delta semantics.
// ponytail: one file for all three sections; split when one grows logic

const CARD =
  "rounded-2xl border border-[#e6e0d4]/90 bg-[#faf8f3]/80 p-7 shadow-sm backdrop-blur-md transition-all hover:bg-[#faf8f3]/95"

function SectionHeading({
  index,
  kicker,
  title,
  sub,
}: {
  index: string
  kicker: string
  title: string
  sub: string
}) {
  return (
    <div>
      <span className="font-mono text-xs tracking-wider text-[#a85c42]">
        {index} — {kicker}
      </span>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#2b2620] md:text-5xl">
        {title}
      </h2>
      <p className="mt-3 max-w-lg text-sm md:text-base text-[#6f665a]">{sub}</p>
    </div>
  )
}

/* ===== 03 — Product preview: a static mock of the real report screen ===== */

const MOCK_METRICS = [
  { label: "Total LOC", value: "48,213" },
  { label: "Functions", value: "3,187" },
  { label: "Avg Complexity", value: "4.2" },
  { label: "Files", value: "612" },
]

const MOCK_FILES = [
  { path: "src/services/checkout-service.ts", loc: 842, functions: 61, complexity: 58 },
  { path: "src/state/cartReducer.ts", loc: 396, functions: 18, complexity: 37 },
  { path: "src/auth/session.ts", loc: 214, functions: 12, complexity: 26 },
  { path: "src/lib/apiClient.ts", loc: 168, functions: 9, complexity: 14 },
  { path: "src/utils/formatPrice.ts", loc: 47, functions: 3, complexity: 7 },
]

// Same thresholds as the app's result view: >40 red, >25 yellow, else green
function complexityBadge(complexity: number) {
  if (complexity > 40) return "bg-red-500"
  if (complexity > 25) return "bg-yellow-500"
  return "bg-green-500"
}

export function ProductPreview() {
  return (
    <section className="relative z-10 px-6 py-28 md:px-16 lg:px-24">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          index="03"
          kicker="THE FULL REPORT, NOT A VAGUE SCORE"
          title="This is what lands in your browser."
          sub="No vague grade, no black box. Aggregate metrics up top, your most complex files ranked below — every number traceable to a real file."
        />

        <div className="mt-16 rounded-3xl border border-[#e6e0d4]/80 bg-[#faf8f3]/85 p-6 shadow-sm backdrop-blur-md md:p-10">
          {/* Mock report header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e6e0d4]/80 pb-6">
            <div className="flex items-center gap-3">
              <GitBranch className="h-5 w-5 text-[#c1694f]" />
              <div>
                <p className="font-mono text-sm font-semibold text-[#2b2620]">acme/checkout</p>
                <p className="text-xs text-[#8a8172]">248 commits · analyzed just now</p>
              </div>
            </div>
            <span className="rounded-lg border border-[#d8d2c4] bg-[#faf8f3] px-4 py-2 text-sm font-medium text-[#8a8172]">
              Analyze Another
            </span>
          </div>

          {/* Metric tiles */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {MOCK_METRICS.map((m) => (
              <div key={m.label} className="rounded-xl border border-[#e6e0d4]/80 bg-white/70 p-4">
                <p className="text-sm text-[#6f665a]">{m.label}</p>
                <p className="mt-1 text-2xl font-bold text-[#2b2620]">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Top complex files */}
          <h3 className="mt-8 text-lg font-semibold text-[#2b2620]">
            Top 5 Most Complex Files
          </h3>
          <div className="mt-4 divide-y divide-[#e6e0d4]/80 overflow-hidden rounded-xl border border-[#e6e0d4]/80 bg-white/70">
            {MOCK_FILES.map((file) => (
              <div
                key={file.path}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <p className="truncate font-mono text-sm text-[#2b2620]">{file.path}</p>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <p className="hidden text-xs text-[#8a8172] sm:block">
                    {file.loc} LOC · {file.functions} fns
                  </p>
                  <span
                    className={`flex h-7 w-11 items-center justify-center rounded-full text-xs font-semibold text-white ${complexityBadge(file.complexity)}`}
                  >
                    {file.complexity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center font-mono text-xs text-[#8a8172]">
          STATIC DEMO — YOUR REPO&apos;S REAL NUMBERS IN &lt;10S
        </p>
      </div>
    </section>
  )
}

/* ===== 04 — Trends teaser: why signing in is worth it ===== */

const TREND_ROWS = [
  {
    label: "Avg Complexity",
    from: "5.1",
    to: "4.2",
    delta: "-0.9 (-17.6%)",
    tone: "good" as const,
    Icon: TrendingDown,
  },
  {
    label: "Total LOC",
    from: "46,981",
    to: "48,185",
    delta: "+1,204 (+2.6%)",
    tone: "bad" as const,
    Icon: TrendingUp,
  },
  {
    label: "Functions",
    from: "3,098",
    to: "3,187",
    delta: "+89 (+2.9%)",
    tone: "neutral" as const,
    Icon: TrendingUp,
  },
]

// Same semantics as the app's TrendCard: complexity down = good (green),
// LOC up = bad (red), functions = neutral (gray)
const TONE_CLASSES = {
  good: "bg-green-100 text-green-700",
  bad: "bg-red-100 text-red-700",
  neutral: "bg-gray-100 text-gray-700",
}

const PERKS = [
  {
    Icon: History,
    title: "Every run saved",
    text: "Each analysis lands in your history — no more screenshotting scores.",
  },
  {
    Icon: GitCompare,
    title: "Side-by-side compare",
    text: "Diff any two runs and see exactly which files got heavier.",
  },
  {
    Icon: Share2,
    title: "Shareable reports",
    text: "Publish a read-only link so the whole team sees the same hotspots.",
  },
]

export function TrendsTeaser({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative z-10 px-6 py-28 md:px-16 lg:px-24">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          index="04"
          kicker="COMPLEXITY IS A TREND, NOT A SNAPSHOT"
          title="Watch the drift. Then pull it back."
          sub="A single score tells you where you are. Re-run the same repo over time and the deltas tell you where you're heading."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Mock trend card */}
          <div className={CARD}>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#2b2620]">
                Trend vs. previous analysis
              </h3>
              <p className="text-sm text-[#8a8172]">Jun 03, 2026 compared with Mar 12, 2026</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {TREND_ROWS.map((row) => (
                <div key={row.label} className="flex flex-col gap-1">
                  <p className="text-sm text-[#6f665a]">{row.label}</p>
                  <p className="text-lg font-bold text-[#2b2620]">
                    {row.from} <span className="text-[#8a8172]">→</span> {row.to}
                  </p>
                  <div
                    className={`flex w-fit items-center gap-1 rounded px-2 py-1 ${TONE_CLASSES[row.tone]}`}
                  >
                    <row.Icon size={14} />
                    <span className="text-sm font-semibold">{row.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Why sign in */}
          <div className={`flex flex-col justify-between gap-8 ${CARD}`}>
            <div className="space-y-6">
              {PERKS.map((perk) => (
                <div key={perk.title} className="flex gap-4">
                  <perk.Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#c1694f]" />
                  <div>
                    <h3 className="font-semibold text-[#2b2620]">{perk.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#6f665a]">{perk.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d9a441] px-6 py-3 font-semibold text-[#2b2620] transition-colors hover:bg-[#cc9738]"
              >
                Open your history
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <a
                href="/api/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d9a441] px-6 py-3 font-semibold text-[#2b2620] transition-colors hover:bg-[#cc9738]"
              >
                <Lock className="h-4 w-4" />
                Sign in with GitHub
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ===== 05 — Trust FAQ + final CTA ===== */

const FAQS = [
  {
    Icon: ShieldCheck,
    q: "Is my code stored?",
    a: "No. Repos are cloned into a throwaway serverless sandbox, scored in memory, and discarded — zero code stored on our servers. Only the resulting metrics are kept.",
  },
  {
    Icon: Zap,
    q: "How fast is it?",
    a: "Most repositories are scored in under 10 seconds. Shallow clones fetch only recent history, which keeps even large repos quick.",
  },
  {
    Icon: Gift,
    q: "What does it cost?",
    a: "Nothing to try: one free analysis per session, no login required. Sign in with GitHub for unlimited analyses, history, trends and sharing.",
  },
  {
    Icon: FolderGit2,
    q: "Which repositories work?",
    a: "Any public GitHub repository. Paste the URL — zero install, no tokens required, and nothing to configure.",
  },
]

export function TrustFaq({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative z-10 px-6 py-28 md:px-16 lg:px-24">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          index="05"
          kicker="STRAIGHT ANSWERS"
          title="Before you paste a link."
          sub="The four questions everyone asks, answered without the marketing gloss."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {FAQS.map((faq) => (
            <div key={faq.q} className={CARD}>
              <div className="flex items-center justify-between">
                <faq.Icon className="h-5 w-5 text-[#c1694f]" />
                <span className="font-mono text-xs text-[#8a8172]">Q</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#2b2620]">{faq.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6f665a]">{faq.a}</p>
            </div>
          ))}
        </div>

        {/* Final CTA — closes the page the way the hero opens it */}
        <div className="mt-24 flex flex-col items-center justify-center gap-4 rounded-3xl border border-[#e6e0d4]/80 bg-[#faf8f3]/85 p-10 text-center shadow-sm backdrop-blur-md">
          <h3 className="text-2xl font-bold text-[#2b2620] md:text-3xl">
            Find your worst file.
          </h3>
          <p className="max-w-md text-sm text-[#6f665a]">
            Paste a public GitHub link — complexity, LOC and hotspot rankings in seconds.
          </p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-[#d9a441] px-7 py-3.5 font-semibold text-[#2b2620] transition-colors hover:bg-[#cc9738]"
          >
            {isAuthenticated ? "Analyze Repository" : "Try Free Analysis"}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!isAuthenticated && (
            <p className="font-mono text-xs text-[#8a8172]">
              FREE: ONE ANALYSIS PER SESSION, NO LOGIN REQUIRED
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
