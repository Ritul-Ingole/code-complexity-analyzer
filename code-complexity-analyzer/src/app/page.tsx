import { getSession } from "@/lib/session"
import Link from "next/link"

export default async function Home() {
  const session = await getSession()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Code Complexity Analyzer</h1>
        <p className="text-gray-600 mb-8">
          Analyze JavaScript repositories for complexity metrics
        </p>

        {!session ? (
          <Link
            href="/api/auth/login"
            className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 inline-block"
          >
            Sign in with GitHub
          </Link>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">Welcome, {session.login}</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/analyze"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block"
              >
                Analyze Repository
              </Link>
              <form action="/api/auth/logout" method="POST" className="inline-block">
                <button
                  type="submit"
                  className="bg-gray-300 text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-400"
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