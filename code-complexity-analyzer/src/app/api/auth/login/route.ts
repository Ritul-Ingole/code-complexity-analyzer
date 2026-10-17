import { getGitHubAuthUrl, generateOAuthState } from "@/lib/github-oauth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function GET(req: Request) {
  const state = generateOAuthState()

  // Where to land after OAuth. Only same-origin relative paths are allowed
  // (must start with "/" but not "//"), so a crafted ?next can't redirect off-site.
  const next = new URL(req.url).searchParams.get("next") ?? ""
  const safeNext = /^\/(?!\/)/.test(next) ? next : ""

  // CSRF protection: the state is stored in a short-lived cookie and must
  // round-trip through GitHub back to the callback unchanged.
  const cookieStore = await cookies()
  if (safeNext) {
    cookieStore.set("oauth_next", safeNext, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    })
  }
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  })

  redirect(getGitHubAuthUrl(state))
}
