import { APIGatewayProxyHandlerV2 } from "aws-lambda"
import git from "isomorphic-git"
import http from "isomorphic-git/http/node"
import * as fs from "fs"
import { rmSync, existsSync, mkdirSync } from "fs"
import { resolve } from "path"
import { parse } from "@babel/parser"
import { Node } from "@babel/types"

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("Lambda invoked with:", event.body)

  const body = JSON.parse(event.body || "{}")
  const { repoUrl, userId } = body

  let repoPath: string | null = null

  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/)
    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid GitHub URL" }),
      }
    }

    const [, owner, repo] = match

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

    const commits = await git.log({
      fs,
      dir: repoPath,
      depth: 500,
    })
    console.log(`Found ${commits.length} commits`)

    const results = []

    for (const commit of commits) {
      try {
        const files = await git.listFiles({
          fs,
          dir: repoPath,
          ref: commit.oid,
        })

        const jsFiles = files.filter(f =>
          f.endsWith(".js") || f.endsWith(".jsx")
        )

        let totalLoc = 0
        let totalFunctions = 0
        let totalComplexity = 0
        let fileCount = 0

        for (const file of jsFiles) {
          try {
            const { blob } = await git.readBlob({
              fs,
              dir: repoPath!,
              oid: commit.oid,
              filepath: file,
            })

            const content = Buffer.from(blob).toString("utf8")
            const metrics = analyzeFile(content)

            totalLoc += metrics.loc
            totalFunctions += metrics.functionCount
            totalComplexity += metrics.complexity
            fileCount++
          } catch {
            // Skip unparseable files
          }
        }

        results.push({
          sha: commit.oid,
          date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
          message: commit.commit.message.slice(0, 100),
          loc: totalLoc,
          functionCount: totalFunctions,
          complexity: fileCount > 0 ? totalComplexity / fileCount : 0,
          fileCount,
        })
      } catch {
        // Skip commits that can't be analyzed
      }
    }

    console.log(`Analysis complete for ${results.length} commits`)

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "analysis_complete",
        repoUrl,
        userId,
        commitCount: commits.length,
        results,
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