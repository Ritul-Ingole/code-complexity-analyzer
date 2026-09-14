"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"

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
  { label: "Fetching repository", at: 0 },
  { label: "Parsing source files", at: 4 },
  { label: "Scoring complexity", at: 10 },
  { label: "Building the graph", at: 20 },
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

  const stageIndex = STAGES.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0)

  return (
    <div className="bg-[#faf8f3] rounded-2xl border border-[#e6e0d4] shadow-sm p-8 text-center">
      {!ready ? (
        <>
          <div className="flex justify-center mb-6">
            <div className="w-10 h-10 border-4 border-[#dfcba2] border-t-[#a85c42] rounded-full animate-spin" />
          </div>
          <p className="text-sm font-semibold text-[#6f665a] uppercase tracking-wide mb-6">
            Analyzing Repository · {elapsed}s
          </p>
          <ul className="max-w-[260px] mx-auto mb-6 space-y-2 text-left">
            {STAGES.map((stage, i) => (
              <li
                key={stage.label}
                className={`flex items-center gap-2.5 text-sm ${
                  i < stageIndex
                    ? "text-[#6f665a]"
                    : i === stageIndex
                      ? "text-[#2b2620] font-medium"
                      : "text-[#c5bcae]"
                }`}
              >
                {i < stageIndex ? (
                  <CheckCircle2 size={15} className="text-[#4d7142] shrink-0" />
                ) : i === stageIndex ? (
                  <Loader2 size={15} className="text-[#a85c42] shrink-0 animate-spin" />
                ) : (
                  <span className="w-[15px] h-[15px] rounded-full border border-[#e6e0d4] shrink-0" />
                )}
                {stage.label}
              </li>
            ))}
          </ul>
          <div className="min-h-[72px] flex items-center justify-center px-4">
            <p
              key={factIndex}
              className="text-[#51483d] leading-relaxed animate-fade-in"
            >
              {FACTS[factIndex]}
            </p>
          </div>
        </>
      ) : (
        <div className="animate-fade-in">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="text-green-500" size={40} />
          </div>
          <p className="text-lg font-semibold text-[#2b2620]">
            Analysis ready
          </p>
          <p className="text-sm text-[#6f665a] mt-1">
            Pulling up your results...
          </p>
        </div>
      )}
    </div>
  )
}