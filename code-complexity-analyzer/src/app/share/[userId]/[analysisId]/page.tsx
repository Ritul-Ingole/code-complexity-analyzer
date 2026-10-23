"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowRight } from "lucide-react"
import AnalysisResults from "@/components/AnalysisResult"
import type { GraphData } from "@/components/FileGraph"

interface Analysis {
  // Kept so a shared response that carries graph data still renders the graph;
  // the display type must not strip fields the API already returns.
  fileGraph?: GraphData
  timestamp: string
  repoUrl: string
  headSha: string
  totalCommits: number
  metrics: {
    totalLoc: number
    totalFunctions: number
    averageComplexity: number
    fileCount: number
  }
  topComplexFiles: Array<{
    path: string
    loc: number
    functions: number
    complexity: number
  }>
}

export default function SharePage() {
  const params = useParams()
  const userId = params.userId as string
  const analysisId = params.analysisId as string

  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  // "missing" (404 / gone) is kept apart from "failed" (request broke): an
  // expired link must not read as a server outage, and vice versa.
  const [error, setError] = useState<"missing" | "failed" | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/shared-analysis?userId=${encodeURIComponent(userId)}&analysisId=${encodeURIComponent(analysisId)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        )

        if (res.status === 404) {
          setError("missing")
          return
        }
        if (!res.ok) {
          setError("failed")
          return
        }

        const data = await res.json()
        if (!data?.analysis) {
          setError("missing")
          return
        }
        setAnalysis(data.analysis)
      } catch {
        setError("failed")
      } finally {
        setLoading(false)
      }
    }

    if (userId && analysisId) {
      void fetchAnalysis()
    }
  }, [userId, analysisId, attempt])

  if (loading) {
    return (
      <div className="app-shell min-h-screen bg-ui-canvas px-4 py-12">
        <div className="w-full">
          <p role="status" aria-live="polite" className="text-sm text-ui-secondary">
            Loading shared analysis.
          </p>
          <div aria-hidden="true" className="mt-6 space-y-4">
            <div className="ui-skeleton h-16 w-full rounded-panel" />
            <div className="ui-skeleton h-40 w-full rounded-panel" />
            <div className="ui-skeleton h-64 w-full rounded-panel" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    const missing = error !== "failed"
    return (
      <div className="app-shell min-h-screen bg-ui-canvas px-4 py-12 flex items-center justify-center">
        <div role="alert" className="max-w-lg text-left">
          <h1 className="font-display text-2xl font-semibold text-ui-text">
            {missing ? "This analysis is no longer available" : "This analysis could not load"}
          </h1>
          <p className="mt-2 text-sm text-ui-secondary">
            {missing
              ? "The link may be wrong, or the analysis has expired or been removed."
              : "The request failed. Check your connection and try again."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {!missing && (
              <button
                type="button"
                className="secondary-action ui-press"
                onClick={() => setAttempt((n) => n + 1)}
              >
                Try again
              </button>
            )}
            <a href="/" className="primary-action">
              Go home
              <span className="action-orb">
                <ArrowRight className="h-4 w-4" />
              </span>
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell min-h-screen bg-ui-canvas py-12 px-4">
      <div className="w-full ui-route-enter">
        {/* Shared link indicator */}
        <div className="mb-8 rounded-panel border border-ui-sand-strong bg-ui-sand-warm p-4">
          <p className="text-sm text-ui-text-deep">
            <span className="font-semibold">Shared analysis</span> — this is a public read-only view
          </p>
        </div>

        {/* Read-only analysis result */}
        <AnalysisResults
          data={analysis}
          onBack={() => {
            // No-op for shared page
          }}
          isShared={true}
        />
      </div>
    </div>
  )
}
