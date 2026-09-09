"use client"

import { useEffect, useRef, useState } from "react"
import {
  INTRO_SESSION_KEY,
  emitIntroFrame,
  introState,
  markReady,
  readyFraction,
  shouldPlayIntro,
} from "@/lib/intro"

// ── Intro timing ────────────────────────────────────────────────────────────
const MIN_LOAD_MS = 1700 // floor, so a fast connection still reads as deliberate
const MAX_LOAD_MS = 6000 // ceiling, so a stalled asset can never trap the visitor
const SETTLE_MS = 1150 // 3D panel travels centre → its right-column home slot
const LABEL_MS = 520 // file-name sprites + scanner ring fade up afterwards

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Full-bleed paper preloader. Rendered on the server too, so it is painted on
 * the very first frame — the visitor never sees a half-built hero.
 *
 * Sequence:
 *   1. loading  — bar fills against real readiness; HeroScene pops its nodes out
 *   2. settling — bar/backdrop fade, 3D panel slides right into its home slot,
 *                 nav drops in from the top, hero copy slides in from the left
 *   3. labels   — file-name tags + scanner ring fade in
 *   4. done     — classes cleaned up, scroll unlocked, everything behaves as before
 */
export default function IntroLoader() {
  // Lazy initialiser runs during the first client render — before paint and
  // before the dynamically imported HeroScene exists — so the scene never gets
  // a chance to render a settled frame first.
  const [playing] = useState(() => {
    const play = shouldPlayIntro()
    if (play) {
      introState.progress = 0
      introState.panelT = 0
      introState.labels = 0
      introState.phase = "loading"
    }
    return play
  })

  const [mounted, setMounted] = useState(true)
  const overlayRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = document.documentElement

    if (!playing) {
      introState.progress = 1
      introState.panelT = 1
      introState.labels = 1
      introState.phase = "done"
      root.classList.add("intro-reveal")
      setMounted(false)
      emitIntroFrame()
      return
    }

    root.classList.add("intro-active")
    if ("scrollRestoration" in history) history.scrollRestoration = "manual"
    window.scrollTo(0, 0)

    const lenis = (window as unknown as { __lenis?: { stop(): void; start(): void } }).__lenis
    lenis?.stop()

    // Real readiness signals
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => markReady("fonts")).catch(() => markReady("fonts"))
    } else {
      markReady("fonts")
    }

    const onLoad = () => markReady("window-load")
    if (document.readyState === "complete") onLoad()
    else window.addEventListener("load", onLoad)

    const start = performance.now()
    let settleStart = 0
    let labelStart = 0
    let raf = 0

    const finish = () => {
      introState.labels = 1
      introState.panelT = 1
      introState.phase = "done"
      root.classList.remove("intro-active")
      lenis?.start()
      try {
        window.sessionStorage.setItem(INTRO_SESSION_KEY, "1")
      } catch {
        // storage unavailable — the intro simply replays next navigation
      }
      emitIntroFrame()
      setMounted(false)
    }

    const tick = () => {
      const now = performance.now()

      if (introState.phase === "loading") {
        const elapsed = now - start
        const timeFloor = Math.min(elapsed / MIN_LOAD_MS, 1) * 0.92
        const fraction = readyFraction()
        const complete = fraction >= 1 || elapsed > MAX_LOAD_MS

        // Never runs ahead of what has actually loaded, never stalls at zero.
        const target = complete ? 1 : Math.min(timeFloor, 0.3 + fraction * 0.62)
        introState.progress += (target - introState.progress) * 0.085

        if (fillRef.current) {
          fillRef.current.style.transform = `scaleX(${introState.progress.toFixed(4)})`
        }

        if (complete && elapsed >= MIN_LOAD_MS && introState.progress > 0.994) {
          introState.progress = 1
          if (fillRef.current) fillRef.current.style.transform = "scaleX(1)"
          introState.phase = "settling"
          settleStart = now
          root.classList.add("intro-reveal")
          overlayRef.current?.classList.add("is-fading")
        }
      } else if (introState.phase === "settling") {
        const t = Math.min((now - settleStart) / SETTLE_MS, 1)
        introState.panelT = easeInOutCubic(t)
        if (t >= 1) {
          introState.panelT = 1
          introState.phase = "labels"
          labelStart = now
        }
      } else if (introState.phase === "labels") {
        const t = Math.min((now - labelStart) / LABEL_MS, 1)
        introState.labels = easeOutCubic(t)
        if (t >= 1) {
          emitIntroFrame()
          finish()
          return
        }
      }

      emitIntroFrame()
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("load", onLoad)
      root.classList.remove("intro-active")
      lenis?.start()
    }
  }, [playing])

  if (!mounted) return null

  return (
    <div ref={overlayRef} className="intro-overlay" aria-hidden="true">
      <div className="intro-bar-wrap">
        <div className="intro-bar">
          <div ref={fillRef} className="intro-bar-fill" />
        </div>
      </div>
    </div>
  )
}