import { getSession } from "@/lib/session"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb"
import { NextRequest, NextResponse } from "next/server"

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" })
const docClient = DynamoDBDocumentClient.from(dynamoClient)

export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const repoUrl = searchParams.get("url")

  if (!repoUrl) {
    return NextResponse.json({ error: "Missing repo URL" }, { status: 400 })
  }

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME || "complexity-analyses",
        KeyConditionExpression: "userID = :userId",
        ExpressionAttributeValues: {
          ":userId": String(session.userId),
        },
        ScanIndexForward: false, // newest first
      })
    )

    const allAnalyses = result.Items || []

    // Filter to only this repo's analyses
    const repoAnalyses = allAnalyses.filter(
      (analysis: any) => analysis.repoUrl === repoUrl
    )

    return NextResponse.json({
      analyses: repoAnalyses,
    })
  } catch (error) {
    console.error("Failed to fetch analyses for repo:", error)
    return NextResponse.json(
      { error: "Failed to fetch analyses" },
      { status: 500 }
    )
  }
}