import { APIGatewayProxyHandlerV2 } from "aws-lambda"
import { execSync } from "child_process"
import { rmSync, existsSync } from "fs"
import { resolve } from "path"

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("Lambda invoked with:", event.body)

  const body = JSON.parse(event.body || "{}")
  const { repoUrl, userId } = body

  let repoPath: string | null = null

  try {
    // Extract owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)(\.git)?$/)
    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid GitHub URL",
        }),
      }
    }

    const [, owner, repo] = match

    // STEP 2: Pre-check repo size
    console.log(`Checking repo size for ${owner}/${repo}`)
    const repoSize = await getRepoSize(owner, repo)
    console.log(`Repo size: ${repoSize} KB (${(repoSize / 1024).toFixed(2)} MB)`)

    if (repoSize > 500000) { // 500MB threshold
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Repository too large",
          message: `This repository is ${(repoSize / 1024).toFixed(0)}MB. Shallow clone may exceed storage limits.`,
          repoSize,
        }),
      }
    }

    // Clone repo into /tmp with shallow depth
    repoPath = resolve("/tmp", `repo-${userId}-${Date.now()}`)
    console.log(`Cloning ${repoUrl} to ${repoPath}`)
    
    execSync(`git clone --depth 500 ${repoUrl} ${repoPath}`, {
      stdio: "inherit",
    })

    console.log("Clone complete")

    // TODO: Week 2 continues here
    // - Extract commits via git log
    // - Parse each commit with @babel/parser
    // - Compute complexity metrics
    // - Batch write to DynamoDB
    // - Stream SSE progress

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "analysis_complete",
        repoUrl,
        userId,
        message: "Analysis stub — actual logic coming Week 2",
      }),
    }
  } catch (error) {
    console.error("Lambda error:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    }
  } finally {
    // STEP 3: Clean up /tmp after analysis
    if (repoPath && existsSync(repoPath)) {
      try {
        console.log(`Cleaning up ${repoPath}`)
        rmSync(repoPath, { recursive: true, force: true })
        console.log("Cleanup complete")
      } catch (err) {
        console.error("Cleanup failed:", err)
        // Don't fail the invocation over cleanup
      }
    }
  }
}

async function getRepoSize(owner: string, repo: string): Promise<number> {
  const url = `https://api.github.com/repos/${owner}/${repo}`
  
  const response = await fetch(url, {
    headers: {
      // Use your GitHub personal access token if available
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      }),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch repo metadata: ${response.statusText}`)
  }

  const data = await response.json() as { size: number }
  return data.size // in KB
}