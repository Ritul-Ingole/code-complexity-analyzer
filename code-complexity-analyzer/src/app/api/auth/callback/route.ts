import { getGitHubAccessToken, getGitHubUser } from "@/lib/github-oauth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")

  if (!code) {
    return new Response("Missing authorization code", { status: 400 })
  }

  try {
    const accessToken = await getGitHubAccessToken(code)
    const user = await getGitHubUser(accessToken)

    // Store session in HTTP-only cookie
    const sessionData = JSON.stringify({
      userId: user.id,
      email: user.email,
      login: user.login,
      avatar: user.avatar_url,
      accessToken
    })

    const cookieStore = await cookies()
    cookieStore.set("session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    redirect("/")
  } catch (error) {
    // NEXT_REDIRECT is not a real error, it's how Next.js handles redirects
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    console.error("Auth error:", error)
    return new Response("Authentication failed", { status: 500 })
  }
}