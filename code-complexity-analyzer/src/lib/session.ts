import { cookies } from "next/headers"

export type Session = {
  userId: number
  email: string
  login: string
  avatar: string
  accessToken: string
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value

  if (!session) return null

  try {
    return JSON.parse(session)
  } catch {
    return null
  }
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}