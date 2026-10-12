import { getGitHubAuthUrl, generateOAuthState } from "@/lib/github-oauth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function GET() {
  const state = generateOAuthState()

  // CSRF protection: the state is stored in a short-lived cookie and must
  // round-trip through GitHub back to the callback unchanged.
  const cookieStore = await cookies()
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  })

  redirect(getGitHubAuthUrl(state))
}
