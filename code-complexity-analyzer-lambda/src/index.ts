import { parse } from "@babel/parser"
import { Node } from "@babel/types"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb"

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" })
const docClient = DynamoDBDocumentClient.from(dynamoClient)

// Code-size gate: sum of JS/TS/JSX/TSX blob sizes only, NOT total repo size.
// 25MB of actual source is already an enormous codebase - this is generous, not tight.
const MAX_CODE_SIZE_BYTES = 25 * 1024 * 1024
const MAX_FILE_COUNT = 500
const FETCH_CONCURRENCY = 20

export const handler = async (event: any) => {
  console.log("Lambda invoked with:", event)
  const { repoUrl, userId, previewSessionId, isPreview } = event

  try {
    if (isPreview && previewSessionId) {
      console.log(`Checking if preview sessionId ${previewSessionId} has been used`)
      try {
        const result = await docClient.send(
          new GetCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME || "complexity-analyses",
            Key: { userID: "preview", analysisId: previewSessionId },
          })
        )
        if (result.Item) {
          console.log(`Preview sessionId ${previewSessionId} already used`)
          return {
            statusCode: 429,
            body: JSON.stringify({
              error: "Preview analysis already used",
              message: "You've already used your free analysis. Sign in to unlock unlimited analyses.",
            }),
          }
        }
      } catch (err) {
        console.error("Error checking preview sessionId:", err)
      }
    }

    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/)
    if (!match) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid GitHub URL" }) }
    }
    const [, owner, repo] = match

    console.log(`Fetching repo info for ${owner}/${repo}`)
    const { headSha } = await getRepoInfo(owner, repo)
    console.log(`HEAD: ${headSha}`)

    console.log(`Fetching file tree`)
    const tree = await getFileTree(owner, repo, headSha)

    const jsFiles = tree.filter(
      f => f.path.endsWith(".js") || f.path.endsWith(".jsx") || f.path.endsWith(".ts") || f.path.endsWith(".tsx")
    )
    console.log(`Found ${jsFiles.length} JS/TS files`)

    if (jsFiles.length > MAX_FILE_COUNT) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Too many files to analyze",
          message: `This repository has ${jsFiles.length} JavaScript/TypeScript files, which exceeds the current limit of ${MAX_FILE_COUNT}. Try a smaller repository or a specific subdirectory.`,
          fileCount: jsFiles.length,
        }),
      }
    }

    const totalCodeSize = jsFiles.reduce((sum, f) => sum + f.size, 0)
    console.log(`Total JS/TS code size: ${(totalCodeSize / 1024 / 1024).toFixed(2)} MB`)

    if (totalCodeSize > MAX_CODE_SIZE_BYTES) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Codebase too large",
          message: `This repository's JavaScript/TypeScript code totals ${(totalCodeSize / 1024 / 1024).toFixed(1)}MB, exceeding the ${MAX_CODE_SIZE_BYTES / 1024 / 1024}MB limit.`,
          codeSize: totalCodeSize,
        }),
      }
    }

    console.log(`Fetching commit count`)
    const totalCommits = await getCommitCount(owner, repo, headSha)

    console.log(`Fetching ${jsFiles.length} file contents`)
    const fetched = await fetchFilesWithConcurrency(owner, repo, headSha, jsFiles, FETCH_CONCURRENCY)

    const fileMetrics: Array<{ path: string; loc: number; functions: number; complexity: number }> = []
    let totalLoc = 0
    let totalFunctions = 0
    let totalComplexity = 0

    for (const { path, content } of fetched) {
      if (content === null) continue // fetch failed for this file, skip it
      const metrics = analyzeFile(content)
      fileMetrics.push({ path, loc: metrics.loc, functions: metrics.functionCount, complexity: metrics.complexity })
      totalLoc += metrics.loc
      totalFunctions += metrics.functionCount
      totalComplexity += metrics.complexity
    }

    fileMetrics.sort((a, b) => b.complexity - a.complexity)

    const results = {
      timestamp: new Date().toISOString(),
      repoUrl,
      headSha,
      totalCommits,
      metrics: {
        totalLoc,
        totalFunctions,
        averageComplexity: fileMetrics.length > 0 ? totalComplexity / fileMetrics.length : 0,
        fileCount: fileMetrics.length,
      },
      topComplexFiles: fileMetrics.slice(0, 10),
    }

    console.log(`Analysis complete: ${fileMetrics.length} files analyzed`)

    let analysisId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    if (isPreview && previewSessionId) {
      console.log(`Marking preview sessionId ${previewSessionId} as used`)
      try {
        await docClient.send(
          new PutCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME || "complexity-analyses",
            Item: {
              userID: "preview",
              analysisId: previewSessionId,
              ttl: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
            },
          })
        )
        console.log(`Preview sessionId ${previewSessionId} marked as used`)
      } catch (error) {
        console.error("Failed to mark preview sessionId as used:", error)
      }
    } else if (!isPreview) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME || "complexity-analyses",
            Item: {
              userID: String(userId),
              analysisId,
              repoUrl,
              timestamp: new Date().toISOString(),
              headSha,
              totalCommits,
              metrics: results.metrics,
              topComplexFiles: results.topComplexFiles,
              ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            },
          })
        )
        console.log(`Analysis saved with ID: ${analysisId}`)
      } catch (error) {
        console.error("Failed to save to DynamoDB:", error)
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "analysis_complete",
        data: results,
        userID: String(userId),
        analysisId: analysisId,
        previewSessionId: isPreview ? previewSessionId : undefined,
      }),
    }
  } catch (error) {
    console.error("Lambda error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    // Repo-not-found / private-repo errors are user errors, not server errors
    const statusCode = message.includes("not found") || message.includes("private") ? 400 : 500
    return {
      statusCode,
      body: JSON.stringify({ error: "Analysis failed", message }),
    }
  }
}

function analyzeFile(content: string): { loc: number; functionCount: number; complexity: number } {
  const loc = content.split("\n").length

  try {
    const ast = parse(content, {
      sourceType: "unambiguous",
      plugins: ["jsx", "typescript"],
      errorRecovery: true,
    })

    let functionCount = 0
    let complexity = 1

    function walk(node: Node | null) {
      if (!node || typeof node !== "object") return

      switch (node.type) {
        case "FunctionDeclaration":
        case "FunctionExpression":
        case "ArrowFunctionExpression":
          functionCount++
          break
        case "IfStatement":
        case "WhileStatement":
        case "ForStatement":
        case "ForInStatement":
        case "ForOfStatement":
        case "ConditionalExpression":
        case "CatchClause":
          complexity++
          break
        case "LogicalExpression":
          if (node.operator === "&&" || node.operator === "||") complexity++
          break
      }

      for (const key of Object.keys(node)) {
        const child = (node as unknown as Record<string, unknown>)[key]
        if (Array.isArray(child)) {
          child.forEach(c => walk(c as Node))
        } else if (child && typeof child === "object" && "type" in (child as object)) {
          walk(child as Node)
        }
      }
    }

    walk(ast.program as unknown as Node)

    return { loc, functionCount, complexity }
  } catch {
    return { loc, functionCount: 0, complexity: 1 }
  }
}

function githubHeaders(): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    ...(process.env.GITHUB_TOKEN && { Authorization: `token ${process.env.GITHUB_TOKEN}` }),
  }
}

async function getRepoInfo(owner: string, repo: string): Promise<{ defaultBranch: string; headSha: string }> {
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`
  const repoRes = await fetch(repoUrl, { headers: githubHeaders() })

  if (repoRes.status === 404) {
    throw new Error(
      "Repository not found. It may be private, misspelled, or deleted. This tool only supports public repositories."
    )
  }
  if (!repoRes.ok) {
    throw new Error(`Failed to fetch repo metadata: ${repoRes.statusText}`)
  }

  const repoData = (await repoRes.json()) as { default_branch: string; private: boolean }
  if (repoData.private) {
    throw new Error("This repository is private. This tool only supports public repositories.")
  }

  const branchUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${repoData.default_branch}`
  const branchRes = await fetch(branchUrl, { headers: githubHeaders() })
  if (!branchRes.ok) {
    throw new Error(`Failed to fetch branch info: ${branchRes.statusText}`)
  }
  const branchData = (await branchRes.json()) as { commit: { sha: string } }

  return { defaultBranch: repoData.default_branch, headSha: branchData.commit.sha }
}

async function getFileTree(owner: string, repo: string, sha: string): Promise<Array<{ path: string; size: number }>> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
  const res = await fetch(url, { headers: githubHeaders() })
  if (!res.ok) {
    throw new Error(`Failed to fetch file tree: ${res.statusText}`)
  }
  const data = (await res.json()) as {
    tree: Array<{ path: string; type: string; size?: number }>
    truncated: boolean
  }

  if (data.truncated) {
    console.warn(`Tree response truncated for ${owner}/${repo} - repo has more files than GitHub returned in one call`)
  }

  return data.tree.filter(item => item.type === "blob").map(item => ({ path: item.path, size: item.size || 0 }))
}

async function getCommitCount(owner: string, repo: string, sha: string): Promise<number> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${sha}&per_page=1`
    const res = await fetch(url, { headers: githubHeaders() })
    if (!res.ok) return 0

    const linkHeader = res.headers.get("link")
    if (!linkHeader) {
      const data = (await res.json()) as unknown[]
      return data.length
    }
    const match = linkHeader.match(/[?&]page=(\d+)>;\s*rel="last"/)
    return match ? parseInt(match[1], 10) : 1
  } catch (err) {
    console.error("Failed to get commit count:", err)
    return 0
  }
}

async function fetchFileContent(owner: string, repo: string, sha: string, path: string): Promise<string> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/")
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${encodedPath}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.statusText}`)
  }
  return res.text()
}

async function fetchFilesWithConcurrency(
  owner: string,
  repo: string,
  sha: string,
  files: Array<{ path: string }>,
  concurrency: number
): Promise<Array<{ path: string; content: string | null }>> {
  const results: Array<{ path: string; content: string | null }> = []

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async f => {
        try {
          const content = await fetchFileContent(owner, repo, sha, f.path)
          return { path: f.path, content }
        } catch (err) {
          console.error(`Skipping ${f.path}:`, err instanceof Error ? err.message : err)
          return { path: f.path, content: null }
        }
      })
    )
    results.push(...batchResults)
  }

  return results
}