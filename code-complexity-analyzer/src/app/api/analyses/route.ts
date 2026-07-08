import { getSession } from "@/lib/session"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb"
import { NextResponse } from "next/server"

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" })
const docClient = DynamoDBDocumentClient.from(dynamoClient)

export async function GET() {
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    return NextResponse.json({
      analyses: result.Items || [],
    })
  } catch (error) {
    console.error("Failed to fetch analyses:", error)
    return NextResponse.json(
      { error: "Failed to fetch analyses" },
      { status: 500 }
    )
  }
}