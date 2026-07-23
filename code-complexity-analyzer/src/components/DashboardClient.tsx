"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface TopComplexFile {
  path: string
  loc: number
  complexity: number
  functions: number
}

interface Analysis {
  userID: string
  analysisId: string
  repoUrl: string
  timestamp: string
  headSha: string
  totalCommits: number
  metrics: {
    totalLoc: number
    totalFunctions: number
    averageComplexity: number
    fileCount: number
  }
  topComplexFiles: TopComplexFile[]
}

interface DashboardClientProps {
  userId: string
}

// Complexity color badge helper
function getComplexityColor(complexity: number): string {
  if (complexity < 25) return "bg-green-100 text-green-800"
  if (complexity < 40) return "bg-yellow-100 text-yellow-800"
  return "bg-red-100 text-red-800"
}

// Expandable file details component
function FileDetailsExpandable({ files }: { files: TopComplexFile[] }) {
  const [expanded, setExpanded] = useState(false)
  const displayFiles = expanded ? files : files.slice(0, 3)

  if (files.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded text-gray-600 text-sm">
        No JavaScript/TypeScript files found in this repository.
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="space-y-3">
        {displayFiles.map((file, idx) => (
          <div
            key={idx}
            className="p-3 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-gray-700 truncate">
                  {file.path}
                </p>
                <div className="flex gap-3 mt-2 text-xs text-gray-600">
                  <span>LOC: {file.loc}</span>
                  <span>Functions: {file.functions}</span>
                </div>
              </div>
              <div className="ml-2 flex-shrink-0">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getComplexityColor(
                    file.complexity
                  )}`}
                >
                  {file.complexity}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {files.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {expanded ? (
            <>
              <ChevronUp size={16} />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Show All {files.length} Files
            </>
          )}
        </button>
      )}
    </div>
  )
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
      setAnalyses(data.analyses || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Analysis History</h1>
        <p className="text-gray-600 mb-8">
          View all of your repository complexity analyses
        </p>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j}>
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-semibold">Error loading analyses</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {analyses.length === 0 && !loading && !error && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">No analyses yet.</p>
            <a
              href="/analyze"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Analyze a Repository
            </a>
          </div>
        )}

        <div className="grid gap-6">
          {analyses.map((analysis) => (
            <div
              key={analysis.analysisId}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 truncate">
                      {analysis.repoUrl.split("/").pop()}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(analysis.timestamp).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {analysis.headSha.slice(0, 7)} • {analysis.totalCommits}{" "}
                      {analysis.totalCommits === 1 ? "commit" : "commits"}
                    </p>
                  </div>
                  <a
                    href={analysis.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex-shrink-0"
                  >
                    View on GitHub →
                  </a>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      LOC
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {analysis.metrics.totalLoc.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Functions
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {analysis.metrics.totalFunctions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Avg Complexity
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {analysis.metrics.averageComplexity.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Files Analyzed
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {analysis.metrics.fileCount}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Most Complex Files
                  </p>
                  <FileDetailsExpandable files={analysis.topComplexFiles} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}