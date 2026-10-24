# Code Complexity Analyzer

A web app that analyses the complexity of public JavaScript and TypeScript repositories on GitHub and reports where the codebase is hardest to work in.

Paste a repository URL and the app fetches its source files, measures cyclomatic complexity per file, and renders the result as a per-file table, a dependency graph and a ranked list of the most complex files. Signed-in users keep a history, can compare a fresh run against the previous analysis of the same repository, and can publish a read-only share link.

## Running locally

Node.js 18.17 or newer (the Next.js 14 minimum) and npm.

```bash
npm install
cp .env.example .env.local   # fill in the values described below
npm run dev
```

Then open <http://localhost:3000>.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server with fast refresh |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint via `next lint` |

## Environment variables

Names only — copy `.env.example` and supply your own values. Never commit real credentials.

| Variable | Used for |
| --- | --- |
| `GITHUB_CLIENT_ID_LOCAL`, `GITHUB_CLIENT_SECRET_LOCAL` | GitHub OAuth app for local development |
| `GITHUB_CLIENT_ID_PROD`, `GITHUB_CLIENT_SECRET_PROD` | GitHub OAuth app for the deployed (non-localhost) origin |
| `SESSION_SECRET` | Signing the session cookie (HMAC, at least 16 random characters) |
| `NEXT_PUBLIC_APP_URL` | Public base URL used to build OAuth redirects |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS credentials for the analysis backend |
| `LAMBDA_FUNCTION_NAME` | Analysis Lambda invoked by the API routes |
| `DYNAMODB_TABLE_NAME` | Table that stores analyses, comparisons and usage counters |

## How it works

- **Analysis** — API routes in `src/app/api` validate the repository URL, invoke the analysis Lambda and store the result in DynamoDB. Repository fetching and complexity measurement happen in the Lambda, not in the browser.
- **Auth** — GitHub OAuth through the `src/app/api/auth` routes, with a signed session cookie. Signed-in analyses are retained for 30 days and then expire.
- **Usage limits** — anonymous visitors get one analysis per browser session; per-user daily limits are enforced server-side and the remaining count is read from `/api/usage`.
- **Sharing** — `/share/[userId]/[analysisId]` renders a public, read-only report. No account is required to view it.

## Stack

- [Next.js 14](https://nextjs.org) App Router with React 18 and TypeScript
- [Tailwind CSS](https://tailwindcss.com) 3.4 for styling, with the design tokens declared in `src/app/globals.css`
- [Recharts](https://recharts.org) for the complexity charts
- [three.js](https://threejs.org) for the landing-page orb scene
- [Lenis](https://github.com/darkroomengineering/lenis) for smooth scrolling
- AWS Lambda + DynamoDB via the AWS SDK for the analysis backend

## Backend

The analysis service lives in the sibling repository `code-complexity-analyzer-lambda`. This app only calls it (through the Lambda SDK) and reads its results from DynamoDB; deploy and configure that service first if you are running the whole system locally.
