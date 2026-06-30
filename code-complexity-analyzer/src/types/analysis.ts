export type AnalysisResult = {
  userId: string
  analysisId: string
  repoUrl: string
  status: "pending" | "in-progress" | "completed" | "failed"
  metrics?: {
    cyclomatic: number
    loc: number
    functionCount: number
  }
  error?: string
  createdAt: number
  ttl: number
}