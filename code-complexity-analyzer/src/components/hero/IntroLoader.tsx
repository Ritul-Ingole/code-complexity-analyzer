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
const MIN_LOAD_MS = 2000 // organic duration target (~2.0s), per the plan
const MAX_LOAD_MS = 5000 // ceiling safety net
const SETTLE_MS = 950 // 3D panel travels smoothly centre → right-column home slot
const LABELS_MS = 900 // file-name sprites + scanner disc fade up AFTER the glide lands

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export default function IntroLoader() {
  const [playing] = useState(() => {
    const play = shouldPlayIntro()
    if (play) {
      introState.progress = 0
      introState.panelT = 0
      introState.labels = 0 // hidden until the panel has glided into place
      introState.phase = "loading"
    }
    return play
  })

  const [mounted, setMounted] = useState(true)
  // Plain-CSS loader, shown only when HeroScene never got a WebGL renderer.
  // The 400ms grace period below means a working scene never flashes it.
  const [fallback, setFallback] = useState(false)
  const fallbackShown = useRef(false)
  const overlayRef = useRef<HTMLDivElement>(null)

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
    let labelsStart = 0
    let holdStart = 0
    let raf = 0

    const finish = () => {
      introState.labels = 1
      introState.panelT = 1
      introState.progress = 1
      introState.phase = "done"
      root.classList.remove("intro-active")
      lenis?.start()
      try {
        window.sessionStorage.setItem(INTRO_SESSION_KEY, "1")
      } catch {
        // storage unavailable
      }
      emitIntroFrame()
      setMounted(false)
    }

    const tick = () => {
      const now = performance.now()

      if (fallbackShown.current && (introState.scene || introState.phase !== "loading")) {
        fallbackShown.current = false
        setFallback(false)
      } else if (!fallbackShown.current && !introState.scene && introState.phase === "loading" && now - start > 400) {
        fallbackShown.current = true
        setFallback(true)
      }

      if (introState.phase === "loading") {
        const elapsed = now - start
        const timeFraction = Math.min(elapsed / MIN_LOAD_MS, 1)

        // Organic curve: energetic launch (0-30%), steady middle (30-80%),
        // micro-suspense check (80-88%), and smooth completion (88-100%)
        let target = 0
        if (timeFraction < 0.25) {
          target = (timeFraction / 0.25) * 0.32
        } else if (timeFraction < 0.75) {
          target = 0.32 + ((timeFraction - 0.25) / 0.5) * 0.48
        } else if (timeFraction < 0.88) {
          target = 0.8 + ((timeFraction - 0.75) / 0.13) * 0.08
        } else {
          target = 0.88 + ((timeFraction - 0.88) / 0.12) * 0.12
        }

        const isAssetsReady = readyFraction() >= 1 || elapsed > MAX_LOAD_MS
        if (timeFraction >= 1 && isAssetsReady) {
          target = 1
        }

        // Read every frame by HeroScene, which draws the arc + clock dots.
        introState.progress += (target - introState.progress) * 0.12

        if (timeFraction >= 1 && isAssetsReady && introState.progress > 0.992) {
          introState.progress = 1
          if (holdStart === 0) {
            holdStart = now
          } else if (now - holdStart >= 120) {
            // Brief hold at 100% completed, then trigger smooth slide
            introState.phase = "settling"
            settleStart = now
            root.classList.add("intro-reveal")
            overlayRef.current?.classList.add("is-fading")
          }
        }
      } else if (introState.phase === "settling") {
        const t = Math.min((now - settleStart) / SETTLE_MS, 1)
        introState.panelT = easeInOutCubic(t)
        if (t >= 1) {
          // Glide landed in its right-column home — only now do the file-name
          // sprites and scanner disc slowly fade up (phase "labels").
          introState.panelT = 1
          introState.phase = "labels"
          labelsStart = now
        }
      } else if (introState.phase === "labels") {
        const t = Math.min((now - labelsStart) / LABELS_MS, 1)
        introState.labels = easeInOutCubic(t)
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
      {fallback && (
        <div className="intro-fallback">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ transform: `rotate(${i * 30}deg)` }}><span /></span>
          ))}
        </div>
      )}
    </div>
  )
}