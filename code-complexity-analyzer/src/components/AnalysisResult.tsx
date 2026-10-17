"use client"

import { useEffect, useState } from "react"
import FileGraph, { riskColor } from "./FileGraph"
import AnimatedCounter from "./AnimatedCounter"
import type { GraphData } from "./FileGraph"
import { X, ArrowRight } from "lucide-react"
import dynamic from "next/dynamic"
import TrendCard from "./TrendCard"
import ComparisonSection from "./ComparisonSection"
import ShareModal from "./ShareModal"
import { REPORT_SHELL, REPORT_CORE } from "./report-shell"

const BarChartComponent = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
)

const ResponsiveContainerComponent = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
)

import { Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

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
  fileGraph?: GraphData
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
  // Canonical thresholds (never altered): low <= 25, medium 26-40, high > 40.
  if (complexity > 40) return "bg-ui-danger"
  if (complexity > 25) return "bg-ui-warning"
  return "bg-ui-success"
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
  // Bounded exit for the mobile file-detail sheet (motion spec: close on
  // animationend, timeout fallback <= 400ms).
  const [sheetClosing, setSheetClosing] = useState(false)
  const closeFileSheet = () => {
    if (!selectedFile || sheetClosing) return
    setSheetClosing(true)
    setTimeout(() => {
      setSelectedFile(null)
      setSheetClosing(false)
    }, 400)
  }
  const [priorAnalyses, setPriorAnalyses] = useState<Analysis[]>([])
  const [loadingComparison, setLoadingComparison] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

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

  const chartData = topComplexFiles.map((file) => ({
    ...file,
    displayName: file.path.split("/").pop() || file.path,
  }))

  const chartHeight = Math.max(300, chartData.length * 45)

  return (
    <div className="analysis-report space-y-8 ui-state-enter">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ui-text">{repoUrl.split("/").pop()}</h2>
          <p className="text-sm text-ui-secondary">
            {totalCommits} commits • Analyzed {new Date(data.timestamp).toLocaleDateString()}
          </p>
        </div>
        {!isShared && !isPreview && (
          <button
            onClick={onBack}
            className="secondary-action text-sm"
          >
            Analyze Another
          </button>
        )}
      </div>

      {/* Preview banner */}
      {isPreview && (
        <div className="rounded-lg border border-[#e0d3b4] bg-[#f3ead6] p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-[#6e5410]">
              <span className="font-semibold">Preview analysis:</span> Sign in to save this result to your history and unlock trends & comparisons.
            </p>
            <a
            href="/api/auth/login"
            className="primary-action ui-press"
          >
            Sign in with GitHub
            <span className="action-orb">
              <ArrowRight className="h-4 w-4" />
            </span>
          </a>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Total LOC" value={metrics.totalLoc} />
        <MetricCard label="Functions" value={metrics.totalFunctions} />
        <MetricCard label="Avg Complexity" value={metrics.averageComplexity} decimals={1} />
        <MetricCard label="Files" value={metrics.fileCount} />
      </div>

      {/* Trend Card */}
      {!isShared && !isPreview && !loadingComparison && priorAnalyses.length > 0 && (
        <TrendCard
          current={metrics}
          previous={priorAnalyses[0].metrics}
          previousDate={priorAnalyses[0].timestamp}
        />
      )}

      <FileGraph graph={data.fileGraph} />
      {/* Bar Chart — explicit readable state when no JS/TS files were found */}
      {chartData.length === 0 ? (
        <div className={REPORT_SHELL}>
          <div className={`${REPORT_CORE} p-6`}>
            <h3 className="text-lg font-semibold mb-2 text-ui-text">Top 10 Most Complex Files</h3>
            <p className="text-sm text-ui-secondary">No JavaScript or TypeScript files were analyzed.</p>
          </div>
        </div>
      ) : (
      <div className={REPORT_SHELL}>
        <div className={`${REPORT_CORE} p-6 ui-chart-enter`}>
          <h3 className="text-lg font-semibold mb-4 text-ui-text">Top 10 Most Complex Files</h3>
          <div role="img" aria-label="Bar chart of the ten highest-complexity files by cyclomatic score; full values are in the file details table below.">
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
              <Tooltip
                contentStyle={{
                  background: "var(--ui-raised)",
                  color: "var(--ui-text)",
                  border: "1px solid var(--ui-control-border)",
                  borderRadius: "var(--ui-radius-control)",
                  boxShadow: "none",
                  fontFamily: "var(--font-mono)",
                }}
              />
              <Bar isAnimationActive={false} dataKey="complexity" fill="#c1694f" name="Complexity Score" radius={[0,4,4,0]}>{chartData.map(file=><Cell key={file.path} fill={riskColor(file.complexity)}/>)}</Bar>
            </BarChartComponent>
          </ResponsiveContainerComponent>
          </div>
        </div>
      </div>
      )}

      {/* File Table - Desktop */}
      <div className={REPORT_SHELL}>
        <div className={`${REPORT_CORE} overflow-hidden`}>
          <div className="px-6 py-4 border-b border-ui-border">
            <h3 className="text-lg font-semibold text-ui-text">File Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ui-canvas border-b border-ui-border">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-ui-text-deep">File</th>
                  <th className="px-6 py-3 text-right font-semibold text-ui-text-deep">LOC</th>
                  <th className="px-6 py-3 text-right font-semibold text-ui-text-deep">Functions</th>
                  <th className="px-6 py-3 text-right font-semibold text-ui-text-deep">Complexity</th>
                </tr>
              </thead>
              <tbody>
                {topComplexFiles.map((file, idx) => (
                  <tr key={idx} className="border-b border-ui-border transition-colors duration-200 last:border-b-0 hover:bg-ui-canvas">
                    <td className="px-6 py-4 text-ui-text">{file.path}</td>
                    <td className="px-6 py-4 text-right text-ui-secondary tabular-nums">{file.loc}</td>
                    <td className="px-6 py-4 text-right text-ui-secondary tabular-nums">{file.functions}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-ui-surface text-xs font-semibold tabular-nums ${getComplexityColor(file.complexity)}`}>
                        {file.complexity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* File List - Mobile */}
      <div className="sm:hidden">
        <div className={REPORT_SHELL}>
          <div className={`${REPORT_CORE} overflow-hidden`}>
            <div className="px-4 py-4 border-b border-ui-border">
              <h3 className="text-lg font-semibold text-ui-text">File Details</h3>
            </div>
            <div>
              {topComplexFiles.map((file, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedFile(file)}
                  className="w-full flex items-center justify-between px-4 py-4 border-b border-ui-border last:border-b-0 hover:bg-ui-canvas active:bg-ui-sand text-left transition-colors duration-200"
                >
                  <span className="text-ui-text truncate pr-3">
                    {file.path.split("/").pop()}
                  </span>
                  <span
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-ui-surface text-xs font-semibold tabular-nums ${getComplexityColor(file.complexity)}`}
                  >
                    {file.complexity}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile detail sheet */}
      {selectedFile && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          onClick={closeFileSheet}
        >
          <div className="absolute inset-0 bg-[var(--ui-backdrop)]" />
          <div
            data-lenis-prevent="true"
            className={`absolute bottom-0 left-0 right-0 bg-ui-surface rounded-t-3xl p-6 pb-8 ui-state-enter ${sheetClosing ? "ui-modal-exit" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ui-border-strong" />
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-mono text-ui-text-deep break-all pr-4">
                {selectedFile.path}
              </p>
              <button
                onClick={closeFileSheet}
                className="flex-shrink-0 p-1 text-ui-taupe-soft hover:text-ui-secondary transition-colors"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-xs font-semibold text-ui-secondary uppercase tracking-wide">LOC</p>
                <p className="text-xl font-semibold text-ui-text mt-1 tabular-nums">{selectedFile.loc}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ui-secondary uppercase tracking-wide">Functions</p>
                <p className="text-xl font-semibold text-ui-text mt-1 tabular-nums">{selectedFile.functions}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ui-secondary uppercase tracking-wide">Complexity</p>
                <span
                  className={`inline-block mt-1 px-3 py-1 rounded-full text-ui-surface text-sm font-semibold tabular-nums ${getComplexityColor(selectedFile.complexity)}`}
                >
                  {selectedFile.complexity}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Section */}
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

      {/* Share button - only for authenticated */}
      {!isShared && userId && analysisId && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setShowShareModal(true)}
            className="primary-action ui-press"
          >
            Share Analysis
            <span className="action-orb">
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, decimals = 0 }: { label: string; value: number; decimals?: number }) {
  return (
    <div className="rounded-xl border border-ui-border p-4">
      <p className="text-sm text-ui-secondary mb-1">{label}</p>
      <p className="font-display text-2xl font-semibold text-ui-text tabular-nums">
        <AnimatedCounter value={value} decimals={decimals} />
      </p>
    </div>
  )
}