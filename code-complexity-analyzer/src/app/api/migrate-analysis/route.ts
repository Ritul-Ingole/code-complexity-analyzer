import { getSession } from "@/lib/session"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { NextRequest, NextResponse } from "next/server"

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" })
const docClient = DynamoDBDocumentClient.from(dynamoClient)

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const analysisData = await req.json()

    if (!analysisData || !analysisData.timestamp || !analysisData.repoUrl) {
      return NextResponse.json(
        { error: "Invalid analysis data" },
        { status: 400 }
      )
    }

    // Generate analysisId
    const analysisId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Save to DynamoDB under authenticated user
    await docClient.send(
      new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME || "complexity-analyses",
        Item: {
          userID: String(session.userId),
          analysisId,
          repoUrl: analysisData.repoUrl,
          timestamp: analysisData.timestamp,
          headSha: analysisData.headSha,
          totalCommits: analysisData.totalCommits,
          metrics: analysisData.metrics,
          topComplexFiles: analysisData.topComplexFiles,
          ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
      })
    )

    console.log(`Analysis migrated with ID: ${analysisId} for user: ${session.userId}`)

    return NextResponse.json({
      success: true,
      analysisId,
      message: "Analysis saved to your history",
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      { error: "Failed to save analysis", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}