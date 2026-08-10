"use client"

import { useState, useEffect } from "react"
import AnalysisResults from "./AnalysisResult"
import AnalyzingScreen from "./AnalyzingScreen"
import Link from "next/link"

interface AnalysisData {
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

const READY_GRACE_PERIOD_MS = 1800

interface AnalyzeFormProps {
  isAuthenticated: boolean
}

export default function AnalyzeForm({ isAuthenticated }: AnalyzeFormProps) {
  const [repoUrl, setRepoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<AnalysisData | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [hasUsedFreeAnalysis, setHasUsedFreeAnalysis] = useState(false)

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
      // Use different endpoints based on auth status
      const endpoint = isAuthenticated ? "/api/analyze" : "/api/analyze-preview"

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl })
      })

      const response: AnalysisResponse = await res.json()

      if (!res.ok) {
        throw new Error((response as any).message || (response as any).error || "Analysis failed")
      }

      setReady(true)
      setTimeout(() => {
        // For unauthenticated users, store in sessionStorage and mark as used
        if (!isAuthenticated) {
          sessionStorage.setItem("pendingAnalysis", JSON.stringify(response.data))
          sessionStorage.setItem("hasUsedFreeAnalysis", "true")
          setResults(response.data)
          setHasUsedFreeAnalysis(true)
        } else {
          // For authenticated users, use the returned userID and analysisId
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

  return (
    <div className="space-y-4">
      {/* Banner for unauthenticated users */}
      {!isAuthenticated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Free analysis:</span> Analyze one repository without signing in.{" "}
            <Link href="/api/auth/login" className="underline hover:text-blue-700 font-medium">
              Sign in
            </Link>
            {" "}to save analyses, track trends, and compare results.
          </p>
        </div>
      )}

      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Repository URL
          </label>
          <input
            type="url"
            placeholder="https://github.com/user/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            required
            disabled={!isAuthenticated && hasUsedFreeAnalysis}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isAuthenticated && hasUsedFreeAnalysis}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {!isAuthenticated && hasUsedFreeAnalysis ? "Free analysis used" : "Analyze"}
        </button>
      </form>
    </div>
  )
}