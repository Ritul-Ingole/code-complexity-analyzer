"use client"

import { useState } from "react"
import { X } from "lucide-react"
import dynamic from "next/dynamic"

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

interface AnalysisResultsProps {
  data: {
    timestamp: string
    repoUrl: string
    headSha: string
    totalCommits: number
    metrics: Metric
    topComplexFiles: ComplexFile[]
  }
  onBack: () => void
}

function getComplexityColor(complexity: number): string {
  if (complexity > 40) return "bg-red-500"
  if (complexity > 25) return "bg-yellow-500"
  return "bg-green-500"
}

export default function AnalysisResults({ data, onBack }: AnalysisResultsProps) {
  const { metrics, topComplexFiles, repoUrl, totalCommits } = data
  const [selectedFile, setSelectedFile] = useState<ComplexFile | null>(null)

  // Transform data for chart: show only filename
  const chartData = topComplexFiles.map(file => ({
    ...file,
    displayName: file.path.split("/").pop() || file.path,
  }))

  // Dynamic chart height: more files = taller chart (horizontal bars need vertical space)
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
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm border border-green-500 rounded-lg hover:bg-green-50 text-gray-900 transition-colors duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Analyze Another
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Total LOC" value={metrics.totalLoc.toLocaleString()} />
        <MetricCard label="Functions" value={metrics.totalFunctions.toLocaleString()} />
        <MetricCard label="Avg Complexity" value={metrics.averageComplexity.toFixed(1)} />
        <MetricCard label="Files" value={metrics.fileCount.toLocaleString()} />
      </div>

      {/* Top Complex Files Chart - Horizontal bars so file names never get cut off */}
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

      {/* Files List - Mobile only (below sm). Tap a row to open bottom sheet with full details. */}
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Sheet */}
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