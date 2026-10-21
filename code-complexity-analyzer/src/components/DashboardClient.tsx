"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Search, Filter, X, Download, MoreVertical, Share2, ArrowRight, ArrowUpRight } from "lucide-react"
import { readMotion } from "@/lib/motion"
import type { CSSProperties } from "react"
import AppShell from "./AppShell"
import AnalysisResults from "./AnalysisResult"
import type { GraphData } from "./FileGraph"
import ShareModal from "./ShareModal"

interface TopComplexFile {
  path: string
  loc: number
  complexity: number
  functions: number
}

interface Analysis {
  fileGraph?: GraphData
  userID: string
  analysisId: string
  repoUrl: string
  timestamp: string
  headSha: string
  totalCommits: number
  metrics: {
    totalLoc: number
    totalFunctions: number
    averageComplexity: number
    fileCount: number
  }
  topComplexFiles: TopComplexFile[]
}

interface DashboardClientProps {
  userId: string
  login?: string | null
}

// Newest-first with a deterministic tie-break: equal timestamps order by
// analysisId and invalid dates always sort last, so the list never depends
// on backend arrival order (audit A-3 fix, spec-authorized comparator).
function newestFirst(a: { timestamp: string; analysisId: string }, b: { timestamp: string; analysisId: string }) {
  const left = Date.parse(a.timestamp)
  const right = Date.parse(b.timestamp)
  const leftValid = Number.isFinite(left)
  const rightValid = Number.isFinite(right)
  if (leftValid !== rightValid) return leftValid ? -1 : 1
  if (leftValid && rightValid && left !== right) return right - left
  return a.analysisId < b.analysisId ? -1 : a.analysisId > b.analysisId ? 1 : 0
}

type DateRange = "7days" | "30days" | "all"
type ComplexityLevel = "all" | "low" | "medium" | "high"
type SortOption = "newest" | "oldest" | "mostComplex" | "leastComplex" | "mostLOC"

// Complexity color badge helper — brand-tinted semantic badges
function getComplexityColor(complexity: number): string {
  if (complexity <= 25) return "badge-low"
  if (complexity <= 40) return "badge-med"
  return "badge-high"
}

// Get complexity level label
function getComplexityLevel(complexity: number): ComplexityLevel {
  if (complexity <= 25) return "low"
  if (complexity <= 40) return "medium"
  return "high"
}

// Download JSON function
function downloadJSON(analysis: Analysis) {
  const data = {
    repoUrl: analysis.repoUrl,
    analyzedAt: analysis.timestamp,
    headSha: analysis.headSha,
    totalCommits: analysis.totalCommits,
    metrics: analysis.metrics,
    topComplexFiles: analysis.topComplexFiles,
    fileGraph: analysis.fileGraph,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${analysis.repoUrl.split("/").pop()}-analysis.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Action menu component for mobile
function ActionMenu({
  analysis,
  onShare,
}: {
  analysis: Analysis
  onShare: (analysis: Analysis) => void
}) {
  return (
    <details className="history-actions relative sm:hidden">
      {/* Native disclosure: focusable/operable trigger without custom menu ARIA;
          content is hidden natively while closed. No animated height (05 rule). */}
      <summary
        className="p-2 hover:bg-ui-sand rounded-lg transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden"
        aria-label="More actions"
      >
        <MoreVertical size={20} className="text-ui-secondary" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 mt-2 w-48 rounded-panel border border-ui-border bg-ui-surface z-50">
        <button
          type="button"
          onClick={(event) => {
            downloadJSON(analysis)
            event.currentTarget.closest("details")?.removeAttribute("open")
          }}
          className="w-full text-left px-4 py-3 hover:bg-ui-canvas flex items-center gap-2 text-ui-text-deep hover:text-ui-clay-deep transition-colors border-b border-ui-border"
        >
          <Download size={16} />
          Download JSON
        </button>
        <button
          type="button"
          onClick={(event) => {
            onShare(analysis)
            event.currentTarget.closest("details")?.removeAttribute("open")
          }}
          className="w-full text-left px-4 py-3 hover:bg-ui-canvas flex items-center gap-2 text-ui-text-deep hover:text-ui-clay-deep transition-colors border-b border-ui-border"
        >
          <Share2 size={16} />
          Share
        </button>
        <a
          href={analysis.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            event.currentTarget.closest("details")?.removeAttribute("open")
          }}
          className="w-full text-left px-4 py-3 hover:bg-ui-canvas flex items-center gap-2 text-ui-text-deep hover:text-ui-clay-deep transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          View on GitHub
        </a>
      </div>
    </details>
  )
}

// Expandable file details component
function FileDetailsExpandable({ files }: { files: TopComplexFile[] }) {
  const [expanded, setExpanded] = useState(false)
  const displayFiles = expanded ? files : files.slice(0, 3)

  if (files.length === 0) {
    return (
      <div className="mt-4 p-4 bg-ui-canvas rounded text-ui-secondary text-sm">
        No JavaScript/TypeScript files found in this repository.
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="space-y-3">
        {displayFiles.map((file, idx) => (
          <div
            key={idx}
            className="p-3 bg-ui-canvas rounded border border-ui-border hover:border-ui-border-strong transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-ui-text-deep break-all">
                  {file.path}
                </p>
                <div className="flex gap-3 mt-2 text-xs text-ui-secondary">
                  <span>LOC: {file.loc}</span>
                  <span>Functions: {file.functions}</span>
                </div>
              </div>
              <div className="ml-2 flex-shrink-0">
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold tabular-nums text-ui-surface ${getComplexityColor(
                    file.complexity
                  )}`}
                >
                  {file.complexity}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {files.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-2 text-sm text-ui-clay-deep hover:text-ui-rust-soft font-medium"
        >
          {expanded ? (
            <>
              <ChevronUp size={16} />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Show All {files.length} Files
            </>
          )}
        </button>
      )}
    </div>
  )
}

export default function DashboardClient({ userId, login }: DashboardClientProps) {
  const [report, setReport] = useState<Analysis | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Opening a report from history is a view swap, not a navigation — without
  // this the page keeps the /history scroll offset and lands mid-report.
  // Lenis (if smoothing) must be told directly, else its RAF re-writes the
  // old position (same pattern as SmoothScroll's pathname reset); plain
  // window.scrollTo covers the reduced-motion case where Lenis is absent.
  useEffect(() => {
    if (!report) return
    const lenis = (window as unknown as { __lenis?: { scrollTo: (target: number, options?: { immediate?: boolean }) => void } }).__lenis
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
  }, [report])

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("")
  // Entrance stagger: true only until the first search/filter interaction;
  // the initial successful load animates, later updates never replay.
  const [initialLoad, setInitialLoad] = useState(true)
  const listRef = useRef<HTMLUListElement>(null)
  const [staggerCap, setStaggerCap] = useState(-1)
  useEffect(() => {
    if (listRef.current) setStaggerCap(readMotion(listRef.current).staggerCap)
  }, [])
  const [dateRange, setDateRange] = useState<DateRange>("all")
  const [complexityFilter, setComplexityFilter] = useState<ComplexityLevel>("all")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedAnalysisForShare, setSelectedAnalysisForShare] = useState<Analysis | null>(null)

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    // Reset at start so a retry can't inherit a stale failure message or
    // loading state (H03 safe-retry precondition).
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/analyses")
      if (!res.ok) throw new Error("Failed to fetch analyses")
      const data = await res.json()
      setAnalyses(data.analyses || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  // Shared by the filter-panel control and the no-match state's action.
  const clearAllFilters = () => {
    setInitialLoad(false)
    setSearchQuery("")
    setDateRange("all")
    setComplexityFilter("all")
    setSortBy("newest")
  }

  const handleShare = (analysis: Analysis) => {
    setSelectedAnalysisForShare(analysis)
    setShareModalOpen(true)
  }

  // Filter and sort logic
  const filteredAndSortedAnalyses = (() => {
    let result = [...analyses]

    // 1. Search filter (repo name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((analysis) =>
        analysis.repoUrl.toLowerCase().includes(query)
      )
    }

    // 2. Date range filter
    const now = new Date()
    if (dateRange !== "all") {
      const cutoffDate = new Date(now)
      if (dateRange === "7days") {
        cutoffDate.setDate(cutoffDate.getDate() - 7)
      } else if (dateRange === "30days") {
        cutoffDate.setDate(cutoffDate.getDate() - 30)
      }

      result = result.filter((analysis) => {
        const analysisDate = new Date(analysis.timestamp)
        return analysisDate >= cutoffDate
      })
    }

    // 3. Complexity filter
    if (complexityFilter !== "all") {
      result = result.filter((analysis) => {
        const level = getComplexityLevel(analysis.metrics.averageComplexity)
        return level === complexityFilter
      })
    }

    // 4. Sort
    if (sortBy === "newest") {
      result.sort(newestFirst)
    } else if (sortBy === "oldest") {
      result.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    } else if (sortBy === "mostComplex") {
      result.sort(
        (a, b) =>
          b.metrics.averageComplexity - a.metrics.averageComplexity
      )
    } else if (sortBy === "leastComplex") {
      result.sort(
        (a, b) =>
          a.metrics.averageComplexity - b.metrics.averageComplexity
      )
    } else if (sortBy === "mostLOC") {
      result.sort((a, b) => b.metrics.totalLoc - a.metrics.totalLoc)
    }

    return result
  })()

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    dateRange !== "all" ||
    complexityFilter !== "all" ||
    sortBy !== "newest"

  if (report) return <AppShell active="history" login={login}><button type="button" className="text-action" onClick={()=>setReport(null)}>← Back to history</button><AnalysisResults data={report} userId={userId} analysisId={report.analysisId} onBack={()=>{window.location.href="/analyze"}}/></AppShell>
  return (
    <AppShell active="history" login={login}><div className="history-workspace">
      <div className="history-content">
        <header className="workspace-heading heading-with-action"><div><p className="eyebrow">YOUR REPOSITORY NOTEBOOK</p><h1>Less guesswork.<br/><span>More perspective.</span></h1><p>Revisit your analyses and decide what deserves attention next.</p></div><a href="/analyze" className="primary-action ui-press">Analyze a repository<span className="action-orb" aria-hidden="true"><ArrowUpRight size={13} /></span></a></header>
        {!loading&&!error&&<div className="history-overview"><div><span>Saved analyses</span><strong>{analyses.length}</strong></div><div><span>Repositories explored</span><strong>{new Set(analyses.map(a=>a.repoUrl)).size}</strong></div><div><span>History retention</span><strong>30 <small>days</small></strong></div></div>}

        {loading && (
          <>
            {/* Single loading announcement; the skeleton itself is decorative. */}
            <p role="status" className="sr-only">Loading your history.</p>
            <div className="space-y-4" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-ui-surface rounded-panel border border-ui-border p-6"
                >
                  <div className="h-6 ui-skeleton rounded w-1/3 mb-4"></div>
                  <div className="h-4 ui-skeleton rounded w-1/4 mb-6"></div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j}>
                        <div className="h-4 ui-skeleton rounded w-2/3 mb-2"></div>
                        <div className="h-6 ui-skeleton rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                  {/* Explore-button and file-detail blocks: skeleton mirrors the
                      final row geometry. */}
                  <div className="h-9 ui-skeleton rounded w-48 mb-6"></div>
                  <div className="space-y-3">
                    <div className="h-12 ui-skeleton rounded"></div>
                    <div className="h-12 ui-skeleton rounded"></div>
                    <div className="h-12 ui-skeleton rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {error && (
          <div role="alert" className="rounded-panel border border-ui-border bg-[var(--ui-danger-surface)] p-4 text-ui-danger">
            <p className="font-semibold">Error loading analyses</p>
            <p className="text-sm mt-1">{error}</p>
            <button type="button" className="secondary-action ui-press mt-4" disabled={loading} onClick={() => { void fetchAnalyses() }}>
              {loading ? "Loading analyses" : "Retry loading history"}
            </button>
          </div>
        )}

        {!loading && !error && analyses.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Search Bar */}
            <div>
              <label htmlFor="history-search" className="block text-sm font-semibold text-ui-text mb-2">
                Search repository
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-ui-taupe-soft" size={20} />
                <input
                  id="history-search"
                  type="text"
                  placeholder="Search by repository name..."
                  value={searchQuery}
                  onChange={(e) => { setInitialLoad(false); setSearchQuery(e.target.value) }}
                  className="w-full rounded-full border border-ui-border-strong bg-ui-surface-raised pl-10 pr-4 py-2.5 text-sm text-ui-text placeholder:text-ui-taupe-faint"
                />
              </div>
            </div>

            {/* Filter Panel Toggle */}
            <button
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              aria-expanded={filterPanelOpen}
              aria-controls="history-filter-panel"
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-[background-color,border-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
                hasActiveFilters
                  ? "bg-ui-sand-warm border-ui-sand-strong text-ui-rust-soft"
                  : "bg-ui-surface border-ui-border-strong text-ui-text-deep hover:bg-ui-canvas"
              }`}
            >
              <Filter size={18} strokeWidth={1.5} />
              Filters {hasActiveFilters && <span className="text-xs font-bold">(active)</span>}
            </button>

            {/* Collapsible Filter Panel — always mounted; the ui-collapse wrapper
                animates its grid row so opening pushes the content below down
                smoothly and closing collapses it the same way. */}
            <div className="ui-collapse !mt-0" data-open={filterPanelOpen ? "true" : "false"}>
              <div className="overflow-hidden">
                <div id="history-filter-panel" data-lenis-prevent="true" className="mt-4 bg-ui-surface border border-ui-border-strong rounded-panel p-6 space-y-6">
                {/* Date Range */}
                <fieldset>
                  <legend className="block text-sm font-semibold text-ui-text mb-3">
                    Date Range
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "7days", "30days"] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => { setInitialLoad(false); setDateRange(range) }}
                        aria-pressed={dateRange === range}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
                          dateRange === range
                            ? "bg-ui-accent text-ui-surface"
                            : "bg-ui-sand text-ui-text-deep hover:bg-ui-border"
                        }`}
                      >
                        {range === "all"
                          ? "All Time"
                          : range === "7days"
                            ? "Last 7 Days"
                            : "Last 30 Days"}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {/* Complexity Level */}
                <fieldset>
                  <legend className="block text-sm font-semibold text-ui-text mb-3">
                    Complexity Level
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "low", "medium", "high"] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => { setInitialLoad(false); setComplexityFilter(level) }}
                        aria-pressed={complexityFilter === level}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
                          complexityFilter === level
                            ? "bg-ui-accent text-ui-surface"
                            : "bg-ui-sand text-ui-text-deep hover:bg-ui-border"
                        }`}
                      >
                        {level === "all"
                          ? "All"
                          : level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {/* Sorting */}
                <div>
                  <label htmlFor="history-sort" className="block text-sm font-semibold text-ui-text mb-3">
                    Sort By
                  </label>
                  <select
                    id="history-sort"
                    value={sortBy}
                    onChange={(e) => { setInitialLoad(false); setSortBy(e.target.value as SortOption) }}
                    className="w-full rounded-xl border border-ui-border-strong bg-ui-surface-raised px-3 py-2.5 text-sm text-ui-text"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="mostComplex">Most Complex</option>
                    <option value="leastComplex">Least Complex</option>
                    <option value="mostLOC">Most LOC</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-ui-danger hover:bg-[var(--ui-danger-surface)] rounded-control transition-colors"
                  >
                    <X size={16} />
                    Clear All Filters
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>
        )}

        {analyses.length === 0 && !loading && !error && (
          <div className="ui-state-enter rounded-panel border border-ui-border bg-ui-surface p-8 sm:p-12 text-left">
            <p className="text-ui-text text-lg font-semibold mb-2">No analyses yet.</p>
            <p className="text-ui-secondary mb-4">Your analyses expire after 30 days. Analyze a repository to start your history.</p>
            <a
              href="/analyze"
              className="primary-action"
            >
              Analyze a Repository
              <span className="action-orb">
                <ArrowRight className="h-4 w-4" />
              </span>
            </a>
          </div>
        )}

        {!loading && !error && analyses.length > 0 && (
          <div>
            {filteredAndSortedAnalyses.length === 0 ? (
              <div className="bg-ui-surface rounded-panel border border-ui-border p-8 sm:p-12 text-left">
                <p className="text-ui-text text-lg font-semibold mb-2">No matching analyses</p>
                <p className="text-ui-secondary mb-4">No analyses match these filters.</p>
                <button type="button" className="secondary-action ui-press" onClick={clearAllFilters}>
                  Clear all filters
                </button>
              </div>
            ) : (
              <ul ref={listRef} className="grid gap-6 ui-list-enter">
                {filteredAndSortedAnalyses.map((analysis, index) => (
                  <li
                    key={analysis.analysisId}
                    data-enter={initialLoad && index <= staggerCap ? "true" : "false"}
                    style={{ "--ui-row-index": index } as CSSProperties}
                    className="rounded-panel border border-ui-border bg-ui-surface overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold text-ui-text truncate" aria-label={analysis.repoUrl}>
                            {analysis.repoUrl.split("/").pop()}
                          </h3>
                          <p className="text-sm text-ui-secondary mt-1">
                            {new Date(analysis.timestamp).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                          <p className="text-xs text-ui-taupe-soft mt-1 font-mono" title={analysis.headSha}>
                            {analysis.headSha.slice(0, 7)} •{" "}
                            {analysis.totalCommits}{" "}
                            {analysis.totalCommits === 1 ? "commit" : "commits"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Desktop buttons - hidden on mobile */}
                          <button
                            onClick={() => downloadJSON(analysis)}
                            className="hidden sm:flex text-sm text-ui-clay-deep hover:text-ui-rust-soft hover:underline items-center gap-1 flex-shrink-0"
                          >
                            Download JSON <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleShare(analysis)}
                            className="hidden sm:flex text-sm text-ui-clay-deep hover:text-ui-rust-soft hover:underline items-center gap-1 flex-shrink-0"
                          >
                            Share <Share2 size={16} />
                          </button>
                          <a
                            href={analysis.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex text-sm text-ui-clay-deep hover:text-ui-rust-soft hover:underline items-center gap-1 flex-shrink-0"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            View on GitHub
                          </a>
                          {/* Mobile menu - shown only on mobile */}
                          <ActionMenu analysis={analysis} onShare={handleShare} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-xs font-semibold text-ui-secondary uppercase tracking-wide">
                            LOC
                          </p>
                          <p className="font-display text-2xl font-semibold text-ui-text mt-1 tabular-nums">
                            {analysis.metrics.totalLoc.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-ui-secondary uppercase tracking-wide">
                            Functions
                          </p>
                          <p className="font-display text-2xl font-semibold text-ui-text mt-1 tabular-nums">
                            {analysis.metrics.totalFunctions.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-ui-secondary uppercase tracking-wide">
                            Avg Complexity
                          </p>
                          <p className="font-display text-2xl font-semibold text-ui-text mt-1 tabular-nums">
                            {analysis.metrics.averageComplexity.toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-ui-secondary uppercase tracking-wide">
                            Files Analyzed
                          </p>
                          <p className="font-display text-2xl font-semibold text-ui-text mt-1 tabular-nums">
                            {analysis.metrics.fileCount}
                          </p>
                        </div>
                      </div>

                      <button type="button" className="secondary-action report-explore ui-press" onClick={()=>setReport(analysis)}>Explore report &amp; graph <ArrowUpRight size={13} className="inline-block align-[-2px]" aria-hidden="true" /></button>
                      <div className="border-t pt-6">
                        <p className="text-sm font-semibold text-ui-text-deep mb-3">
                          Most Complex Files
                        </p>
                        <FileDetailsExpandable
                          files={analysis.topComplexFiles}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {selectedAnalysisForShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          userId={selectedAnalysisForShare.userID}
          analysisId={selectedAnalysisForShare.analysisId}
        />
      )}
    </div></AppShell>
  )
}