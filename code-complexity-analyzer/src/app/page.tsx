import { getSession } from "@/lib/session"
import Link from "next/link"
import { ArrowRight, Zap, TrendingUp, Share2, Lock } from "lucide-react"

export default async function Home() {
  const session = await getSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute top-40 right-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-4xl mx-auto w-full">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fadeIn">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-8 hover:bg-white/15 transition-colors">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Powered by AWS Lambda & GitHub API</span>
            </div>

            {/* Main headline */}
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 animate-slideUp">
              Code Complexity Analyzer
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed animate-slideUp animation-delay-100">
              Analyze any public GitHub repository and uncover complexity metrics, identify hotspots, and track improvements over time.
            </p>

            {/* CTA Section */}
            {!session ? (
              <div className="space-y-6">
                <p className="text-slate-400 mb-8">Get started instantly — no credit card required</p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {/* Try Free Analysis Button */}
                  <Link
                    href="/analyze"
                    className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 inline-flex items-center justify-center gap-3 text-lg"
                  >
                    <span>Try Free Analysis</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  {/* Sign In Button */}
                  <Link
                    href="/api/auth/login"
                    className="group px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/30 hover:border-white/50 transition-all duration-300 backdrop-blur-sm inline-flex items-center justify-center gap-3 text-lg"
                  >
                    <Lock className="w-5 h-5" />
                    <span>Sign in for Unlimited</span>
                  </Link>
                </div>

                <p className="text-sm text-slate-500 mt-8">
                  Free: one analysis per session • Unlimited analyses when you sign in
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="inline-block bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-3 mb-4">
                  <p className="text-slate-300">
                    Welcome back, <span className="font-bold text-cyan-400">{session.login}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/analyze"
                    className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 inline-flex items-center justify-center gap-3 text-lg"
                  >
                    <span>Analyze Repository</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href="/dashboard"
                    className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 inline-flex items-center justify-center gap-3 text-lg"
                  >
                    <TrendingUp className="w-5 h-5" />
                    <span>View History</span>
                  </Link>

                  <form action="/api/auth/logout" method="POST" className="inline-block">
                    <button
                      type="submit"
                      className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/30 hover:border-white/50 transition-all duration-300 backdrop-blur-sm text-lg"
                    >
                      Sign Out
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Analyze repositories in 5-12 seconds using AWS Lambda and GitHub API.",
              },
              {
                icon: TrendingUp,
                title: "Track Trends",
                description: "Compare complexity metrics across multiple analyses and spot improvements.",
              },
              {
                icon: Share2,
                title: "Share Results",
                description: "Generate shareable links to show complexity reports to your team.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group bg-white/5 backdrop-blur-md border border-white/10 hover:border-cyan-500/50 rounded-xl p-6 transition-all duration-300 hover:bg-white/10 hover:shadow-xl hover:shadow-cyan-500/20 transform hover:scale-105"
              >
                <div className="mb-4 inline-flex p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 group-hover:from-cyan-500/40 group-hover:to-blue-500/40 transition-colors">
                  <feature.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}