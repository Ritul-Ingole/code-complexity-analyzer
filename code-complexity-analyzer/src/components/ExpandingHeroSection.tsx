"use client"

import { useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowRight, Lock, TrendingUp, Zap } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const CodeNetworkHero = dynamic(() => import("./three/CodeNetworkHero"), {
  ssr: false,
  loading: () => null,
})

interface ExpandingHeroSectionProps {
  isAuthenticated: boolean
  login?: string
}

export default function ExpandingHeroSection({ isAuthenticated, login }: ExpandingHeroSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const heroTextRef = useRef<HTMLDivElement>(null)
  const revealTextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial state: small, shifted right — mimics the old two-column layout
      // even though the element itself is a full-bleed absolute box underneath.
      gsap.set(canvasWrapRef.current,{
        scale: 0.80,
        xPercent: 28,
        transformOrigin: "50% 50%",
        // Drives the node-label fade; labels read var(--label-opacity)
        "--label-opacity": 1,
      })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          // Lenis already smooths the scroll; a long scrub re-eases on top of
          // it and reads as lag/rubber-banding. Short scrub just tracks it.
          scrub: 0.5,
        },
      })

      // Expansion finishes at 75% of the scroll distance. The remaining 25%
      // (spacer tween below) is a dwell: the scene sits full-bleed and
      // centered as the background before the sticky releases.
      tl.to(canvasWrapRef.current, { scale: 1, xPercent: 0, ease: "none", duration: 0.75 }, 0)
      // Labels fade out during the first half of the expansion, gone before settle
      tl.to(canvasWrapRef.current, { "--label-opacity": 0, ease: "none", duration: 0.3 }, 0.1)
      // Hero text fades and lifts out of the way early in the expansion
      tl.to(heroTextRef.current, { opacity: 0, y: -40, ease: "none", duration: 0.4 }, 0)
      // Reveal content fades in over the already-settled scene
      tl.to(revealTextRef.current, { opacity: 1, ease: "none", duration: 0.25 }, 0.6)
      // Spacer: holds the centered background state for the last 25% of scroll
      tl.to({}, { duration: 0.25 }, 0.75)
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  
  return (
    // Tall wrapper defines how much scroll distance the whole expand sequence consumes.
    <div ref={sectionRef} className="relative h-[240vh] bg-[#f4f1ea]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* 3D scene — hidden on mobile for performance, static fallback shown instead */}
        <div
          ref={canvasWrapRef}
          className="absolute inset-0 hidden md:block origin-center will-change-transform"
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