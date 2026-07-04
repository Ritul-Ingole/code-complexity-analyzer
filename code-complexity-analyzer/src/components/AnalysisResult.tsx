"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

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

export default function AnalysisResults({ data, onBack }: AnalysisResultsProps) {
  const { metrics, topComplexFiles, repoUrl, totalCommits } = data

  // Transform data for chart: show only filename
  const chartData = topComplexFiles.map(file => ({
    ...file,
    displayName: file.path.split("/").pop() || file.path,
  }))

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

      {/* Top Complex Files Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Top 10 Most Complex Files</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="displayName"
              angle={0}
              textAnchor="middle"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis domain={[0, "dataMax + 5"]} />
            <Tooltip />
            <Bar dataKey="complexity" fill="#3b82f6" name="Complexity Score" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Files Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${
                      file.complexity > 40 ? "bg-red-500" :
                      file.complexity > 25 ? "bg-yellow-500" :
                      "bg-green-500"
                    }`}>
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