import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import DashboardClient from "@/components/DashboardClient"

export const metadata = { title: "History" }

export default async function HistoryPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  return <DashboardClient userId={String(session.userId)} login={session.login} />
}