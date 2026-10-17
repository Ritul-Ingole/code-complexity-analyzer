import { getGitHubAccessToken, getGitHubUser } from "@/lib/github-oauth"
import { packSession } from "@/lib/session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!code) {
    return new Response("Missing authorization code", { status: 400 })
  }

  // CSRF protection: the state must match the one stored when login started.
  const cookieStore = await cookies()
  const expectedState = cookieStore.get("oauth_state")?.value
  cookieStore.delete("oauth_state")
  if (!state || !expectedState || state !== expectedState) {
    return new Response("Invalid OAuth state", { status: 400 })
  }

  try {
    const accessToken = await getGitHubAccessToken(code)
    const user = await getGitHubUser(accessToken)

    // Store session in HTTP-only cookie (no accessToken: it is never used
    // after login and should not live in a cookie)
    const cookieStore = await cookies()
    cookieStore.set("session", packSession({
      userId: user.id,
      email: user.email,
      login: user.login,
      avatar: user.avatar_url,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    // Land where the login link started (e.g. stay on / after hero sign-in);
    // default remains /analyze?migrate=true so a pending preview still migrates.
    const oauthNext = cookieStore.get("oauth_next")?.value
    cookieStore.delete("oauth_next")
    redirect(oauthNext && /^\/(?!\/)/.test(oauthNext) ? oauthNext : "/analyze?migrate=true")
  } catch (error) {
    // NEXT_REDIRECT is not a real error, it's how Next.js handles redirects
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    console.error("Auth error:", error)
    return new Response("Authentication failed", { status: 500 })
  }
}