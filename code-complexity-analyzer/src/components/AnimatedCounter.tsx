"use client"

import { useEffect, useRef } from "react"
import { readMotion } from "@/lib/motion"
import { useReducedMotion } from "@/lib/useReducedMotion"

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

// Reduced-motion-safe count-up: the invisible final value reserves width, the
// screen reader gets only the final value, SSR renders final text, and the
// RAF loop updates text (never React state) so the tree stays still.
export default function AnimatedCounter({ value, duration, decimals = 0, prefix = "", suffix = "", className = "" }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const finite = Number.isFinite(value)
  const digits = Number.isFinite(decimals) ? Math.max(0, Math.min(20, Math.trunc(decimals))) : 0
  const format = (number: number) => `${prefix}${number.toLocaleString("en-US", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  })}${suffix}`
  const finalText = finite ? format(value) : "Unavailable"
  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.textContent = finalText
    if (reduced || !finite || typeof Animation === "undefined" || typeof KeyframeEffect === "undefined") return
    const tokens = readMotion(node)
    if (duration !== undefined && duration !== tokens.count) throw new Error("Counter duration must use the motion token")
    const formatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    const effect = new KeyframeEffect(null, [{ opacity: 0 }, { opacity: 1 }], {
      duration: tokens.count, easing: tokens.enterEase, fill: "both",
    })
    const animation = new Animation(effect, document.timeline)
    let frame = 0
    animation.play()
    const tick = () => {
      const progress = effect.getComputedTiming().progress ?? 0
      node.textContent = `${prefix}${formatter.format(value * progress)}${suffix}`
      if (animation.playState === "finished") node.textContent = finalText
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      animation.cancel()
      node.textContent = finalText
    }
  }, [value, duration, digits, prefix, suffix, finalText, finite, reduced])
  return (
    <span className={className} style={{ display: "inline-grid", fontVariantNumeric: "tabular-nums" }}>
      <span style={{ gridArea: "1 / 1", visibility: "hidden" }} aria-hidden="true">{finalText}</span>
      <span ref={ref} style={{ gridArea: "1 / 1" }} aria-hidden="true">{finalText}</span>
      <span className="sr-only">{finalText}</span>
    </span>
  )
}
