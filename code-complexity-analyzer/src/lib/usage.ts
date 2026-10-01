import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DAILY_ANALYSIS_LIMIT } from "./config"

// Same client setup as the rest of the API routes (table name comes from env,
// inlined like the other routes do — no second client, no refactor).
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" })
const dynamo = DynamoDBDocumentClient.from(client)
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "complexity-analyses"

const TTL_SECONDS = 2 * 24 * 60 * 60

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function nextUtcMidnightISO(d = new Date()): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
  ).toISOString()
}

function usageKey(userID: string) {
  // Usage rows live in their OWN partition (`USAGE#<id>`, not the user's real
  // `userID`), so the dashboard query (userID = raw id) can never return them.
  return { userID: `USAGE#${String(userID)}`, analysisId: utcDay() }
}

export type QuotaResult =
  | { allowed: true; used: number; limit: number }
  | { allowed: false; limit: number; resetsAt: string }

/** Atomically consume one unit of today's quota. Throws on non-quota errors. */
export async function consumeDailyQuota(userID: string): Promise<QuotaResult> {
  try {
    const res = await dynamo.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: usageKey(userID),
        UpdateExpression: "ADD #c :one SET #ttl = :ttl",
        // Atomic gate: no read-then-write, so concurrent requests can't exceed the limit.
        ConditionExpression: "attribute_not_exists(#c) OR #c < :max",
        ExpressionAttributeNames: { "#c": "count", "#ttl": "ttl" },
        ExpressionAttributeValues: {
          ":one": 1,
          ":max": DAILY_ANALYSIS_LIMIT,
          ":ttl": Math.floor(Date.now() / 1000) + TTL_SECONDS,
        },
        ReturnValues: "UPDATED_NEW",
      })
    )
    return {
      allowed: true,
      used: Number(res.Attributes?.count ?? 1),
      limit: DAILY_ANALYSIS_LIMIT,
    }
  } catch (err) {
    if ((err as { name?: string }).name === "ConditionalCheckFailedException") {
      return {
        allowed: false,
        limit: DAILY_ANALYSIS_LIMIT,
        resetsAt: nextUtcMidnightISO(),
      }
    }
    throw err // anything else is a real failure: caller fails closed
  }
}

/** Best-effort give-back when our own failure ate the user's attempt. Never throws. */
export async function refundDailyQuota(userID: string): Promise<void> {
  try {
    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: usageKey(userID),
        UpdateExpression: "ADD #c :neg",
        ConditionExpression: "#c > :zero",
        ExpressionAttributeNames: { "#c": "count" },
        ExpressionAttributeValues: { ":neg": -1, ":zero": 0 },
      })
    )
  } catch (err) {
    console.error("refundDailyQuota failed", err)
  }
}

/** Read today's usage for the button counter (display only — the server still enforces the limit). */
export async function getDailyUsage(
  userID: string
): Promise<{ used: number; limit: number; remaining: number; resetsAt: string }> {
  const res = await dynamo.send(new GetCommand({ TableName: TABLE_NAME, Key: usageKey(userID) }))
  const used = Number(res.Item?.count ?? 0)
  return {
    used,
    limit: DAILY_ANALYSIS_LIMIT,
    remaining: Math.max(0, DAILY_ANALYSIS_LIMIT - used),
    resetsAt: nextUtcMidnightISO(),
  }
}
