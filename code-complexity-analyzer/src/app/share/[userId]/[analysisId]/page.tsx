import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb"
import { notFound } from "next/navigation"
import AnalysisResults from "@/components/AnalysisResult"

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" })
const docClient = DynamoDBDocumentClient.from(dynamoClient)

interface SharePageProps {
  params: {
    userId: string
    analysisId: string
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { userId, analysisId } = params

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
      notFound()
    }

    const analysis = result.Item as any

    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Shared link indicator */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Shared Analysis</span> — This is a public read-only view
            </p>
          </div>

          {/* Read-only analysis result */}
          <AnalysisResults
            data={{
              timestamp: analysis.timestamp,
              repoUrl: analysis.repoUrl,
              headSha: analysis.headSha,
              totalCommits: analysis.totalCommits,
              metrics: analysis.metrics,
              topComplexFiles: analysis.topComplexFiles,
            }}
            onBack={() => {
              // No-op for shared page — can't go back to analyze
            }}
            isShared={true}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error fetching shared analysis:", error)
    notFound()
  }
}