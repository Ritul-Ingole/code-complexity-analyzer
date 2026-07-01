"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const isomorphic_git_1 = __importDefault(require("isomorphic-git"));
const node_1 = __importDefault(require("isomorphic-git/http/node"));
const fs = __importStar(require("fs"));
const fs_1 = require("fs");
const path_1 = require("path");
const handler = async (event) => {
    console.log("Lambda invoked with:", event.body);
    const body = JSON.parse(event.body || "{}");
    const { repoUrl, userId } = body;
    let repoPath = null;
    try {
        // Extract owner/repo from URL
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
        if (!match) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid GitHub URL" }),
            };
        }
        const [, owner, repo] = match;
        // Pre-check repo size via GitHub API
        console.log(`Checking repo size for ${owner}/${repo}`);
        const repoSize = await getRepoSize(owner, repo);
        console.log(`Repo size: ${repoSize} KB (${(repoSize / 1024).toFixed(2)} MB)`);
        if (repoSize > 500000) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Repository too large",
                    message: `This repository is ${(repoSize / 1024).toFixed(0)}MB. Shallow clone may exceed storage limits.`,
                    repoSize,
                }),
            };
        }
        // Clone with isomorphic-git (no git binary needed)
        repoPath = (0, path_1.resolve)("/tmp", `repo-${userId}-${Date.now()}`);
        (0, fs_1.mkdirSync)(repoPath, { recursive: true });
        console.log(`Cloning ${repoUrl} to ${repoPath}`);
        await isomorphic_git_1.default.clone({
            fs,
            http: node_1.default,
            dir: repoPath,
            url: repoUrl,
            depth: 500,
            singleBranch: true,
            noTags: true,
        });
        console.log("Clone complete");
        // Get commit history
        const commits = await isomorphic_git_1.default.log({
            fs,
            dir: repoPath,
            depth: 500,
        });
        console.log(`Found ${commits.length} commits`);
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
        };
    }
    catch (error) {
        console.error("Lambda error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Analysis failed",
                message: error instanceof Error ? error.message : "Unknown error",
            }),
        };
    }
    finally {
        // Always clean up /tmp
        if (repoPath && (0, fs_1.existsSync)(repoPath)) {
            try {
                console.log(`Cleaning up ${repoPath}`);
                (0, fs_1.rmSync)(repoPath, { recursive: true, force: true });
                console.log("Cleanup complete");
            }
            catch (err) {
                console.error("Cleanup failed:", err);
            }
        }
    }
};
exports.handler = handler;
async function getRepoSize(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await fetch(url, {
        headers: {
            ...(process.env.GITHUB_TOKEN && {
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
            }),
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch repo metadata: ${response.statusText}`);
    }
    const data = await response.json();
    return data.size;
}
