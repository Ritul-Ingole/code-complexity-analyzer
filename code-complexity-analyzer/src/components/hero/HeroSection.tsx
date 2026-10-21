"use client"

import { useLayoutEffect, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowRight, Lock, TrendingUp } from "lucide-react"
import Magnetic from "@/components/Magnetic"
import { introState, onIntroFrame } from "@/lib/intro"

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
// viewport. Frameless — the panel has no border/background of its own, the
// 3D floats over the page; later sections scroll over it.
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// 3D content zoom at full bleed — the scene scales up as the panel
// expands into the background, cropping past the viewport edges
const BLEED_ZOOM = 1.4
// Intro parking slot — where the 3D panel sits while the preloader runs.
// Centred, slightly lifted; HeroScene draws the loader ring around it at this
// rect. `.intro-fallback` in globals.css mirrors the same lift/size for the
// no-WebGL case.
const INTRO_MAX_W = 760
const INTRO_MAX_H = 620
const INTRO_LIFT = 34

export default function HeroSection({ isAuthenticated, login }: HeroSectionProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  const labelOpacity = useRef(1)
  const bleedZoom = useRef(1)
  // Synchronous canvas size — pushed every scroll frame so the 3D scene
  // can resize its buffer in the same rAF, avoiding ResizeObserver lag
  const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  // Total scroll progress (0 to 1) across the page journey
  const scrollProgress = useRef(0)

  useLayoutEffect(() => {
    const panel = panelRef.current
    const spacer = spacerRef.current
    if (!panel || !spacer) return

    // Home rect — measured once and on resize, never during scroll
    let home = { x: 0, y: 0, w: 0, h: 0 }
    const measure = () => {
      const r = spacer.getBoundingClientRect()
      // Panel: exactly the right grid column (page margins stay symmetric) —
      // just under the nav → just above the fold. Fixed and
      // frameless, so the grid layout is untouched. On scroll it lerps to
      // full-bleed (update()).
      const x = r.left
      const w = Math.max(r.width, 150)
      const h = Math.max(window.innerHeight - 96, 360)
      home = { x, y: window.scrollY + 80, w, h }
    }

    const update = () => {
      const p = ease(Math.min(window.scrollY / (window.innerHeight * 0.9), 1))

      let w = home.w + (window.innerWidth - home.w) * p
      let h = home.h + (window.innerHeight - home.h) * p
      let x = home.x * (1 - p)
      // Early in the scroll the panel still travels with the page, then
      // converges to full-bleed at (0, 0) — the "grows into background" feel.
      let y = (home.y - window.scrollY) * (1 - p)

      // ── Intro handoff ────────────────────────────────────────────────
      // While the preloader runs, the panel is parked centre-screen above the
      // overlay; as the intro settles it lerps to whatever the scroll formula
      // above produced. Once introState.panelT === 1 this block is inert and
      // the scroll-driven rect is used verbatim — the scroll behaviour is
      // byte-for-byte what it was before.
      const it = introState.panelT
      if (it < 1) {
        const iw = Math.min(window.innerWidth * 0.82, INTRO_MAX_W)
        const ih = Math.min(window.innerHeight * 0.68, INTRO_MAX_H)
        const ix = (window.innerWidth - iw) / 2
        const iy = (window.innerHeight - ih) / 2 - INTRO_LIFT
        const k = ease(it)
        w = iw + (w - iw) * k
        h = ih + (h - ih) * k
        x = ix + (x - ix) * k
        y = iy + (y - iy) * k
        panel.style.zIndex = "70" // above the intro overlay (z-index 60)
      } else if (panel.style.zIndex) {
        panel.style.zIndex = "" // hand back to the Tailwind z-0 class
      }

      panel.style.width = w + "px"
      panel.style.height = h + "px"
      panel.style.left = x + "px"
      panel.style.top = y + "px"
      // Push dimensions synchronously so HeroScene can resize in the same
      // rAF tick — avoids the 1-2 frame lag from ResizeObserver
      canvasSize.current = { w: Math.round(w), h: Math.round(h) }
      // Total scroll progress spanning the entire page story
      const docHeight = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        window.innerHeight
      )
      scrollProgress.current = Math.min(Math.max(window.scrollY / docHeight, 0), 1)
      // File-name labels fade out during the first half of expansion
      labelOpacity.current = Math.max(0, 1 - p * 2)
      bleedZoom.current = 1 + p * (BLEED_ZOOM - 1)
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
    // The page is scroll-locked during the intro, so there are no scroll
    // events to drive the panel — IntroLoader ticks it instead.
    const offIntroFrame = onIntroFrame(update)

    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", onResize)
      offIntroFrame()
    }
  }, [])

  return (
    <>
      {/* Fixed frameless 3D panel — hidden until first measure so SSR never paints it unpositioned */}
      <div
        ref={panelRef}
        className="fixed left-0 top-0 z-0 overflow-hidden will-change-[width,height,left,top]"
        style={{ visibility: "hidden" }}
      >
        <HeroScene
          labelOpacity={labelOpacity}
          bleedZoom={bleedZoom}
          canvasSize={canvasSize}
          scrollProgress={scrollProgress}
        />
      </div>

      {/* Hero copy (scrolls away naturally) + spacer holding the panel's home slot */}
      <section className="relative z-10 grid min-h-[calc(100vh-72px)] max-w-none grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:px-12">
        <div className="intro-copy max-w-xl md:justify-self-center">
          <p className="mb-6 font-mono text-xs tracking-wide text-[#a85c42]">
            01 — STATIC ANALYSIS, NO SETUP
          </p>

          <h1 className="mb-6 font-display text-4xl font-semibold leading-[1.08] text-[#2b2620] md:text-6xl">
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
                <Magnetic>
                  <Link href="/analyze" className="btn-primary">
                    Try Free Analysis
                    <span className="btn-orb">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Magnetic>
                <Magnetic>
                  <a href="/api/auth/login?next=%2F" className="btn-secondary">
                    <Lock className="h-4 w-4" />
                    Sign in to save reports
                  </a>
                </Magnetic>
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
                <Magnetic>
                  <Link href="/analyze" className="btn-primary">
                    Analyze Repository
                    <span className="btn-orb">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link href="/history" className="btn-secondary">
                    <TrendingUp className="h-4 w-4" />
                    View History
                  </Link>
                </Magnetic>
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
