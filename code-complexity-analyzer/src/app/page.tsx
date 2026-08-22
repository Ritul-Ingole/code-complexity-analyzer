import { getSession } from "@/lib/session"
import Link from "next/link"
import { ArrowRight, Lock, TrendingUp, Zap } from "lucide-react"
import HeroVisual from "@/components/HeroVisual"
import ParallaxReveal from "@/components/ParallaxReveal"

export default async function Home() {
  const session = await getSession()

  return (
    <div className="min-h-screen bg-slate-950">
      <section className="relative min-h-screen flex items-center px-6 md:px-16 lg:px-24 overflow-hidden">
        {/* subtle ambient glow behind everything, not the loud orb-soup from before */}
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />

        <div className="relative z-10 w-full max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
          <div className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 border border-slate-700 rounded-full px-3 py-1.5 mb-8">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-mono text-slate-400 tracking-wide">
                STATIC ANALYSIS IN SECONDS
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white leading-[1.1] mb-6">
              Know where your
              <br />
              codebase <span className="text-cyan-400">hurts.</span>
            </h1>

            <p className="text-lg text-slate-400 mb-10 max-w-md leading-relaxed">
              Paste a public GitHub repo. Get complexity metrics, hotspot
              rankings, and trend tracking in under 10 seconds.
            </p>

            {!session ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/analyze"
                    className="group inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-6 py-3 rounded-lg transition-colors"
                  >
                    Try Free Analysis
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/api/auth/login"
                    className="inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold px-6 py-3 rounded-lg transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    Sign in for Unlimited
                  </Link>
                </div>
                <p className="text-xs text-slate-500">
                  Free: one analysis per session, no login required.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-sm text-slate-400">
                  Welcome back, <span className="text-cyan-400 font-medium">{session.login}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/analyze"
                    className="group inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-6 py-3 rounded-lg transition-colors"
                  >
                    Analyze Repository
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold px-6 py-3 rounded-lg transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    View History
                  </Link>
                </div>
              </div>
            )}
          </div>
            
          {/* Right: 3D node cluster */}
          <div className="order-1 md:order-2">
            <HeroVisual />
          </div>
        </div>
      </section>
      <ParallaxReveal />
    </div>
  )
}