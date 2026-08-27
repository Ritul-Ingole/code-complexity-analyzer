import { getSession } from "@/lib/session"
import ExpandingHeroSection from "@/components/ExpandingHeroSection"

export default async function Home() {
  const session = await getSession()

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <ExpandingHeroSection isAuthenticated={!!session} login={session?.login} />

      {/* Next section — solid warm background, appears once the sticky scene releases */}
      <section className="bg-[#faf8f3] py-24 px-6 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-xs font-mono text-[#a85c42] tracking-wide">03 —</span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#2b2620] mt-4">
            Ready to see your own repo?
          </h2>
        </div>
      </section>
    </div>
  )
}