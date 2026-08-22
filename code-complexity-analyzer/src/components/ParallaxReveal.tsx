"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export default function ParallaxReveal() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=100%",
          scrub: 1,
          pin: true,
        },
      })

      // Background moves slowest (furthest depth), midground faster,
      // and the reveal card slides up from below to fully cover the scene.
      tl.to(bgRef.current, { yPercent: -15, ease: "none" }, 0)
      tl.to(midRef.current, { yPercent: -35, ease: "none" }, 0)
      tl.to(cardRef.current, { yPercent: -100, ease: "none" }, 0)
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative h-screen overflow-hidden bg-slate-950">
      {/* Background layer — slowest parallax speed */}
      <div ref={bgRef} className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      {/* Midground layer — medium parallax speed */}
      <div ref={midRef} className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent blur-3xl" />
      </div>

      {/* Foreground: the reveal card, starts just below the viewport */}
      <div
        ref={cardRef}
        className="absolute inset-x-0 top-full h-screen bg-slate-900 border-t border-slate-800 flex items-center px-6 md:px-16 lg:px-24"
      >
        <div className="max-w-3xl">
          <span className="text-xs font-mono text-cyan-400 tracking-wide">02 —</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-4 mb-6">
            See the hotspots.
            <br />
            Fix what matters first.
          </h2>
          <p className="text-slate-400 text-lg max-w-xl">
            Every analysis ranks your most complex files, so you know exactly
            where refactoring pays off — not just that something is
            complicated.
          </p>
        </div>
      </div>
    </section>
  )
}