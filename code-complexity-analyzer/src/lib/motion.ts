// Motion tokens — the single numeric source lives in globals.css :root.
// This file only maps names; values are read from the stylesheet so JS and
// CSS never maintain duplicate timing tables.
export const motionTokens = {
  fast: "--ui-motion-fast",
  base: "--ui-motion-base",
  enter: "--ui-motion-enter",
  count: "--ui-motion-count",
  stagger: "--ui-motion-stagger",
  feedbackEase: "--ui-ease-feedback",
  enterEase: "--ui-ease-enter",
  linearEase: "--ui-ease-linear",
  lift: "--ui-motion-lift",
  enterY: "--ui-motion-enter-y",
  pressScale: "--ui-motion-press-scale",
  staggerCap: "--ui-motion-stagger-cap",
} as const

export function readMotion(node: Element) {
  const style = getComputedStyle(node)
  const text = (key: keyof typeof motionTokens) => {
    const value = style.getPropertyValue(motionTokens[key]).trim()
    if (!value) throw new Error(`Missing motion token: ${motionTokens[key]}`)
    return value
  }
  const time = (key: "fast" | "base" | "enter" | "count" | "stagger") => {
    const value = text(key)
    if (!value.endsWith("ms")) throw new Error(`Expected millisecond token: ${key}`)
    const number = Number(value.slice(0, -2))
    if (!Number.isFinite(number) || number < 0) throw new Error(`Invalid motion token: ${key}`)
    return number
  }
  return {
    fast: time("fast"), base: time("base"), enter: time("enter"), count: time("count"),
    stagger: time("stagger"), feedbackEase: text("feedbackEase"),
    enterEase: text("enterEase"), linearEase: text("linearEase"),
    staggerCap: Number(text("staggerCap")),
  }
}
