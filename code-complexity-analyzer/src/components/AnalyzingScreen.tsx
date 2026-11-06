"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { AsciiSkeleton } from "ascii-reveal"
import { REPORT_SHELL, REPORT_CORE } from "./report-shell"

// ponytail: stage advancement is timer-based, not real Lambda progress — add SSE/status polling only if analyses regularly exceed ~60s
const STAGES = [
  "Fetching repository",
  "Parsing source files",
  "Scoring complexity",
  "Building the graph",
]

interface AnalyzingScreenProps {
  ready: boolean
}

export default function AnalyzingScreen({ ready }: AnalyzingScreenProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (ready) return // stop ticking once results are ready

    const tickInterval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(tickInterval)
  }, [ready])

  return (
    <div className={REPORT_SHELL}>
      <div className={`${REPORT_CORE} p-8 text-center`}>
      {!ready ? (
        <>
          <div className="flex justify-center mb-6">
            <div className="ui-spinner w-10 h-10 border-4 border-ui-sand-strong border-t-ui-clay rounded-full" />
          </div>
          {/* Single polite live region: announced once per state, never per tick.
              Elapsed time stays outside it. */}
          <p role="status" aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-ui-secondary uppercase tracking-wide mb-2">
            Analyzing repository. Please wait.
          </p>
          <p className="text-xs text-ui-muted tabular-nums mb-6">{elapsed}s elapsed</p>
          <p className="text-xs font-semibold text-ui-secondary uppercase tracking-wide mb-2">Analysis steps</p>
          <ul className="max-w-[260px] mx-auto mb-4 space-y-2 text-left">
            {STAGES.map((label, i) => (
              <li
                key={label}
                style={{ animationDelay: `${i * 400}ms`, animationFillMode: "both" }}
                className="flex items-center gap-2.5 text-sm text-ui-muted ui-state-enter"
              >
                <span className="w-[15px] h-[15px] rounded-full border border-ui-border-strong shrink-0" />
                {label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-ui-muted">Progress is estimated while the server processes the repository.</p>
        </>
      ) : (
        <div className="ui-state-enter">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="text-ui-success" size={40} strokeWidth={1.5} />
          </div>
          <p role="status" aria-live="polite" aria-atomic="true" className="text-lg font-semibold text-ui-text">
            Analysis ready. Opening results.
          </p>
          <ul className="max-w-[260px] mx-auto mt-4 space-y-2 text-left">
            {STAGES.map((label) => (
              <li
                key={label}
                className="flex items-center gap-2.5 text-sm text-ui-secondary"
              >
                <CheckCircle2 size={15} className="text-ui-success shrink-0" />
                {label}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ui-secondary mt-4">
            Pulling up your results...
          </p>
        </div>
      )}

      {/* Report skeleton: previews the shape of the report that is coming and
          holds the card height steady when the stage list flips to checkmarks.
          Rendered in both states so nothing jumps before the decode-in. */}
      <div aria-hidden="true" className="mt-8 text-left">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[1, 2, 3, 4].map((j) => (
            <AsciiSkeleton key={j} as="div" rows={2} seed={j} />
          ))}
        </div>
        <div className="mb-4">
          <AsciiSkeleton as="div" rows={8} seed={5} />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((j) => (
            <AsciiSkeleton key={j} as="div" rows={3} seed={5 + j} />
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}