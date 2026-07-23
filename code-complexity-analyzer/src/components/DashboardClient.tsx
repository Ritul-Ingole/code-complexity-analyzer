"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Search, Filter, X } from "lucide-react"

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

type DateRange = "7days" | "30days" | "all"
type ComplexityLevel = "all" | "low" | "medium" | "high"
type SortOption = "newest" | "oldest" | "mostComplex" | "leastComplex" | "mostLOC"

// Complexity color badge helper
function getComplexityColor(complexity: number): string {
  if (complexity < 25) return "bg-green-100 text-green-800"
  if (complexity < 40) return "bg-yellow-100 text-yellow-800"
  return "bg-red-100 text-red-800"
}

// Get complexity level label
function getComplexityLevel(complexity: number): ComplexityLevel {
  if (complexity < 25) return "low"
  if (complexity < 40) return "medium"
  return "high"
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

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<DateRange>("all")
  const [complexityFilter, setComplexityFilter] = useState<ComplexityLevel>("all")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

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

  // Filter and sort logic
  const filteredAndSortedAnalyses = (() => {
    let result = [...analyses]

    // 1. Search filter (repo name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((analysis) =>
        analysis.repoUrl.toLowerCase().includes(query)
      )
    }

    // 2. Date range filter
    const now = new Date()
    if (dateRange !== "all") {
      const cutoffDate = new Date(now)
      if (dateRange === "7days") {
        cutoffDate.setDate(cutoffDate.getDate() - 7)
      } else if (dateRange === "30days") {
        cutoffDate.setDate(cutoffDate.getDate() - 30)
      }

      result = result.filter((analysis) => {
        const analysisDate = new Date(analysis.timestamp)
        return analysisDate >= cutoffDate
      })
    }

    // 3. Complexity filter
    if (complexityFilter !== "all") {
      result = result.filter((analysis) => {
        const level = getComplexityLevel(analysis.metrics.averageComplexity)
        return level === complexityFilter
      })
    }

    // 4. Sort
    if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    } else if (sortBy === "oldest") {
      result.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    } else if (sortBy === "mostComplex") {
      result.sort(
        (a, b) =>
          b.metrics.averageComplexity - a.metrics.averageComplexity
      )
    } else if (sortBy === "leastComplex") {
      result.sort(
        (a, b) =>
          a.metrics.averageComplexity - b.metrics.averageComplexity
      )
    } else if (sortBy === "mostLOC") {
      result.sort((a, b) => b.metrics.totalLoc - a.metrics.totalLoc)
    }

    return result
  })()

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    dateRange !== "all" ||
    complexityFilter !== "all" ||
    sortBy !== "newest"

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

        {!loading && !error && analyses.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by repository name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Panel Toggle */}
            <button
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                hasActiveFilters
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter size={18} />
              Filters {hasActiveFilters && <span className="text-xs font-bold">(active)</span>}
            </button>

            {/* Collapsible Filter Panel */}
            {filterPanelOpen && (
              <div className="bg-white border border-gray-300 rounded-lg p-6 space-y-6">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Date Range
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "7days", "30days"] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setDateRange(range)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          dateRange === range
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {range === "all"
                          ? "All Time"
                          : range === "7days"
                            ? "Last 7 Days"
                            : "Last 30 Days"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Complexity Level */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Complexity Level
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "low", "medium", "high"] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setComplexityFilter(level)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          complexityFilter === level
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {level === "all"
                          ? "All"
                          : level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sorting */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="mostComplex">Most Complex</option>
                    <option value="leastComplex">Least Complex</option>
                    <option value="mostLOC">Most LOC</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSearchQuery("")
                      setDateRange("all")
                      setComplexityFilter("all")
                      setSortBy("newest")
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={16} />
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
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

        {!loading && !error && analyses.length > 0 && (
          <div>
            {filteredAndSortedAnalyses.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600">
                  No analyses match your filters. Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredAndSortedAnalyses.map((analysis) => (
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
                            {new Date(analysis.timestamp).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 font-mono">
                            {analysis.headSha.slice(0, 7)} •{" "}
                            {analysis.totalCommits}{" "}
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
                        <FileDetailsExpandable
                          files={analysis.topComplexFiles}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}