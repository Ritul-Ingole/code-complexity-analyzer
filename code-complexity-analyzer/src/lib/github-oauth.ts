// Determine which OAuth app to use based on APP_URL
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// Local dev uses localhost app, production uses Vercel app
const isLocal = APP_URL.includes("localhost")

function getGitHubCredentials() {
  const clientId = isLocal 
    ? process.env.GITHUB_CLIENT_ID_LOCAL 
    : process.env.GITHUB_CLIENT_ID_PROD

  const clientSecret = isLocal 
    ? process.env.GITHUB_CLIENT_SECRET_LOCAL 
    : process.env.GITHUB_CLIENT_SECRET_PROD

  if (!clientId || !clientSecret) {
    throw new Error(
      `Missing GitHub OAuth credentials for ${isLocal ? "local" : "production"} environment`
    )
  }

  return { clientId, clientSecret }
}

const { clientId: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET } = getGitHubCredentials()

const GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize"
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
const GITHUB_USER_URL = "https://api.github.com/user"

export function getGitHubAuthUrl() {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${APP_URL}/api/auth/callback`,
    scope: "read:user user:email",
    state: Math.random().toString(36).slice(2)
  })
  return `${GITHUB_OAUTH_URL}?${params}`
}

export async function getGitHubAccessToken(code: string) {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code
    })
  })

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status}`)
  }

  const data = await res.json()
  if (data.error) throw new Error(data.error_description || data.error)
  return data.access_token
}

export async function getGitHubUser(accessToken: string) {
  const res = await fetch(GITHUB_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!res.ok) throw new Error("Failed to fetch GitHub user")
  return res.json()
}