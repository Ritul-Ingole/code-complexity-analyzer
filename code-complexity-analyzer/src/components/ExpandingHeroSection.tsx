"use client"

import { useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowRight, Lock, TrendingUp, Zap } from "lucide-react"

const CodeNetworkHero = dynamic(() => import("./three/CodeNetworkHero"), {
  ssr: false,
  loading: () => null,
})

interface ExpandingHeroSectionProps {
  isAuthenticated: boolean
  login?: string
}

// Scroll-driven hero, no animation library: one rAF loop maps scroll
// progress p (0..1 across the sticky range) onto four phases:
//   0.00-0.75  scene expands from right-half framing to full-bleed centered
//   0.10-0.40  node labels fade out
//   0.00-0.40  hero text fades and lifts away
//   0.60-0.85  reveal card fades in over the settled scene
//   0.75-1.00  dwell — scene holds as the centered background before release
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))

export default function ExpandingHeroSection({ isAuthenticated, login }: ExpandingHeroSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const heroTextRef = useRef<HTMLDivElement>(null)
  const revealTextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const canvasWrap = canvasWrapRef.current
    const heroText = heroTextRef.current
    const revealText = revealTextRef.current
    if (!section || !canvasWrap || !heroText || !revealText) return

    let raf = 0
    let last = -1

    const tick = () => {
      const rect = section.getBoundingClientRect()
      const total = section.offsetHeight - window.innerHeight
      const p = total > 0 ? clamp01(-rect.top / total) : 0

      // Write styles only when scroll actually moved — no idle churn
      if (p !== last) {
        last = p

        const expand = range(p, 0, 0.75)
        canvasWrap.style.transform = `translateX(${28 * (1 - expand)}%) scale(${0.8 + 0.2 * expand})`
        canvasWrap.style.setProperty("--label-opacity", String(1 - range(p, 0.1, 0.4)))

        const heroOut = range(p, 0, 0.4)
        heroText.style.opacity = String(1 - heroOut)
        heroText.style.transform = `translateY(${-40 * heroOut}px)`
        // Fully faded hero text must not block clicks on the scene beneath
        heroText.style.visibility = heroOut >= 1 ? "hidden" : "visible"

        revealText.style.opacity = String(range(p, 0.6, 0.85))
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    // Tall wrapper defines how much scroll distance the whole expand sequence consumes.
    <div ref={sectionRef} className="relative h-[240vh] bg-[#f4f1ea]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* 3D scene — hidden on mobile for performance, static fallback shown instead.
            Initial transform matches p=0 so SSR paints the right first frame. */}
        <div
          ref={canvasWrapRef}
          className="absolute inset-0 hidden md:block origin-center will-change-transform"
          style={
            {
              transform: "translateX(28%) scale(0.8)",
              "--label-opacity": "1",
            } as React.CSSProperties
          }
        >
          <CodeNetworkHero />
        </div>
        <div className="md:hidden absolute inset-0 flex items-center justify-center">
          <div className="w-72 h-72 rounded-full bg-gradient-to-br from-[#d9a441]/20 via-[#c1694f]/15 to-[#8a9a5b]/20 blur-2xl" />
        </div>

        {/* Hero text — fades out as the scene expands. pointer-events-none on the
            wrapper so empty space lets mouse-move through to the canvas underneath;
            pointer-events-auto is re-enabled only on the actual content. */}
        <div
          ref={heroTextRef}
          className="relative z-10 h-full flex items-center px-6 md:px-16 lg:px-24 pointer-events-none"
        >
          <div className="max-w-xl pointer-events-auto">
            <div className="inline-flex items-center gap-2 border border-[#d8d2c4] rounded-full px-3 py-1.5 mb-8 bg-[#faf8f3]">
              <Zap className="w-3.5 h-3.5 text-[#c1694f]" />
              <span className="text-xs font-mono text-[#6f665a] tracking-wide">
                STATIC ANALYSIS IN SECONDS
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-[#2b2620] leading-[1.1] mb-6">
              Know where your
              <br />
              codebase <span className="text-[#c1694f]">hurts.</span>
            </h1>

            <p className="text-lg text-[#6f665a] mb-10 max-w-md leading-relaxed">
              Paste a public GitHub repo. Get complexity metrics, hotspot
              rankings, and trend tracking in under 10 seconds.
            </p>

            {!isAuthenticated ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/analyze"
                    className="group inline-flex items-center justify-center gap-2 bg-[#d9a441] hover:bg-[#cc9738] text-[#2b2620] font-semibold px-6 py-3 rounded-lg transition-colors"
                  >
                    Try Free Analysis
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/api/auth/login"
                    className="inline-flex items-center justify-center gap-2 border border-[#d8d2c4] hover:border-[#a89f8c] text-[#2b2620] font-semibold px-6 py-3 rounded-lg transition-colors bg-[#faf8f3]"
                  >
                    <Lock className="w-4 h-4" />
                    Sign in for Unlimited
                  </Link>
                </div>
                <p className="text-xs text-[#8a8172]">
                  Free: one analysis per session, no login required.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-sm text-[#6f665a]">
                  Welcome back, <span className="text-[#c1694f] font-medium">{login}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/analyze"
                    className="group inline-flex items-center justify-center gap-2 bg-[#d9a441] hover:bg-[#cc9738] text-[#2b2620] font-semibold px-6 py-3 rounded-lg transition-colors"
                  >
                    Analyze Repository
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 border border-[#d8d2c4] hover:border-[#a89f8c] text-[#2b2620] font-semibold px-6 py-3 rounded-lg transition-colors bg-[#faf8f3]"
                  >
                    <TrendingUp className="w-4 h-4" />
                    View History
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reveal content — fades in on top of the now-expanded scene */}
        <div
          ref={revealTextRef}
          className="absolute inset-0 z-10 flex items-center justify-center px-6 opacity-0 pointer-events-none"
        >
          <div className="max-w-2xl text-center bg-[#f4f1ea]/95 rounded-2xl p-10 border border-[#d8d2c4]">
            <span className="text-xs font-mono text-[#a85c42] tracking-wide">02 —</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2b2620] mt-4 mb-4">
              See the hotspots.
              <br />
              Fix what matters first.
            </h2>
            <p className="text-[#6f665a] text-lg">
              Every analysis ranks your most complex files, so you know where
              refactoring actually pays off.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
