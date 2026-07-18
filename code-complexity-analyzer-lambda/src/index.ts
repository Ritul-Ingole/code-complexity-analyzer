import { APIGatewayProxyHandlerV2 } from "aws-lambda"
import * as fs from "fs"
import { rmSync, existsSync, mkdirSync } from "fs"
import { resolve } from "path"
import { parse } from "@babel/parser"
import { Node } from "@babel/types"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" })
const docClient = DynamoDBDocumentClient.from(dynamoClient)

// Make git from layer available
process.env.PATH = `/opt/bin:${process.env.PATH}`

export const handler = async (event: any) => {
  console.log("Lambda invoked with:", event)
  const { repoUrl, userId } = event

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
    const { execSync } = require('child_process')
    try {
      execSync(`git clone --depth 500 --single-branch --no-tags ${repoUrl} ${repoPath}`, {
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024,
      })
    } catch (error) {
      throw new Error(`Git clone failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    console.log("Clone complete")

    // Get commit count
    const commitsOutput = execSync(`git -C ${repoPath} log --oneline | wc -l`, {
      encoding: 'utf-8'
    })
    const commits = parseInt(commitsOutput.trim())
    console.log(`Found ${commits} commits`)


    // ANALYZE HEAD ONLY
    const headShaOutput = execSync(`git -C ${repoPath} rev-parse HEAD`, {
      encoding: 'utf-8'
    })
    const headSha = headShaOutput.trim()
    console.log(`Analyzing HEAD: ${headSha}`)

    // Get all JS/TS files in the repo
    const filesOutput = execSync(`git -C ${repoPath} ls-tree -r --name-only HEAD`, {
      encoding: 'utf-8'
    })
    const allFiles = filesOutput.split('\n').filter(Boolean)

    const jsFiles = allFiles.filter((f: string) =>
      f.endsWith(".js") || f.endsWith(".jsx") || f.endsWith(".ts") || f.endsWith(".tsx")
    )

    console.log(`Found ${jsFiles.length} JS/TS files`)

    const fileMetrics: Array<{
      path: string
      loc: number
      functions: number
      complexity: number
    }> = []

    let totalLoc = 0
    let totalFunctions = 0
    let totalComplexity = 0

    for (const file of jsFiles) {
      try {
        const content = execSync(`git -C ${repoPath} show HEAD:${file}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        })

        const metrics = analyzeFile(content)

        fileMetrics.push({
          path: file,
          loc: metrics.loc,
          functions: metrics.functionCount,
          complexity: metrics.complexity,
        })

        totalLoc += metrics.loc
        totalFunctions += metrics.functionCount
        totalComplexity += metrics.complexity
      } catch {
        // Skip unparseable files
      }
    }

    // Sort by complexity descending
    fileMetrics.sort((a, b) => b.complexity - a.complexity)

    const results = {
      timestamp: new Date().toISOString(),
      repoUrl,
      headSha,
      totalCommits: commits,
      metrics: {
        totalLoc,
        totalFunctions,
        averageComplexity: fileMetrics.length > 0 ? totalComplexity / fileMetrics.length : 0,
        fileCount: fileMetrics.length,
      },
      topComplexFiles: fileMetrics.slice(0, 10),
    }

    console.log(`Analysis complete: ${fileMetrics.length} files analyzed`)

    const analysisId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    try {
      await docClient.send(
        new PutCommand({
          TableName: process.env.DYNAMODB_TABLE_NAME || "complexity-analyses",
          Item: {
            userID: String(userId),
            analysisId,
            repoUrl,
            timestamp: new Date().toISOString(),
            headSha: headSha,
            totalCommits: commits,
            metrics: results.metrics,
            topComplexFiles: results.topComplexFiles,
            ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
          },
        })
      )
      console.log(`Analysis saved with ID: ${analysisId}`)
    } catch (error) {
      console.error("Failed to save to DynamoDB:", error)
      // Don't fail the whole invocation if DynamoDB write fails
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "analysis_complete",
        data: results,
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