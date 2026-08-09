import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb"
import { NextRequest, NextResponse } from "next/server"

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" })
const docClient = DynamoDBDocumentClient.from(dynamoClient)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const analysisId = searchParams.get("analysisId")

  if (!userId || !analysisId) {
    return NextResponse.json(
      { error: "Missing userId or analysisId" },
      { status: 400 }
    )
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME || "complexity-analyses",
        Key: {
          userID: userId,
          analysisId: analysisId,
        },
      })
    )

    if (!result.Item) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      analysis: result.Item,
    })
  } catch (error) {
    console.error("Error fetching shared analysis:", error)
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 }
    )
  }
}