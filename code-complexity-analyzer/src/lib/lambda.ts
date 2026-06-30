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
  const responsePayload = JSON.parse(
    Buffer.from(result.Payload!).toString()
  )

  // Parse the body string from Lambda response
  return JSON.parse(responsePayload.body)
}