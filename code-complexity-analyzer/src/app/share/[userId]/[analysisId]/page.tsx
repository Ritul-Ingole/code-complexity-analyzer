"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
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
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || "The analysis you're looking for doesn't exist or has expired."}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Shared link indicator */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
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