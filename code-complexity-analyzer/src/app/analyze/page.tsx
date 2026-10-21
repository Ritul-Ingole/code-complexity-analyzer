import { Suspense } from "react"
import { getSession } from "@/lib/session"
import AnalyzeForm from "@/components/AnalyzeForm"
import AppShell from "@/components/AppShell"

export const metadata = { title: "Analyze" }

export default async function AnalyzePage(){
  const session=await getSession();
  return <AppShell active="analyze" authenticated={!!session} login={session?.login}>
            <header className="workspace-heading">
            <p className="eyebrow">THE ANALYSIS WORKSPACE</p>
            <h1>Know where to <span>look first.</span></h1>
            <p>From a repository full of code to a clear picture of its hotspots.</p>
            </header>
            <Suspense fallback={<p>Loading workspace…</p>}>
            <AnalyzeForm isAuthenticated={!!session}/>
            </Suspense>
        </AppShell>}