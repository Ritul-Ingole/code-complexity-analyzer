import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import AnalyzeForm from "@/components/AnalyzeForm"

export default async function AnalyzePage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Analyze Repository</h1>
        <AnalyzeForm />
      </div>
    </div>
  )
}
