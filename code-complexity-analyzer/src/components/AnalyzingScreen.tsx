"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { REPORT_SHELL, REPORT_CORE } from "./report-shell"

// Short, self-contained facts. Each should be readable in a few seconds.
const FACTS = [
  "Cyclomatic complexity was introduced by Thomas McCabe in 1976 to measure how many independent paths exist through a function.",
  "A cyclomatic complexity score under 10 is generally considered easy to test and maintain.",
  "The Linux kernel's git repository has over 1 million commits.",
  "Linus Torvalds created Git in 2005 in about 10 days, initially to manage the Linux kernel's source code.",
  "The term 'code smell' was popularized by Kent Beck to describe surface indicators of deeper problems in code.",
  "Deeply nested if/else statements increase cyclomatic complexity faster than almost any other pattern.",
  "Refactoring a single large function into smaller ones can reduce complexity without changing behavior at all.",
  "Every logical operator (&& or ||) in a conditional adds a new path the code can take — and a point to complexity.",
  "Shallow clones fetch only recent history, which is why they're much faster than a full git clone.",
  "Abstract Syntax Trees represent code as a tree structure, letting tools analyze it without ever running it.",
]

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
  const [factIndex, setFactIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (ready) return // stop rotating/ticking once results are ready

    const factsInterval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FACTS.length)
    }, 7500)
    const tickInterval = setInterval(() => setElapsed((s) => s + 1), 1000)

    return () => {
      clearInterval(factsInterval)
      clearInterval(tickInterval)
    }
  }, [ready])

  return (
    <div className={REPORT_SHELL}>
      <div className={`${REPORT_CORE} p-8 text-center`}>
      {!ready ? (
        <>
          <div className="flex justify-center mb-6">
            <div className="w-10 h-10 border-4 border-ui-sand-strong border-t-ui-clay rounded-full animate-spin" />
          </div>
          <p className="text-sm font-semibold text-ui-secondary uppercase tracking-wide mb-6">
            Analyzing Repository · {elapsed}s
          </p>
          <ul className="max-w-[260px] mx-auto mb-6 space-y-2 text-left">
            {STAGES.map((label, i) => (
              <li
                key={label}
                style={{ animationDelay: `${i * 400}ms`, animationFillMode: "both" }}
                className="flex items-center gap-2.5 text-sm text-ui-muted animate-fade-in"
              >
                <span className="w-[15px] h-[15px] rounded-full border border-ui-border-strong shrink-0" />
                {label}
              </li>
            ))}
          </ul>
          <div className="min-h-[72px] flex items-center justify-center px-4">
            <p
              key={factIndex}
              className="text-ui-text-deep leading-relaxed animate-fade-in"
            >
              {FACTS[factIndex]}
            </p>
          </div>
        </>
      ) : (
        <div className="animate-fade-in">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="text-ui-success" size={40} strokeWidth={1.5} />
          </div>
          <p className="text-lg font-semibold text-ui-text">
            Analysis ready
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
      </div>
    </div>
  )
}