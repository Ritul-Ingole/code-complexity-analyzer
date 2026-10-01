import { getSession } from "@/lib/session"
import { getDailyUsage } from "@/lib/usage"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const usage = await getDailyUsage(String(session.userId))
    return NextResponse.json(usage)
  } catch (error) {
    console.error("Failed to fetch usage:", error)
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    )
  }
}
