"use client"

import { useEffect } from "react"
import Lenis from "lenis"

// Drives inertia-smoothed native scrolling for the whole app. Lenis (in its
// default, non-virtual configuration) still moves the real document
// scrollbar and still fires native "scroll" events — so HeroSection's
// scroll-driven 3D expansion (window.scrollY + a native scroll listener) is
// completely untouched and keeps working exactly as it did before. This
// component renders nothing; it only starts/stops the smoothing RAF loop.
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      touchMultiplier: 1.1,
    })

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  return null
}
