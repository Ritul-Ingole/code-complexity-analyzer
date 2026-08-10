"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import dynamic from "next/dynamic"
import TrendCard from "./TrendCard"
import ComparisonSection from "./ComparisonSection"
import ShareModal from "./ShareModal"

const BarChartComponent = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
)

const ResponsiveContainerComponent = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
)

import { Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

interface Metric {
  totalLoc: number
  totalFunctions: number
  averageComplexity: number
  fileCount: number
}

interface ComplexFile {
  path: string
  loc: number
  functions: number
  complexity: number
}

interface Analysis {
  timestamp: string
  repoUrl: string
  headSha: string
  totalCommits: number
  metrics: Metric
  topComplexFiles: ComplexFile[]
}

interface AnalysisResultsProps {
  data: Analysis
  onBack: () => void
  isShared?: boolean
  userId?: string
  analysisId?: string
  isPreview?: boolean
}

function getComplexityColor(complexity: number): string {
  if (complexity > 40) return "bg-red-500"
  if (complexity > 25) return "bg-yellow-500"
  return "bg-green-500"
}

export default function AnalysisResults({
  data,
  onBack,
  isShared = false,
  userId,
  analysisId,
  isPreview = false,
}: AnalysisResultsProps) {
  const { metrics, topComplexFiles, repoUrl, totalCommits } = data
  const [selectedFile, setSelectedFile] = useState<ComplexFile | null>(null)
  const [priorAnalyses, setPriorAnalyses] = useState<Analysis[]>([])
  const [loadingComparison, setLoadingComparison] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationMessage, setMigrationMessage] = useState("")

  // Fetch prior analyses on mount (skip if shared or preview)
  useEffect(() => {
    if (isShared || isPreview) return

    const fetchPriorAnalyses = async () => {
      try {
        setLoadingComparison(true)
        const res = await fetch(`/api/analyses-for-repo?url=${encodeURIComponent(repoUrl)}`)
        if (!res.ok) throw new Error("Failed to fetch prior analyses")
        const result = await res.json()

        const allAnalyses = result.analyses || []
        const filtered = allAnalyses.filter(
          (analysis: Analysis) => analysis.timestamp !== data.timestamp
        )

        setPriorAnalyses(filtered)
      } catch (err) {
        console.error("Error fetching prior analyses:", err)
      } finally {
        setLoadingComparison(false)
      }
    }

    fetchPriorAnalyses()
  }, [repoUrl, data.timestamp, isShared, isPreview])

  // Handle preview analysis migration to authenticated account
  const handleMigrateAnalysis = async () => {
    setMigrating(true)
    setMigrationMessage("")

    try {
      const res = await fetch("/api/migrate-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error("Failed to save analysis")

      const result = await res.json()
      setMigrationMessage("✓ Analysis saved to your history")
      
      // Clear sessionStorage
      sessionStorage.removeItem("pendingAnalysis")
      sessionStorage.removeItem("hasUsedFreeAnalysis")

      setTimeout(() => {
        onBack()
      }, 1500)
    } catch (err) {
      setMigrationMessage("✗ Failed to save. Please try again.")
      console.error("Migration error:", err)
    } finally {
      setMigrating(false)
    }
  }

  const chartData = topComplexFiles.map((file) => ({
    ...file,
    displayName: file.path.split("/").pop() || file.path,
  }))

  const chartHeight = Math.max(300, chartData.length * 45)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{repoUrl.split("/").pop()}</h2>
          <p className="text-sm text-gray-500">
            {totalCommits} commits • Analyzed {new Date(data.timestamp).toLocaleDateString()}
          </p>
        </div>
        {!isShared && !isPreview && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm border border-green-500 rounded-lg hover:bg-green-50 text-gray-900 transition-colors duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Analyze Another
          </button>
        )}
      </div>

      {/* Preview banner with sign in button */}
      {isPreview && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Preview analysis:</span> Sign in to save this result to your history and unlock trends & comparisons.
            </p>
            <a
              href="/api/auth/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap transition-colors"
            >
              Sign in with GitHub
            </a>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Total LOC" value={metrics.totalLoc.toLocaleString()} />
        <MetricCard label="Functions" value={metrics.totalFunctions.toLocaleString()} />
        <MetricCard label="Avg Complexity" value={metrics.averageComplexity.toFixed(1)} />
        <MetricCard label="Files" value={metrics.fileCount.toLocaleString()} />
      </div>

      {/* Trend Card - only show if there are prior analyses and not shared/preview */}
      {!isShared && !isPreview && !loadingComparison && priorAnalyses.length > 0 && (
        <TrendCard
          current={metrics}
          previous={priorAnalyses[0].metrics}
          previousDate={priorAnalyses[0].timestamp}
        />
      )}

      {/* Top Complex Files Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Top 10 Most Complex Files</h3>
        <ResponsiveContainerComponent width="100%" height={chartHeight}>
          <BarChartComponent
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, "dataMax + 5"]} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="displayName"
              width={110}
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Bar dataKey="complexity" fill="#3b82f6" name="Complexity Score" radius={[0, 4, 4, 0]} />
          </BarChartComponent>
        </ResponsiveContainerComponent>
      </div>

      {/* Files Table - Desktop (sm and up) */}
      <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">File Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">File</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">LOC</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Functions</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Complexity</th>
              </tr>
            </thead>
            <tbody>
              {topComplexFiles.map((file, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{file.path.split("/").pop()}</td>
                  <td className="px-6 py-4 text-right text-gray-600">{file.loc}</td>
                  <td className="px-6 py-4 text-right text-gray-600">{file.functions}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${getComplexityColor(file.complexity)}`}>
                      {file.complexity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Files List - Mobile only */}
      <div className="sm:hidden bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">File Details</h3>
        </div>
        <div>
          {topComplexFiles.map((file, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedFile(file)}
              className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 active:bg-gray-100 text-left"
            >
              <span className="text-gray-900 truncate pr-3">
                {file.path.split("/").pop()}
              </span>
              <span
                className={`flex-shrink-0 px-3 py-1 rounded-full text-white text-xs font-semibold ${getComplexityColor(file.complexity)}`}
              >
                {file.complexity}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Sheet - Mobile file detail modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          onClick={() => setSelectedFile(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-mono text-gray-700 break-all pr-4">
                {selectedFile.path}
              </p>
              <button
                onClick={() => setSelectedFile(null)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">LOC</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{selectedFile.loc}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Functions</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{selectedFile.functions}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Complexity</p>
                <span
                  className={`inline-block mt-1 px-3 py-1 rounded-full text-white text-sm font-semibold ${getComplexityColor(selectedFile.complexity)}`}
                >
                  {selectedFile.complexity}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Section - collapsible, only shows if prior analyses exist and not shared/preview */}
      {!isShared && !isPreview && !loadingComparison && priorAnalyses.length > 0 && (
        <ComparisonSection current={data} priorAnalyses={priorAnalyses} />
      )}

      {/* Share Modal */}
      {userId && analysisId && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          userId={userId}
          analysisId={analysisId}
        />
      )}

      {/* Action buttons - differ based on auth/preview status */}
      {!isShared && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          {isPreview ? (
            <>
              <button
                onClick={handleMigrateAnalysis}
                disabled={migrating}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {migrating ? "Saving..." : "Sign In & Save"}
              </button>
              {migrationMessage && (
                <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  migrationMessage.startsWith("✓")
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {migrationMessage}
                </div>
              )}
            </>
          ) : userId && analysisId ? (
            <button
              onClick={() => setShowShareModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Share Analysis
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}