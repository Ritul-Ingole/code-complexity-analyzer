"use client"

import { useEffect, useState } from "react"
import FileGraph, { riskColor } from "./FileGraph"
import ScrollReveal from "./ScrollReveal"
import AnimatedCounter from "./AnimatedCounter"
import type { GraphData } from "./FileGraph"
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
    <div className="analysis-report space-y-8">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#2b2620]">{repoUrl.split("/").pop()}</h2>
          <p className="text-sm text-[#6f665a]">
            {totalCommits} commits • Analyzed {new Date(data.timestamp).toLocaleDateString()}
          </p>
        </div>
        {!isShared && !isPreview && (
          <button
            onClick={onBack}
            className="btn-secondary text-sm"
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
              className="px-4 py-2 bg-[#d9a441] text-[#2b2620] rounded-lg hover:bg-[#cc9738] text-sm font-medium whitespace-nowrap transition-colors"
            >
              Sign in with GitHub
            </a>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <ScrollReveal>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard label="Total LOC" value={metrics.totalLoc} />
          <MetricCard label="Functions" value={metrics.totalFunctions} />
          <MetricCard label="Avg Complexity" value={metrics.averageComplexity} decimals={1} />
          <MetricCard label="Files" value={metrics.fileCount} />
        </div>
      </ScrollReveal>

      {/* Trend Card */}
      {!isShared && !isPreview && !loadingComparison && priorAnalyses.length > 0 && (
        <TrendCard
          current={metrics}
          previous={priorAnalyses[0].metrics}
          previousDate={priorAnalyses[0].timestamp}
        />
      )}

      <FileGraph graph={data.fileGraph} />
      {/* Bar Chart */}
      <div className="bg-[#faf8f3] rounded-2xl border border-[#e6e0d4] shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-[#2b2620]">Top 10 Most Complex Files</h3>
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
            <Bar dataKey="complexity" fill="#c1694f" name="Complexity Score" radius={[0,4,4,0]}>{chartData.map(file=><Cell key={file.path} fill={riskColor(file.complexity)}/>)}</Bar>
          </BarChartComponent>
        </ResponsiveContainerComponent>
      </div>

      {/* File Table - Desktop */}
      <div className="hidden sm:block bg-[#faf8f3] rounded-2xl border border-[#e6e0d4] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e6e0d4]">
          <h3 className="text-lg font-semibold text-[#2b2620]">File Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f4f1ea] border-b border-[#e6e0d4]">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-[#51483d]">File</th>
                <th className="px-6 py-3 text-right font-semibold text-[#51483d]">LOC</th>
                <th className="px-6 py-3 text-right font-semibold text-[#51483d]">Functions</th>
                <th className="px-6 py-3 text-right font-semibold text-[#51483d]">Complexity</th>
              </tr>
            </thead>
            <tbody>
              {topComplexFiles.map((file, idx) => (
                <tr key={idx} className="border-b border-[#e6e0d4] hover:bg-[#f4f1ea]">
                  <td className="px-6 py-4 text-[#2b2620]">{file.path}</td>
                  <td className="px-6 py-4 text-right text-[#6f665a]">{file.loc}</td>
                  <td className="px-6 py-4 text-right text-[#6f665a]">{file.functions}</td>
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

      {/* File List - Mobile */}
      <div className="sm:hidden bg-[#faf8f3] rounded-2xl border border-[#e6e0d4] shadow-sm overflow-hidden">
        <div className="px-4 py-4 border-b border-[#e6e0d4]">
          <h3 className="text-lg font-semibold text-[#2b2620]">File Details</h3>
        </div>
        <div>
          {topComplexFiles.map((file, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedFile(file)}
              className="w-full flex items-center justify-between px-4 py-4 border-b border-[#e6e0d4] last:border-b-0 hover:bg-[#f4f1ea] active:bg-[#eee9de] text-left"
            >
              <span className="text-[#2b2620] truncate pr-3">
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

      {/* Mobile detail sheet */}
      {selectedFile && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          onClick={() => setSelectedFile(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#faf8f3] rounded-t-2xl p-6 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-mono text-[#51483d] break-all pr-4">
                {selectedFile.path}
              </p>
              <button
                onClick={() => setSelectedFile(null)}
                className="flex-shrink-0 p-1 text-[#766c5e] hover:text-[#6f665a]"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-xs font-semibold text-[#6f665a] uppercase tracking-wide">LOC</p>
                <p className="text-xl font-bold text-[#2b2620] mt-1">{selectedFile.loc}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6f665a] uppercase tracking-wide">Functions</p>
                <p className="text-xl font-bold text-[#2b2620] mt-1">{selectedFile.functions}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6f665a] uppercase tracking-wide">Complexity</p>
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
            className="px-6 py-2 bg-[#d9a441] text-[#2b2620] rounded-lg hover:bg-[#cc9738] transition-colors font-medium"
          >
            Share Analysis
          </button>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, decimals = 0 }: { label: string; value: number; decimals?: number }) {
  return (
    <div className="bg-[#faf8f3] rounded-2xl border border-[#e6e0d4] shadow-sm p-4 transition-all hover:-translate-y-0.5 hover:border-[#c1694f]/30 hover:shadow-md">
      <p className="text-sm text-[#6f665a] mb-1">{label}</p>
      <p className="font-display text-2xl font-semibold text-[#2b2620]">
        <AnimatedCounter value={value} decimals={decimals} />
      </p>
    </div>
  )
}