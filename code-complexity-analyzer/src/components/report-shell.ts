// Shared "double-bezel" card constants for the report/dashboard surface family:
// outer shell (hairline ring + padding + tinted shadow), inner core (own
// surface + concentric radius). Mirrors the landing's card system so the
// whole site reads as one brand world. No backdrop-blur on scrolling content.
export const REPORT_SHELL =
  "rounded-[1.625rem] bg-white/40 p-1.5 ring-1 ring-ui-border shadow-[0_1px_2px_rgba(43,38,32,0.04),0_16px_40px_-24px_rgba(43,38,32,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"

export const REPORT_CORE =
  "rounded-[1.25rem] bg-ui-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
