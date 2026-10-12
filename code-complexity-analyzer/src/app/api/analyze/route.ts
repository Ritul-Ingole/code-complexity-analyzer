import { getSession } from "@/lib/session"
import { invokeLambda } from "@/lib/lambda"
import { consumeDailyQuota, refundDailyQuota, QuotaResult } from "@/lib/usage"
import { NextRequest, NextResponse } from "next/server"

// Anchored: only https(s)://github.com/<owner>/<repo>[.git] passes.
const GITHUB_REPO_URL = /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?(\.git)?$/

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let repoUrl: string
  try {
    ;({ repoUrl } = await req.json())
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!repoUrl) {
    return NextResponse.json(
      { error: "repoUrl is required" },
      { status: 400 }
    )
  }

  if (!GITHUB_REPO_URL.test(repoUrl)) {
    return NextResponse.json(
      { error: "Invalid repository URL. Use https://github.com/owner/repo" },
      { status: 400 }
    )
  }

  try {
    // Quota gate: consumed only for real analyses (past auth + validation).
    // Fail closed on storage errors — cost protection beats availability,
    // so the Lambda is never invoked when we can't verify the quota.
    let quota: QuotaResult
    try {
      quota = await consumeDailyQuota(String(session.userId))
    } catch (err) {
      console.error("Quota check failed:", err)
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
          resetsAt: quota.resetsAt
        },
        { status: 429 }
      )
    }

    try {
      const { statusCode, body } = await invokeLambda({
        repoUrl,
        userId: session.userId
      })

      if (statusCode >= 400) {
        // The analysis failed server-side; the user should not lose the attempt.
        await refundDailyQuota(String(session.userId))
      }

      return NextResponse.json(body, { status: statusCode })
    } catch (error) {
      // Our failure ate one of the user's attempts — give it back, best effort.
      await refundDailyQuota(String(session.userId))
      console.error("Lambda invoke error:", error)
      return NextResponse.json(
        { error: "Failed to invoke analysis", message: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      )
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    console.error("Lambda invoke error:", error)
    return NextResponse.json(
      { error: "Failed to invoke analysis", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}