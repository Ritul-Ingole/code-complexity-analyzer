"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"

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

interface AnalyzingScreenProps {
  ready: boolean
}

export default function AnalyzingScreen({ ready }: AnalyzingScreenProps) {
  const [factIndex, setFactIndex] = useState(0)

  useEffect(() => {
    if (ready) return // stop rotating once results are ready

    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FACTS.length)
    }, 7500)

    return () => clearInterval(interval)
  }, [ready])

  return (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      {!ready ? (
        <>
          <div className="flex justify-center mb-6">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Analyzing Repository
          </p>
          <div className="min-h-[72px] flex items-center justify-center px-4">
            <p
              key={factIndex}
              className="text-gray-700 leading-relaxed animate-fade-in"
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
          <p className="text-lg font-semibold text-gray-900">
            Analysis ready
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Pulling up your results...
          </p>
        </div>
      )}
    </div>
  )
}