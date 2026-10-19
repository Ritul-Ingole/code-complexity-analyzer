"use client"

import { useEffect, useState } from "react"
import FileGraph, { riskColor } from "./FileGraph"
import FileDetailDialog from "./FileDetailDialog"
import AnimatedCounter from "./AnimatedCounter"
import type { GraphData } from "./FileGraph"
import { ArrowRight } from "lucide-react"
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
  const [priorAnalyses, setPriorAnalyses] = useState<Analysis[]>([])
  const [loadingComparison, setLoadingComparison] = useState(false)
  // A failed prior-analysis fetch must stay distinct from "no history":
  // silently empty would read as a first analysis and hide the outage.
  const [comparisonError, setComparisonError] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  // Fetch prior analyses on mount (skip if shared or preview)
  useEffect(() => {
    if (isShared || isPreview) return

    const fetchPriorAnalyses = async () => {
      try {
        setLoadingComparison(true)
        setComparisonError(false)
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
        setComparisonError(true)
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
        <div className="rounded-lg border border-ui-border bg-[var(--ui-warning-surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ui-warning">
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

      {/* File Table - Desktop (hidden below sm — mobile uses the list below; without
          this the 4-column table squeezes the File column to ~1 char per line) */}
      <div className={`hidden sm:block ${REPORT_SHELL}`}>
        <div className={`${REPORT_CORE} overflow-hidden`}>
          <div className="px-6 py-4 border-b border-ui-border">
            <h3 className="text-lg font-semibold text-ui-text">File Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ui-canvas border-b border-ui-border">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left font-semibold text-ui-text-deep">File</th>
                  <th scope="col" className="px-6 py-3 text-right font-semibold text-ui-text-deep">LOC</th>
                  <th scope="col" className="px-6 py-3 text-right font-semibold text-ui-text-deep">Functions</th>
                  <th scope="col" className="px-6 py-3 text-right font-semibold text-ui-text-deep">Complexity</th>
                </tr>
              </thead>
              <tbody>
                {topComplexFiles.map((file) => (
                  <tr key={file.path} className="border-b border-ui-border transition-colors duration-200 last:border-b-0 hover:bg-ui-canvas">
                    <td className="px-6 py-4 text-ui-text break-all">{file.path}</td>
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
              {topComplexFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className="w-full px-4 py-4 border-b border-ui-border last:border-b-0 hover:bg-ui-canvas active:bg-ui-sand text-left transition-colors duration-200"
                >
                  <span className="flex items-center justify-between gap-3">
                    {/* flex-1 basis-0: takes the full width left of the badge;
                        without it flexbox shrinks the box to min-content (1 char,
                        because break-all makes every char a break point). */}
                    <span className="flex-1 min-w-0 text-sm font-semibold text-ui-text break-all">
                      {file.path.split("/").pop()}
                    </span>
                    <span
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-ui-surface text-xs font-semibold tabular-nums ${getComplexityColor(file.complexity)}`}
                    >
                      {file.complexity}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-ui-secondary break-all">
                    {file.path}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile file detail — native dialog (focus trap + Escape) */}
      {selectedFile && (
        <FileDetailDialog file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}

      {/* Comparison Section */}
      {!isShared && !isPreview && !loadingComparison && priorAnalyses.length > 0 && (
        <ComparisonSection current={data} priorAnalyses={priorAnalyses} />
      )}
      {comparisonError && !isShared && !isPreview && !loadingComparison && (
        <p className="text-sm text-ui-secondary">Previous analyses could not be loaded, so trends and comparisons are unavailable right now.</p>
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