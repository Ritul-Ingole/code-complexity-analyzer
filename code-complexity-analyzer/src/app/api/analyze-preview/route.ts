import { invokeLambda } from "@/lib/lambda"
import { consumePreviewQuota, refundPreviewQuota } from "@/lib/usage"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createHash } from "crypto"

// Anchored: only http(s)://github.com/<owner>/<repo>[.git] passes.
const GITHUB_REPO_URL = /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?(\.git)?$/

// The per-browser "one free analysis" cookie is client-controlled (clear it and
// you get another), so the real ceiling is per client IP.
function clientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for") ?? ""
  const ip = forwarded.split(",")[0].trim() || req.headers.get("x-real-ip")?.trim() || "unknown"
  return createHash("sha256").update(ip).digest("base64url").slice(0, 32)
}

export async function POST(req: NextRequest) {
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

  // Quota gate after validation, so malformed requests never burn an attempt.
  const key = clientKey(req)
  const quota = await consumePreviewQuota(key).catch((error) => {
    console.error("Preview quota check failed:", error)
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
        error: `Daily preview limit reached (${quota.limit} per day). Resets at ${quota.resetsAt}.`,
        code: "DAILY_LIMIT_REACHED",
        limit: quota.limit,
        resetsAt: quota.resetsAt,
      },
      { status: 429 }
    )
  }

  try {
    // Get or generate previewSessionId from cookie
    const cookieStore = await cookies()
    let previewSessionId = cookieStore.get("previewSessionId")?.value

    if (!previewSessionId) {
      previewSessionId = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    const { statusCode, body } = await invokeLambda({
      repoUrl,
      userId: "preview",
      previewSessionId,
      isPreview: true,
    })

    // A 5xx is our failure, so the attempt goes back. The Lambda's own 429
    // ("preview already used") is a legitimate rejection and keeps the unit.
    if (statusCode >= 500) await refundPreviewQuota(key)

    const response = NextResponse.json(body, { status: statusCode })

    // ALWAYS set the cookie to keep it fresh and persistent
    response.cookies.set("previewSessionId", previewSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/", // Explicitly set path to ensure it applies everywhere
    })

    return response
  } catch (error) {
    // Our failure ate one of the client's attempts — give it back, best effort.
    await refundPreviewQuota(key)
    console.error("Preview analysis error:", error)
    return NextResponse.json(
      { error: "Failed to invoke analysis", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
