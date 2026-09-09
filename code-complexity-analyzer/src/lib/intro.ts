"use client"

/**
 * Shared state for the landing preloader ("intro").
 *
 * This is a tiny module-level store rather than React state on purpose: it is
 * read every animation frame by HeroSection (panel rect) and HeroScene (three.js
 * loop), and re-rendering React 60 times a second for that would be wasteful.
 *
 * Defaults are the *settled* values (panelT: 1, labels: 1) so that every surface
 * which does not mount <IntroLoader /> — /analyze, /dashboard, /share — behaves
 * exactly as it does today. IntroLoader flips them to 0 during its first render
 * (before paint) when the intro is actually going to play.
 */

export type IntroPhase = "loading" | "settling" | "labels" | "done"

export const introState = {
  /** 0 → 1, the loading bar fill. */
  progress: 0,
  /** 0 = 3D panel parked centre-screen (intro), 1 = normal layout rect. */
  panelT: 1,
  /** 0 → 1 multiplier for the file-name sprites + scanner ring. */
  labels: 1,
  phase: "done" as IntroPhase,
}

/**
 * Real readiness signals. The bar is not fake: it will not complete until every
 * key below has reported in (or MAX_LOAD_MS elapses as a safety net), which is
 * the whole point — nobody on a slow connection should watch components pop in
 * after the fold has already been revealed.
 */
const READY_KEYS = ["fonts", "window-load", "hero-scene"] as const
export type ReadyKey = (typeof READY_KEYS)[number]

const ready = new Set<ReadyKey>()

export function markReady(key: ReadyKey) {
  ready.add(key)
}

export function readyFraction() {
  return ready.size / READY_KEYS.length
}

export function resetReady() {
  ready.clear()
}

/**
 * Per-frame fan-out. IntroLoader owns the single RAF loop during the intro and
 * pushes a tick to every subscriber, so HeroSection can reposition the fixed 3D
 * panel without scroll events (there are none — the page is locked).
 */
type Listener = () => void
const frameListeners = new Set<Listener>()

export function onIntroFrame(fn: Listener) {
  frameListeners.add(fn)
  return () => {
    frameListeners.delete(fn)
  }
}

export function emitIntroFrame() {
  for (const fn of frameListeners) fn()
}

/** Play once per tab session, and never for reduced-motion users. */
export const INTRO_SESSION_KEY = "cc-intro-played"

export function shouldPlayIntro() {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false
  try {
    if (window.sessionStorage.getItem(INTRO_SESSION_KEY) === "1") return false
  } catch {
    // Private mode / storage disabled — just play it.
  }
  return true
}