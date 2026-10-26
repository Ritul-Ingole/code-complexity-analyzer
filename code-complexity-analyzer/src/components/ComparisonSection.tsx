"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import dynamic from "next/dynamic"
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { REPORT_SHELL, REPORT_CORE } from "./report-shell"

const BarChartComponent = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
)

const ResponsiveContainerComponent = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
)

interface ComplexFile {
  path: string
  loc: number
  functions: number
  complexity: number
}

interface Analysis {
  timestamp: string
  metrics: {
    totalLoc: number
    totalFunctions: number
    averageComplexity: number
    fileCount: number
  }
  topComplexFiles: ComplexFile[]
}

interface ComparisonSectionProps {
  current: Analysis
  priorAnalyses: Analysis[]
}

function getComplexityColor(complexity: number): string {
  // Canonical thresholds (never altered): low <= 25, medium 26-40, high > 40.
  if (complexity > 40) return "bg-ui-danger"
  if (complexity > 25) return "bg-ui-warning"
  return "bg-ui-success"
}

// Single analysis column - reused for both current and previous, side by side on desktop
function AnalysisColumn({
  title,
  subtitle,
  analysis,
  chartHeight,
}: {
  title: string
  subtitle?: string
  analysis: Analysis
  chartHeight: number
}) {
  const chartData = analysis.topComplexFiles.map((file) => ({
    ...file,
    displayName: file.path.split("/").pop() || file.path,
  }))

  return (
    <div className="space-y-4">
      <h4 className="text-base font-semibold text-ui-text">
        {title}
        {subtitle && (
          <span className="text-ui-secondary font-normal text-sm"> ({subtitle})</span>
        )}
      </h4>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-ui-secondary">LOC</p>
          <p className="text-lg font-bold text-ui-text">
            {analysis.metrics.totalLoc.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-ui-secondary">Functions</p>
          <p className="text-lg font-bold text-ui-text">
            {analysis.metrics.totalFunctions}
          </p>
        </div>
        <div>
          <p className="text-ui-secondary">Avg Complexity</p>
          <p className="text-lg font-bold text-ui-text">
            {analysis.metrics.averageComplexity.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-ui-secondary">Files</p>
          <p className="text-lg font-bold text-ui-text">
            {analysis.metrics.fileCount}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-ui-canvas rounded-lg p-4 ui-chart-enter">
        <p className="text-sm font-semibold text-ui-text-deep mb-3">
          Top Complex Files
        </p>
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
              width={100}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--ui-surface)",
                border: "1px solid var(--ui-border)",
                borderRadius: 12,
                boxShadow: "0 8px 24px -12px rgba(43,38,32,0.25)",
                fontSize: 12,
                color: "var(--ui-text)",
              }}
              cursor={{ fill: "rgba(193,105,79,0.08)" }}
            />
            <Bar
              isAnimationActive={false}
              dataKey="complexity"
              fill="#c1694f"
              name="Complexity Score"
              radius={[0, 4, 4, 0]}
            />
          </BarChartComponent>
        </ResponsiveContainerComponent>
      </div>

      {/* File details table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ui-sand border-b border-ui-border">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-ui-text-deep">
                File
              </th>
              <th className="px-4 py-2 text-right font-semibold text-ui-text-deep">
                LOC
              </th>
              <th className="px-4 py-2 text-right font-semibold text-ui-text-deep">
                Functions
              </th>
              <th className="px-4 py-2 text-right font-semibold text-ui-text-deep">
                Complexity
              </th>
            </tr>
          </thead>
          <tbody>
            {analysis.topComplexFiles.map((file, idx) => (
              <tr key={idx} className="border-b border-ui-border hover:bg-ui-canvas">
                <td className="px-4 py-2 text-ui-text">
                  {file.path.split("/").pop()}
                </td>
                <td className="px-4 py-2 text-right text-ui-secondary">{file.loc}</td>
                <td className="px-4 py-2 text-right text-ui-secondary">
                  {file.functions}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`px-2 py-1 rounded-full text-ui-surface text-xs font-semibold ${getComplexityColor(file.complexity)}`}
                  >
                    {file.complexity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ComparisonSection({
  current,
  priorAnalyses,
}: ComparisonSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAnalysisIndex, setSelectedAnalysisIndex] = useState(0)

  if (priorAnalyses.length === 0) {
    return null // Don't show if no prior analyses
  }

  const selectedAnalysis = priorAnalyses[selectedAnalysisIndex]
  if (!selectedAnalysis) {
    return null
  }

  const chartHeight = Math.max(
    300,
    Math.max(current.topComplexFiles.length, selectedAnalysis.topComplexFiles.length) * 45
  )

  return (
    <div className={REPORT_SHELL}>
      <div className={`${REPORT_CORE} overflow-hidden`}>
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-ui-canvas"
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-ui-text">Detailed Comparison</h3>
        </div>
        {isOpen ? (
          <ChevronUp size={24} className="text-ui-secondary" strokeWidth={1.5} />
        ) : (
          <ChevronDown size={24} className="text-ui-secondary" strokeWidth={1.5} />
        )}
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="border-t border-ui-border px-6 py-6 space-y-8">
          {/* Dropdown to select which analysis to compare */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-ui-text">
              Compare Current to:
            </label>
            <select
              value={selectedAnalysisIndex}
              onChange={(e) => setSelectedAnalysisIndex(Number(e.target.value))}
              className="max-w-md rounded-xl border border-ui-border-strong bg-ui-surface-raised px-4 py-2.5 text-sm text-ui-text"
            >
              {priorAnalyses.map((analysis, idx) => (
                <option key={idx} value={idx}>
                  {new Date(analysis.timestamp).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  • {analysis.metrics.totalLoc.toLocaleString()} LOC
                </option>
              ))}
            </select>
          </div>

          {/* Responsive comparison: stacked on mobile, side-by-side on lg+ (desktop/big screens) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6 lg:divide-x lg:divide-ui-border">
            <div className="lg:pr-6">
              <AnalysisColumn
                title="Current Analysis"
                analysis={current}
                chartHeight={chartHeight}
              />
            </div>

            {/* Divider - only shown on mobile between stacked sections */}
            <div className="border-t border-ui-border lg:hidden" />

            <div className="lg:pl-6">
              <AnalysisColumn
                title="Previous Analysis"
                subtitle={new Date(selectedAnalysis.timestamp).toLocaleDateString()}
                analysis={selectedAnalysis}
                chartHeight={chartHeight}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}