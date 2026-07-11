"use client"

import { useState } from "react"
import AnalysisResults from "./AnalysisResult"

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

export default function AnalyzeForm() {
  const [repoUrl, setRepoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<AnalysisData | null>(null)

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResults(null)
    setLoading(true)

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl })
      })

      const data = await res.json()

      if (!res.ok) {
        // Display Lambda error message if available
        throw new Error(data.message || data.error || "Analysis failed")
      }

      setResults(data.data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      )
    } finally {
      setLoading(false)
    }
  }

  if (results) {
    return <AnalysisResults data={results} onBack={() => setResults(null)} />
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
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>
    </form>
  )
}