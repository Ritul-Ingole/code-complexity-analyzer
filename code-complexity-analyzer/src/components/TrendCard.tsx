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
  let bgColor = "bg-[#f4f1ea]"
  let textColor = "text-[#2b2620]"
  let badgeColor = "bg-[#eee9de]"
  let badgeText = "text-[#51483d]"

  if (label === "Functions") {
    // Functions: always gray
    badgeColor = "bg-[#eee9de]"
    badgeText = "text-[#51483d]"
  } else if (isComplexity) {
    // Complexity: green if decrease, red if increase
    if (delta < 0) {
      badgeColor = "badge-good"
      badgeText = ""
    } else if (delta > 0) {
      badgeColor = "badge-bad"
      badgeText = ""
    }
  } else {
    // LOC: green if decrease, red if increase
    if (delta < 0) {
      badgeColor = "badge-good"
      badgeText = ""
    } else if (delta > 0) {
      badgeColor = "badge-bad"
      badgeText = ""
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-[#6f665a]">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-lg font-bold text-[#2b2620]">
          {current.toLocaleString()}
        </p>
        <span className="text-[#766c5e]">→</span>
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
    <div className="bg-[#faf8f3] rounded-2xl border border-[#e6e0d4] border-l-4 border-l-[#c1694f] shadow-[0_1px_2px_rgba(43,38,32,0.04),0_12px_32px_-20px_rgba(43,38,32,0.2)] p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#2b2620]">
          Trend vs. previous analysis
        </h3>
        <p className="text-sm text-[#6f665a]">
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