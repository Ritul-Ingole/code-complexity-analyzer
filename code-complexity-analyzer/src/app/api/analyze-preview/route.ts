import { invokeLambda } from "@/lib/lambda"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { repoUrl } = await req.json()

    if (!repoUrl) {
      return NextResponse.json(
        { error: "repoUrl is required" },
        { status: 400 }
      )
    }

    console.log("Preview analysis for:", repoUrl)

    // Use a dummy userId for preview analysis — Lambda doesn't save it to DynamoDB
    const { statusCode, body } = await invokeLambda({
      repoUrl,
      userId: "preview"
    })

    return NextResponse.json(body, { status: statusCode })
  } catch (error) {
    console.error("Preview analysis error:", error)
    return NextResponse.json(
      { error: "Failed to invoke analysis", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}