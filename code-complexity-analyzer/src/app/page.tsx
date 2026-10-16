import { getSession } from "@/lib/session"
import HeroSection from "@/components/hero/HeroSection"
import { HowItWorks, ProductPreview, TrendsTeaser, TrustFaq } from "@/components/hero/LandingSections"
import NavBar from "@/components/NavBar"
import Link from "next/link"
import IntroLoader from "@/components/hero/IntroLoader"

function Footer({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <footer className="relative z-10 border-t border-[#e6e0d4] px-6 py-10 md:px-16 lg:px-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="font-mono text-xs text-[#8a8172]">
          © {new Date().getFullYear()} code·complexity
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/analyze"
            className="text-xs font-medium text-[#6f665a] transition-colors hover:text-[#2b2620]"
          >
            Analyze
          </Link>
          {isAuthenticated && (
            <Link
              href="/history"
              className="text-xs font-medium text-[#6f665a] transition-colors hover:text-[#2b2620]"
            >
              History
            </Link>
          )}
        </div>
        <span className="font-mono text-xs text-[#8a8172]">
          Public GitHub repositories · JavaScript &amp; TypeScript
        </span>
      </div>
    </footer>
  )
}

export default async function Home() {
  const session = await getSession()

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <IntroLoader />
      <NavBar isAuthenticated={!!session} login={session?.login} />
      <HeroSection isAuthenticated={!!session} login={session?.login} />
      <HowItWorks />
      <ProductPreview />
      <TrendsTeaser isAuthenticated={!!session} />
      <TrustFaq isAuthenticated={!!session} />
      <Footer isAuthenticated={!!session} />
    </div>
  )
}
