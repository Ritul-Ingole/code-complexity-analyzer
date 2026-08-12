import { invokeLambda } from "@/lib/lambda"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const { repoUrl } = await req.json()

    if (!repoUrl) {
      return NextResponse.json(
        { error: "repoUrl is required" },
        { status: 400 }
      )
    }

    // Get or generate previewSessionId from cookie
    const cookieStore = await cookies()
    let previewSessionId = cookieStore.get("previewSessionId")?.value

    if (!previewSessionId) {
      previewSessionId = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.log(`Generated new previewSessionId: ${previewSessionId}`)
    } else {
      console.log(`Using existing previewSessionId: ${previewSessionId}`)
    }

    console.log("Preview analysis for:", repoUrl)

    const { statusCode, body } = await invokeLambda({
      repoUrl,
      userId: "preview",
      previewSessionId,
      isPreview: true,
    })

    const response = NextResponse.json(body, { status: statusCode })

    // Set the previewSessionId cookie if not already set (HTTP-only, survives tab close)
    if (!cookieStore.get("previewSessionId")) {
      response.cookies.set("previewSessionId", previewSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 24 hours
      })
    }

    return response
  } catch (error) {
    console.error("Preview analysis error:", error)
    return NextResponse.json(
      { error: "Failed to invoke analysis", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}