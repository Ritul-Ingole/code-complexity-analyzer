import { getSession } from "@/lib/session"
import { invokeLambda } from "@/lib/lambda"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { repoUrl } = await req.json()

    if (!repoUrl) {
      return NextResponse.json(
        { error: "repoUrl is required" },
        { status: 400 }
      )
    }
    
    console.log("About to invoke Lambda with:", {
  repoUrl,
  userId: session.userId
})

    const result = await invokeLambda({
      repoUrl,
      userId: session.userId
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Lambda invoke error:", error)
    return NextResponse.json(
      { error: "Failed to invoke analysis" },
      { status: 500 }
    )
  }
}