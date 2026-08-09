"use client"

import { useState } from "react"
import AnalysisResults from "./AnalysisResult"
import AnalyzingScreen from "./AnalyzingScreen"

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

// How long to show the "Analysis ready" confirmation before revealing results.
// Long enough to not feel abrupt, short enough to not feel like a delay.
const READY_GRACE_PERIOD_MS = 1800

export default function AnalyzeForm() {
  const [repoUrl, setRepoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<AnalysisData | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResults(null)
    setUserId(null)
    setAnalysisId(null)

    // Validate before entering the loading state, so a bad URL never
    // leaves the button stuck on "Analyzing..."
    const githubUrlPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/
    if (!githubUrlPattern.test(repoUrl.trim())) {
      setError("Please enter a valid GitHub repository URL, e.g. https://github.com/owner/repo")
      return
    }

    setLoading(true)
    setReady(false)

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl })
      })

      const response: AnalysisResponse = await res.json()

      if (!res.ok) {
        // Display Lambda error message if available
        throw new Error((response as any).message || (response as any).error || "Analysis failed")
      }

      // Show the "ready" confirmation briefly before revealing results,
      // so we don't cut someone off mid-fact.
      setReady(true)
      setTimeout(() => {
        setResults(response.data)
        setUserId(response.userID)
        setAnalysisId(response.analysisId)
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
      />
    )
  }

  if (loading) {
    return <AnalyzingScreen ready={ready} />
  }

  return (
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
      >
        Analyze
      </button>
    </form>
  )
}