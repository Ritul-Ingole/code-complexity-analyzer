"use client"

import { useEffect, useState } from "react"

interface Analysis {
  userID: string
  analysisId: string
  repoUrl: string
  timestamp: string
  metrics: {
    totalLoc: number
    totalFunctions: number
    averageComplexity: number
    fileCount: number
  }
}

interface DashboardClientProps {
  userId: number
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    try {
      const res = await fetch("/api/analyses")
      if (!res.ok) throw new Error("Failed to fetch analyses")
      const data = await res.json()
      setAnalyses(data.analyses)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Analysis History</h1>

        {loading && <p>Loading analyses...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {analyses.length === 0 && !loading && (
          <p className="text-gray-600">
            No analyses yet.{" "}
            <a href="/analyze" className="text-blue-600 hover:underline">
              Analyze a repository
            </a>
          </p>
        )}

        <div className="grid gap-4">
          {analyses.map((analysis) => (
            <div
              key={analysis.analysisId}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                {analysis.repoUrl.split("/").pop()}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {new Date(analysis.timestamp).toLocaleDateString()}
              </p>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">LOC</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analysis.metrics.totalLoc.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Functions</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analysis.metrics.totalFunctions.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Complexity</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analysis.metrics.averageComplexity.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Files</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analysis.metrics.fileCount}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}