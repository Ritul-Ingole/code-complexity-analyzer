import { APIGatewayProxyHandlerV2 } from "aws-lambda"
import git from "isomorphic-git"
import http from "isomorphic-git/http/node"
import * as fs from "fs"
import { rmSync, existsSync, mkdirSync } from "fs"
import { resolve } from "path"

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("Lambda invoked with:", event.body)

  const body = JSON.parse(event.body || "{}")
  const { repoUrl, userId } = body

  let repoPath: string | null = null

  try {
    // Extract owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/)
    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid GitHub URL" }),
      }
    }

    const [, owner, repo] = match

    // Pre-check repo size via GitHub API
    console.log(`Checking repo size for ${owner}/${repo}`)
    const repoSize = await getRepoSize(owner, repo)
    console.log(`Repo size: ${repoSize} KB (${(repoSize / 1024).toFixed(2)} MB)`)

    if (repoSize > 500000) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Repository too large",
          message: `This repository is ${(repoSize / 1024).toFixed(0)}MB. Shallow clone may exceed storage limits.`,
          repoSize,
        }),
      }
    }

    // Clone with isomorphic-git (no git binary needed)
    repoPath = resolve("/tmp", `repo-${userId}-${Date.now()}`)
    mkdirSync(repoPath, { recursive: true })

    console.log(`Cloning ${repoUrl} to ${repoPath}`)
    await git.clone({
      fs,
      http,
      dir: repoPath,
      url: repoUrl,
      depth: 500,
      singleBranch: true,
      noTags: true,
    })
    console.log("Clone complete")

    // Get commit history
    const commits = await git.log({
      fs,
      dir: repoPath,
      depth: 500,
    })
    console.log(`Found ${commits.length} commits`)

    // TODO: Week 2 continues here
    // - Parse each commit with @babel/parser
    // - Compute cyclomatic complexity, LOC, function count
    // - Batch write to DynamoDB
    // - Stream SSE progress

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "clone_complete",
        repoUrl,
        userId,
        commitCount: commits.length,
        message: `Successfully cloned ${commits.length} commits`,
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
    // Always clean up /tmp
    if (repoPath && existsSync(repoPath)) {
      try {
        console.log(`Cleaning up ${repoPath}`)
        rmSync(repoPath, { recursive: true, force: true })
        console.log("Cleanup complete")
      } catch (err) {
        console.error("Cleanup failed:", err)
      }
    }
  }
}

async function getRepoSize(owner: string, repo: string): Promise<number> {
  const url = `https://api.github.com/repos/${owner}/${repo}`

  const response = await fetch(url, {
    headers: {
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      }),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch repo metadata: ${response.statusText}`)
  }

  const data = await response.json() as { size: number }
  return data.size
}