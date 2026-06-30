import { getGitHubAuthUrl } from "@/lib/github-oauth"
import { redirect } from "next/navigation"

export async function GET() {
  const url = getGitHubAuthUrl()
  redirect(url)
}