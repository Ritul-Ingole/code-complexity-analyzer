import type { Metadata } from "next"
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import "./workspace.css"
import SmoothScroll from "@/components/SmoothScroll"

// Editorial serif for headlines — the display voice that keeps this from
// reading as another generic SaaS-sans landing page.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
})

// Humanist sans for body copy and UI chrome.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

// Technical mono for kickers, labels, data — reinforces the analysis-tool feel.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Code Complexity Analyzer",
  description: "Analyze JavaScript repositories for complexity metrics",
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  )
}
