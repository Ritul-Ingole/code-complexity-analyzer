"use client"

import { useLayoutEffect, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowRight, Lock, TrendingUp } from "lucide-react"

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => null,
})

interface HeroSectionProps {
  isAuthenticated: boolean
  login?: string
}

// Scroll-driven expansion (ported from sample/js/hero3d.js):
// the 3D panel is position:fixed; its home slot is measured once, and on
// scroll its rect lerps (easeInOutCubic) from the home slot to the full
// viewport. Radius/border/shadow melt away so it becomes a seamless
// background; later sections scroll over it.
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export default function HeroSection({ isAuthenticated, login }: HeroSectionProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const panel = panelRef.current
    const spacer = spacerRef.current
    if (!panel || !spacer) return

    // Home rect — measured once and on resize, never during scroll
    let home = { x: 0, y: 0, w: 0, h: 0 }
    const measure = () => {
      const r = spacer.getBoundingClientRect()
      home = { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height }
    }

    const update = () => {
      const p = ease(Math.min(window.scrollY / (window.innerHeight * 0.9), 1))

      const w = home.w + (window.innerWidth - home.w) * p
      const h = home.h + (window.innerHeight - home.h) * p
      const x = home.x * (1 - p)
      // Early in the scroll the panel still travels with the page, then
      // converges to full-bleed at (0, 0) — the "grows into background" feel.
      const y = (home.y - window.scrollY) * (1 - p)

      panel.style.width = w + "px"
      panel.style.height = h + "px"
      panel.style.left = x + "px"
      panel.style.top = y + "px"
      panel.style.borderRadius = 1.4 * (1 - p) + "rem"
      panel.style.borderWidth = 1 - p + "px"
      panel.style.boxShadow = `0 24px 60px rgba(168, 92, 66, ${0.12 * (1 - p)})`
      // Chip dies by p=0.5, same cadence as the sample (1 - 2p)
      if (chipRef.current) chipRef.current.style.opacity = String(Math.max(0, 1 - p * 2))
      panel.style.visibility = "visible"
    }

    const onResize = () => {
      measure()
      update()
    }

    measure()
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", onResize)

    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <>
      {/* Fixed 3D panel — hidden until first measure so SSR never paints it unpositioned */}
      <div
        ref={panelRef}
        className="fixed left-0 top-0 z-0 overflow-hidden border border-[#d8d2c4] will-change-[width,height,left,top]"
        style={{
          background: "radial-gradient(circle at 30% 20%, #faf8f3, #f4f1ea)",
          visibility: "hidden",
        }}
      >
        <HeroScene />
        <div
          ref={chipRef}
          className="absolute bottom-4 left-4 rounded-lg border border-[#e6e0d4] bg-white/80 px-3 py-1.5 text-[0.78rem] text-[#6f665a] backdrop-blur-sm"
        >
          live · code dependency network
        </div>
      </div>

      {/* Hero copy (scrolls away naturally) + spacer holding the panel's home slot */}
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-72px)] max-w-[1200px] grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:px-16 lg:px-24">
        <div className="max-w-xl">
          <p className="mb-6 font-mono text-xs tracking-wide text-[#a85c42]">
            01 — STATIC ANALYSIS, NO SETUP
          </p>

          <h1 className="mb-6 text-4xl font-bold leading-[1.08] text-[#2b2620] md:text-6xl">
            Every repo has a
            <br />
            worst file.
            <br />
            <span className="text-[#c1694f]">Find yours.</span>
          </h1>

          <p className="mb-8 max-w-md text-lg leading-relaxed text-[#6f665a]">
            Paste a public GitHub link and get complexity, LOC and hotspot
            rankings in seconds.
          </p>

          {!isAuthenticated ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/analyze"
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#d9a441] px-6 py-3 font-semibold text-[#2b2620] transition-colors hover:bg-[#cc9738]"
                >
                  Try Free Analysis
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/api/auth/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d8d2c4] bg-[#faf8f3] px-6 py-3 font-semibold text-[#2b2620] transition-colors hover:border-[#a89f8c]"
                >
                  <Lock className="h-4 w-4" />
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
                Welcome back, <span className="font-medium text-[#c1694f]">{login}</span>
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/analyze"
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#d9a441] px-6 py-3 font-semibold text-[#2b2620] transition-colors hover:bg-[#cc9738]"
                >
                  Analyze Repository
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d8d2c4] bg-[#faf8f3] px-6 py-3 font-semibold text-[#2b2620] transition-colors hover:border-[#a89f8c]"
                >
                  <TrendingUp className="h-4 w-4" />
                  View History
                </Link>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-[#8a8172]">
            <span>&lt;10s per analysis</span>
            <span className="text-[#d8d2c4]">/</span>
            <span>top-10 hotspots</span>
            <span className="text-[#d8d2c4]">/</span>
            <span>trends &amp; compare</span>
          </div>
        </div>

        <div ref={spacerRef} aria-hidden="true" className="min-h-[360px] md:min-h-[520px]" />
      </section>
    </>
  )
}
