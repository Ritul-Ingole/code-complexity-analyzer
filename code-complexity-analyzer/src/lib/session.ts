import { cookies } from "next/headers"
import { createHmac, timingSafeEqual } from "crypto"

export type Session = {
  userId: number
  email: string | null
  login: string
  avatar: string
}

// Session cookie format: "<base64url(json)>.<base64url(hmac-sha256)>".
// Unsigned/invalid values are rejected; clients cannot forge userId.
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (use at least 16 characters)")
  }
  return secret
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url")
}

function packSession(data: unknown): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url")
  return `${payload}.${sign(payload)}`
}

function unpackSession(value: string): Session | null {
  const dot = value.indexOf(".")
  if (dot === -1) return null
  const payload = value.slice(0, dot)
  const signature = value.slice(dot + 1)
  const expected = Buffer.from(sign(payload), "base64url")
  let provided: Buffer
  try {
    provided = Buffer.from(signature, "base64url")
  } catch {
    return null
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString())
    return isSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false
  const s = value as Record<string, unknown>
  // email can be null: GitHub returns null for users who hide their email.
  return (
    typeof s.userId === "number" &&
    Number.isFinite(s.userId) &&
    (typeof s.email === "string" || s.email === null) &&
    typeof s.login === "string" &&
    typeof s.avatar === "string"
  )
}

export { packSession }

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value

  if (!session) return null

  return unpackSession(session)
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}
