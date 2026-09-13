"use client"

import { useEffect, useRef } from "react"
import Lenis from "lenis"
import { usePathname } from "next/navigation"

// Drives inertia-smoothed native scrolling for the whole app. Lenis (in its
// default, non-virtual configuration) still moves the real document
// scrollbar and still fires native "scroll" events — so HeroSection's
// scroll-driven 3D expansion (window.scrollY + a native scroll listener) is
// completely untouched and keeps working exactly as it did before. This
// component renders nothing; it only starts/stops the smoothing RAF loop.
export default function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      touchMultiplier: 1.1,
    })

    // Exposed so the intro preloader can freeze/resume smooth scrolling while
    // the page is locked. Nothing else should reach for this.
    ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis
    lenisRef.current = lenis

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      delete (window as unknown as { __lenis?: Lenis }).__lenis
      lenisRef.current = null
      lenis.destroy()
    }
  }, [])

  // Next.js resets the window scroll on navigation, but Lenis's RAF loop
  // immediately re-writes its internally saved position. Syncing Lenis to 0
  // here makes the reset stick.
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true })
  }, [pathname])

  return null
}
