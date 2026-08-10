import { getSession } from "@/lib/session"
import Link from "next/link"

export default async function Home() {
  const session = await getSession()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">Code Complexity Analyzer</h1>
        <p className="text-xl text-gray-600 mb-12">
          Analyze JavaScript repositories for complexity metrics, trends, and comparisons
        </p>

        {!session ? (
          <div className="space-y-4">
            <p className="text-gray-600 mb-8">Choose how you'd like to get started:</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/analyze"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors inline-block"
              >
                Try Free Analysis
              </Link>
              <Link
                href="/api/auth/login"
                className="bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-gray-800 font-medium transition-colors inline-block"
              >
                Sign in for Unlimited
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Free analysis: one repository per session. Sign in to save analyses, track trends, and compare results.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg text-gray-700">Welcome, <span className="font-semibold">{session.login}</span></p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/analyze"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors inline-block"
              >
                Analyze Repository
              </Link>
              <Link
                href="/dashboard"
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-medium transition-colors inline-block"
              >
                View History
              </Link>
              <form action="/api/auth/logout" method="POST" className="inline-block">
                <button
                  type="submit"
                  className="bg-gray-300 text-gray-900 px-8 py-3 rounded-lg hover:bg-gray-400 font-medium transition-colors w-full sm:w-auto"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}