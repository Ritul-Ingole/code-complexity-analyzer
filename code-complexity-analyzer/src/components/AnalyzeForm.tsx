"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import type { GraphData } from "./FileGraph"
import AnalysisResults from "./AnalysisResult"
import AnalyzingScreen from "./AnalyzingScreen"
import Link from "next/link"

interface AnalysisData {
  fileGraph?: GraphData
  timestamp: string
  repoUrl: string
  headSha: string
  totalCommits: number
  metrics: {
    totalLoc: number
    totalFunctions: number
    averageComplexity: number
    fileCount: number
  }
  topComplexFiles: Array<{
    path: string
    loc: number
    functions: number
    complexity: number
  }>
}

interface AnalysisResponse {
  data: AnalysisData
  userID: string
  analysisId: string
}

const READY_GRACE_PERIOD_MS = 2600

interface AnalyzeFormProps {
  isAuthenticated: boolean
}

export default function AnalyzeForm({ isAuthenticated }: AnalyzeFormProps) {
  const searchParams = useSearchParams()
  const migrateParam = searchParams.get("migrate")

  const [repoUrl, setRepoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<AnalysisData | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [hasUsedFreeAnalysis, setHasUsedFreeAnalysis] = useState(false)
  const [migrating, setMigrating] = useState(false)

  // Auto-migrate on signin if there's a pending analysis
  useEffect(() => {
    if (isAuthenticated && migrateParam === "true") {
      const pendingAnalysis = sessionStorage.getItem("pendingAnalysis")
      if (pendingAnalysis) {
        try { void handleMigration(JSON.parse(pendingAnalysis)) } catch { sessionStorage.removeItem("pendingAnalysis"); setError("The saved preview could not be read. Please run a new analysis.") }
      }
    }
  }, [isAuthenticated, migrateParam])

  const handleMigration = async (analysisData: AnalysisData) => {
    setMigrating(true)
    try {
      const res = await fetch("/api/migrate-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysisData),
      })

      if (!res.ok) throw new Error("Failed to save analysis")

      const result = await res.json()
      setResults(analysisData)
      setUserId(result.userID || null)
      setAnalysisId(result.analysisId)

      // Clear sessionStorage
      sessionStorage.removeItem("pendingAnalysis")
      sessionStorage.removeItem("hasUsedFreeAnalysis")
      setHasUsedFreeAnalysis(false)
    } catch (err) {
      console.error("Migration error:", err)
      setError("Failed to save analysis. Please try again.")
    } finally {
      setMigrating(false)
    }
  }

  // Check if free analysis was already used
  useEffect(() => {
    if (!isAuthenticated) {
      const used = sessionStorage.getItem("hasUsedFreeAnalysis")
      setHasUsedFreeAnalysis(!!used)
    }
  }, [isAuthenticated])

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResults(null)
    setUserId(null)
    setAnalysisId(null)

    const githubUrlPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/
    if (!githubUrlPattern.test(repoUrl.trim())) {
      setError("Please enter a valid GitHub repository URL, e.g. https://github.com/owner/repo")
      return
    }

    // For unauthenticated users, check if they've already used their free analysis
    if (!isAuthenticated && hasUsedFreeAnalysis) {
      setError("You've already used your free analysis. Sign in to unlock unlimited analyses.")
      return
    }

    setLoading(true)
    setReady(false)

    try {
      const endpoint = isAuthenticated ? "/api/analyze" : "/api/analyze-preview"

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim().replace(/\/$/, "") })
      })

      const response: AnalysisResponse = await res.json()

      if (!res.ok) {
        throw new Error((response as any).message || (response as any).error || "Analysis failed")
      }

      setReady(true)
      setTimeout(() => {
        if (!isAuthenticated) {
          // Store in sessionStorage and mark as used
          try { sessionStorage.setItem("pendingAnalysis", JSON.stringify(response.data)); sessionStorage.setItem("hasUsedFreeAnalysis", "true") } catch { console.warn("Preview storage unavailable") }
          setResults(response.data)
          setHasUsedFreeAnalysis(true)
        } else {
          // For authenticated users, directly set results
          setResults(response.data)
          setUserId(response.userID)
          setAnalysisId(response.analysisId)
        }
        setLoading(false)
      }, READY_GRACE_PERIOD_MS)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      )
      setLoading(false)
    }
  }

  if (migrating) {
    return <AnalyzingScreen ready={true} />
  }

  if (results) {
    return (
      <AnalysisResults
        data={results}
        onBack={() => {
          setResults(null)
          setReady(false)
          setUserId(null)
          setAnalysisId(null)
        }}
        userId={userId || undefined}
        analysisId={analysisId || undefined}
        isPreview={!isAuthenticated}
      />
    )
  }

  if (loading) {
    return <AnalyzingScreen ready={ready} />
  }

  return <div className="analyze-intake"><section className="paper-card form-panel"><p className="eyebrow">01 — START WITH A REPOSITORY</p><h2>Every file tells a story.</h2><p className="form-intro">Paste a public GitHub URL. We’ll map the connections and bring the most complex files to the surface.</p><form onSubmit={handleAnalyze} className="repo-form"><label htmlFor="repository-url">GitHub repository URL</label><input id="repository-url" type="url" placeholder="https://github.com/owner/repository" value={repoUrl} onChange={e=>setRepoUrl(e.target.value)} required disabled={!isAuthenticated&&hasUsedFreeAnalysis} aria-describedby="repository-help" aria-invalid={!!error}/><p id="repository-help">Public repositories · .js, .jsx, .ts and .tsx · up to 500 files / 25 MB of source</p>{error&&<div className="form-error" role="alert">{error}</div>}<button className="primary-action" type="submit" disabled={!isAuthenticated&&hasUsedFreeAnalysis}>{!isAuthenticated&&hasUsedFreeAnalysis?"Free analysis used":"Analyze repository"}<span aria-hidden="true">↗</span></button>{!isAuthenticated&&<p className="preview-note">One free analysis. No sign-in required. <Link href="/api/auth/login">Sign in for unlimited analyses →</Link></p>}</form><div className="form-assurance"><span>✓ Source code isn’t stored</span><span>✓ Static analysis, never executed</span></div></section><aside className="intake-guide"><p className="eyebrow">FROM CODE TO CLARITY</p><h2>A map, not just<br/>a number.</h2><ol><li><span>01</span><div><h3>Find the hotspots</h3><p>Rank files by complexity, with lines of code and function counts alongside.</p></div></li><li><span>02</span><div><h3>Follow the connections</h3><p>Explore a file graph with directional calls and complexity-colored nodes.</p></div></li><li><span>03</span><div><h3>Watch the change</h3><p>Sign in to save reports, compare runs and share what you find.</p></div></li></ol><div className="intake-key"><span>● Low ≤25</span><span>● Medium 26–40</span><span>● High &gt;40</span></div></aside></div>
}
