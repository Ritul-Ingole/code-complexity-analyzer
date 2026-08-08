"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import dynamic from "next/dynamic"
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

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
  if (complexity > 40) return "bg-red-500"
  if (complexity > 25) return "bg-yellow-500"
  return "bg-green-500"
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
      <h4 className="text-base font-semibold text-gray-900">
        {title}
        {subtitle && (
          <span className="text-gray-500 font-normal text-sm"> ({subtitle})</span>
        )}
      </h4>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-600">LOC</p>
          <p className="text-lg font-bold text-gray-900">
            {analysis.metrics.totalLoc.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Functions</p>
          <p className="text-lg font-bold text-gray-900">
            {analysis.metrics.totalFunctions}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Avg Complexity</p>
          <p className="text-lg font-bold text-gray-900">
            {analysis.metrics.averageComplexity.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Files</p>
          <p className="text-lg font-bold text-gray-900">
            {analysis.metrics.fileCount}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">
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
            <Tooltip />
            <Bar
              dataKey="complexity"
              fill="#3b82f6"
              name="Complexity Score"
              radius={[0, 4, 4, 0]}
            />
          </BarChartComponent>
        </ResponsiveContainerComponent>
      </div>

      {/* File details table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">
                File
              </th>
              <th className="px-4 py-2 text-right font-semibold text-gray-700">
                LOC
              </th>
              <th className="px-4 py-2 text-right font-semibold text-gray-700">
                Functions
              </th>
              <th className="px-4 py-2 text-right font-semibold text-gray-700">
                Complexity
              </th>
            </tr>
          </thead>
          <tbody>
            {analysis.topComplexFiles.map((file, idx) => (
              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-900">
                  {file.path.split("/").pop()}
                </td>
                <td className="px-4 py-2 text-right text-gray-600">{file.loc}</td>
                <td className="px-4 py-2 text-right text-gray-600">
                  {file.functions}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${getComplexityColor(file.complexity)}`}
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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header - clickable to toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 text-left">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Comparison</h3>
          <p className="text-sm text-gray-500">
            {isOpen ? "Click to collapse" : "Click to expand"}
          </p>
        </div>
        {isOpen ? (
          <ChevronUp size={24} className="text-gray-600" />
        ) : (
          <ChevronDown size={24} className="text-gray-600" />
        )}
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="border-t border-gray-200 px-6 py-6 space-y-8">
          {/* Dropdown to select which analysis to compare */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-900">
              Compare Current to:
            </label>
            <select
              value={selectedAnalysisIndex}
              onChange={(e) => setSelectedAnalysisIndex(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-md"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6 lg:divide-x lg:divide-gray-200">
            <div className="lg:pr-6">
              <AnalysisColumn
                title="Current Analysis"
                analysis={current}
                chartHeight={chartHeight}
              />
            </div>

            {/* Divider - only shown on mobile between stacked sections */}
            <div className="border-t border-gray-200 lg:hidden" />

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
  )
}