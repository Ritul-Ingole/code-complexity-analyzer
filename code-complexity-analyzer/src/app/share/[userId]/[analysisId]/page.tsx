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
      <div className="app-shell min-h-screen bg-[#f4f1ea] py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c1694f] mx-auto mb-4"></div>
          <p className="text-[#6f665a]">Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="app-shell min-h-screen bg-[#f4f1ea] py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#2b2620] mb-2">Analysis Not Found</h2>
          <p className="text-[#6f665a] mb-6">
            {error || "The analysis you're looking for doesn't exist or has expired."}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-[#d9a441] text-[#2b2620] rounded-lg hover:bg-[#cc9738] transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell min-h-screen bg-[#f4f1ea] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Shared link indicator */}
        <div className="mb-8 p-4 bg-[#f2ead9] border border-[#dfcba2] rounded-lg">
          <p className="text-sm text-[#51483d]">
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