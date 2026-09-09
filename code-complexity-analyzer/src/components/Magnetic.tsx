"use client"

import { useRef, type ReactNode, type MouseEvent } from "react"

// Wraps a single interactive child (button/link) and nudges it a few px
// toward the pointer while hovered — a subtle "magnetic" feel on primary CTAs.
// No-ops under prefers-reduced-motion; harmless (just inert) on touch devices.
export default function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const node = ref.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    node.style.transform = `translate(${x * 0.18}px, ${y * 0.32}px)`
  }

  const onLeave = () => {
    const node = ref.current
    if (node) node.style.transform = "translate(0, 0)"
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="magnetic-wrap"
      style={{ transition: "transform .35s cubic-bezier(.16,1,.3,1)" }}
    >
      {children}
    </div>
  )
}
