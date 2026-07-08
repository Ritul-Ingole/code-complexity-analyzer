import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import DashboardClient from "@/components/DashboardClient"

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  return <DashboardClient userId={session.userId} />
}