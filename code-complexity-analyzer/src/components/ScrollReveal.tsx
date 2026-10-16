"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  delay?: number // ms, use to stagger siblings (0, 100, 200...)
  direction?: "left" | "right" // swoop in along an arc from that side
  rootMargin?: string // positive bottom margin fires before fully in view
  className?: string
}

// Fades + lifts content into place the first time it enters the viewport.
// Respects prefers-reduced-motion (content shows immediately, no motion).
export default function ScrollReveal({
  children,
  delay = 0,
  direction,
  rootMargin = "0px 0px -10% 0px",
  className = "",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  // hover stays off until the arc animation finishes so hovers can't fire mid-flight
  const [landed, setLanded] = useState(!direction)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true)
      setLanded(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div
      ref={ref}
      className={`reveal-item ${direction ? `arc-${direction}` : ""} ${
        visible ? "reveal-visible" : ""
      } ${className}`}
      onAnimationEnd={(e) => {
        if (e.animationName.startsWith("arc-in")) setLanded(true)
      }}
      style={{
        transitionDelay: visible ? `${delay}ms` : "0ms",
        animationDelay: direction && visible ? `${delay}ms` : undefined,
        pointerEvents: landed ? undefined : "none",
      }}
    >
      {children}
    </div>
  )
}
