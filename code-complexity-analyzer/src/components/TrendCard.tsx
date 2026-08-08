"use client"

import { TrendingUp, TrendingDown } from "lucide-react"

interface Metric {
  totalLoc: number
  totalFunctions: number
  averageComplexity: number
  fileCount: number
}

interface TrendCardProps {
  current: Metric
  previous: Metric
  previousDate: string
}

function DeltaDisplay({
  label,
  current,
  previous,
  isComplexity = false,
}: {
  label: string
  current: number
  previous: number
  isComplexity?: boolean
}) {
  const delta = current - previous
  const percentChange = ((delta / previous) * 100).toFixed(1)
  const isPositive = delta > 0
  const isNeutral = delta === 0

  // Complexity: lower is better (green = decrease, red = increase)
  // LOC: lower is better (green = decrease, red = increase)
  // Functions: neutral (gray)
  let bgColor = "bg-gray-50"
  let textColor = "text-gray-900"
  let badgeColor = "bg-gray-100"
  let badgeText = "text-gray-700"

  if (label === "Functions") {
    // Functions: always gray
    badgeColor = "bg-gray-100"
    badgeText = "text-gray-700"
  } else if (isComplexity) {
    // Complexity: green if decrease, red if increase
    if (delta < 0) {
      badgeColor = "bg-green-100"
      badgeText = "text-green-700"
    } else if (delta > 0) {
      badgeColor = "bg-red-100"
      badgeText = "text-red-700"
    }
  } else {
    // LOC: green if decrease, red if increase
    if (delta < 0) {
      badgeColor = "bg-green-100"
      badgeText = "text-green-700"
    } else if (delta > 0) {
      badgeColor = "bg-red-100"
      badgeText = "text-red-700"
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-gray-600">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-lg font-bold text-gray-900">
          {current.toLocaleString()}
        </p>
        <span className="text-gray-400">→</span>
        <div className={`flex items-center gap-1 px-2 py-1 rounded ${badgeColor}`}>
          {!isNeutral && (isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />)}
          <span className={`text-sm font-semibold ${badgeText}`}>
            {isPositive ? "+" : ""}{delta} ({percentChange}%)
          </span>
        </div>
      </div>
    </div>
  )
}

export default function TrendCard({
  current,
  previous,
  previousDate,
}: TrendCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          📈 Trend vs. Previous Analysis
        </h3>
        <p className="text-sm text-gray-500">
          {new Date(previousDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <DeltaDisplay
          label="LOC"
          current={current.totalLoc}
          previous={previous.totalLoc}
        />
        <DeltaDisplay
          label="Complexity"
          current={current.averageComplexity}
          previous={previous.averageComplexity}
          isComplexity
        />
        <DeltaDisplay
          label="Functions"
          current={current.totalFunctions}
          previous={previous.totalFunctions}
        />
      </div>
    </div>
  )
}