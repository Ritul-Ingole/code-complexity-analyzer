import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

const lambda = new LambdaClient({ region: process.env.AWS_REGION || "ap-south-1" })

export async function invokeLambda(payload: Record<string, unknown>) {
  const command = new InvokeCommand({
    FunctionName: process.env.LAMBDA_FUNCTION_NAME,
    Payload: JSON.stringify({
      body: JSON.stringify(payload)
    })
  })

  const result = await lambda.send(command)
  
  if (!result.Payload) {
    throw new Error("Lambda returned empty payload")
  }

  const responsePayload = JSON.parse(Buffer.from(result.Payload).toString())
  
  if (!responsePayload.body) {
    throw new Error(`Lambda error: ${JSON.stringify(responsePayload)}`)
  }

  return JSON.parse(responsePayload.body)
}