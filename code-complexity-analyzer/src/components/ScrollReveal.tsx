"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  delay?: number // ms, use to stagger siblings (0, 100, 200...)
  direction?: "left" | "right" // swoop in along an arc from that side
  className?: string
}

// Fades + lifts content into place the first time it enters the viewport.
// Respects prefers-reduced-motion (content shows immediately, no motion).
export default function ScrollReveal({
  children,
  delay = 0,
  direction,
  className = "",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal-item ${direction ? `arc-${direction}` : ""} ${
        visible ? "reveal-visible" : ""
      } ${className}`}
      style={{
        transitionDelay: visible ? `${delay}ms` : "0ms",
        animationDelay: direction && visible ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  )
}
