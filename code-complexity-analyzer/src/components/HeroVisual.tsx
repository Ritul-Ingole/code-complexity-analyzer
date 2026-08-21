"use client"

import dynamic from "next/dynamic"

const CodeNetworkHero = dynamic(() => import("./three/CodeNetworkHero"), {
  ssr: false,
  loading: () => <div className="w-full h-full" />,
})

export default function HeroVisual() {
  return (
    <div className="relative w-full h-[420px] md:h-[560px]">
      {/* Mobile/low-power fallback: static ambient gradient, no WebGL cost */}
      <div className="md:hidden absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/20 blur-2xl" />
      </div>

      {/* Desktop/tablet: full interactive 3D scene */}
      <div className="hidden md:block absolute inset-0">
        <CodeNetworkHero />
      </div>
    </div>
  )
}