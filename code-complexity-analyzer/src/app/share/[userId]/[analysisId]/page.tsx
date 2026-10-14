"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowRight } from "lucide-react"
import AnalysisResults from "@/components/AnalysisResult"

interface Analysis {
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
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchAnalysis = async () => {
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

        if (!res.ok) {
          throw new Error("Analysis not found")
        }

        const data = await res.json()
        setAnalysis(data.analysis)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analysis")
      } finally {
        setLoading(false)
      }
    }

    if (userId && analysisId) {
      fetchAnalysis()
    }
  }, [userId, analysisId])

  if (loading) {
    return (
      <div className="app-shell min-h-screen bg-ui-canvas py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ui-accent mx-auto mb-4"></div>
          <p className="text-ui-secondary">Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="app-shell min-h-screen bg-ui-canvas py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ui-text mb-2">Analysis Not Found</h2>
          <p className="text-ui-secondary mb-6">
            {error || "The analysis you're looking for doesn't exist or has expired."}
          </p>
          <a href="/" className="btn-primary">
            Go Home
            <span className="btn-orb">
              <ArrowRight className="h-4 w-4" />
            </span>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell min-h-screen bg-ui-canvas py-12 px-4">
      <div className="w-full">
        {/* Shared link indicator */}
        <div className="mb-8 p-4 bg-ui-sand-warm border border-ui-sand-strong rounded-lg">
          <p className="text-sm text-ui-text-deep">
            <span className="font-semibold">Shared Analysis</span> — This is a public read-only view
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