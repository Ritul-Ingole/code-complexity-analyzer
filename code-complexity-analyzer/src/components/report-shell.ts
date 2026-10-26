// Shared "double-bezel" card constants for the report/dashboard surface family:
// outer shell (hairline ring + padding), inner core (own surface + concentric
// radius). Mirrors the landing's card system so the whole site reads as one
// brand world. No backdrop-blur on scrolling content, and no decorative
// shadows (04 Report/card: one border and one surface, no shell-inside-shell
// shadows); `bg-white/40` stays a literal because Tailwind 3.4 cannot apply
// alpha to a var() colour.
export const REPORT_SHELL =
  "rounded-[1.625rem] bg-white/40 p-1.5 ring-1 ring-ui-border"

export const REPORT_CORE = "rounded-[1.25rem] bg-ui-surface"
