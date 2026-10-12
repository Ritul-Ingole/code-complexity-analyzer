import { invokeLambda } from "@/lib/lambda"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// Anchored: only http(s)://github.com/<owner>/<repo>[.git] passes.
const GITHUB_REPO_URL = /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?(\.git)?$/

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
    console.error("Preview analysis error:", error)
    return NextResponse.json(
      { error: "Failed to invoke analysis", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}