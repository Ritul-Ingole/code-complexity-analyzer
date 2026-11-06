import { getSession } from "@/lib/session"
import { consumeDailyQuota, refundDailyQuota } from "@/lib/usage"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { NextRequest, NextResponse } from "next/server"

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" })
const docClient = DynamoDBDocumentClient.from(dynamoClient)

// Anchored: only http(s)://github.com/<owner>/<repo>[.git] passes.
const GITHUB_REPO_URL = /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?(\.git)?$/

// Everything below arrives from the browser, so each field is bounded before it
// is written: a payload that never came from the Lambda must not become history.
const MAX_TOP_FILES = 50 // the Lambda sends 10
const MAX_ITEM_BYTES = 240_000 // same cap the Lambda applies to its graph

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

function isMetrics(value: unknown) {
  if (typeof value !== "object" || value === null) return false
  const m = value as Record<string, unknown>
  return (
    isNumber(m.totalLoc) &&
    isNumber(m.totalFunctions) &&
    isNumber(m.averageComplexity) &&
    isNumber(m.fileCount)
  )
}

// Graph nodes carry exactly { path, loc, functions, complexity } — same shape.
function isComplexFile(value: unknown) {
  if (typeof value !== "object" || value === null) return false
  const file = value as Record<string, unknown>
  return (
    typeof file.path === "string" &&
    isNumber(file.loc) &&
    isNumber(file.functions) &&
    isNumber(file.complexity)
  )
}

function isFileGraph(value: unknown) {
  if (typeof value !== "object" || value === null) return false
  const graph = value as Record<string, unknown>
  if (graph.version !== 1) return false
  if (!Array.isArray(graph.nodes) || graph.nodes.length > 500) return false
  if (!Array.isArray(graph.edges)) return false
  const coverage = graph.coverage as Record<string, unknown> | null | undefined
  if (!coverage || !Array.isArray(coverage.failed)) return false
  if (!graph.nodes.every(isComplexFile)) return false
  return graph.edges.every((edge) => {
    if (typeof edge !== "object" || edge === null) return false
    const e = edge as Record<string, unknown>
    return (
      (e.kind === "call" || e.kind === "import") &&
      typeof e.source === "string" &&
      typeof e.target === "string" &&
      isNumber(e.count) &&
      Array.isArray(e.symbols) &&
      e.symbols.every((symbol) => typeof symbol === "string")
    )
  })
}

function isAnalysisPayload(value: unknown) {
  if (typeof value !== "object" || value === null) return false
  const data = value as Record<string, unknown>
  if (typeof data.repoUrl !== "string" || !GITHUB_REPO_URL.test(data.repoUrl)) return false
  if (typeof data.timestamp !== "string" || Number.isNaN(Date.parse(data.timestamp))) return false
  if (typeof data.headSha !== "string" || data.headSha.length > 64) return false
  if (!isNumber(data.totalCommits) || data.totalCommits < 0) return false
  if (!isMetrics(data.metrics)) return false
  if (!Array.isArray(data.topComplexFiles) || data.topComplexFiles.length > MAX_TOP_FILES) return false
  if (!data.topComplexFiles.every(isComplexFile)) return false
  if (data.fileGraph != null && !isFileGraph(data.fileGraph)) return false
  return Buffer.byteLength(JSON.stringify(data), "utf8") <= MAX_ITEM_BYTES
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userID = String(session.userId)

  let analysisData: unknown
  try {
    analysisData = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!isAnalysisPayload(analysisData)) {
    return NextResponse.json({ error: "Invalid analysis data" }, { status: 400 })
  }

  // Saving a preview is a full analysis: it costs the same daily unit the Lambda
  // run would have, so migrating previews cannot bypass the limit.
  const quota = await consumeDailyQuota(userID).catch((error) => {
    console.error("Quota check failed:", error)
    return null
  })
  if (!quota) {
    return NextResponse.json(
      { error: "Could not verify usage quota. Try again later." },
      { status: 500 }
    )
  }
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Daily analysis limit reached (${quota.limit} per day). Resets at ${quota.resetsAt}.`,
        code: "DAILY_LIMIT_REACHED",
        limit: quota.limit,
        resetsAt: quota.resetsAt,
      },
      { status: 429 }
    )
  }

  const data = analysisData as {
    fileGraph?: unknown
    repoUrl: string
    timestamp: string
    headSha: string
    totalCommits: number
    metrics: unknown
    topComplexFiles: unknown
  }
  const analysisId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    await docClient.send(
      new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME || "complexity-analyses",
        Item: {
          userID,
          analysisId,
          repoUrl: data.repoUrl,
          timestamp: data.timestamp,
          headSha: data.headSha,
          totalCommits: data.totalCommits,
          metrics: data.metrics,
          topComplexFiles: data.topComplexFiles,
          ...(data.fileGraph ? { fileGraph: data.fileGraph } : {}),
          ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
      })
    )
  } catch (error) {
    // The write failed, so the attempt must not cost the user a unit.
    await refundDailyQuota(userID)
    console.error("Migration error:", error)
    return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    userID,
    analysisId,
    message: "Analysis saved to your history",
  })
}
