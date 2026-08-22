import type { Metadata } from "next"
import "./globals.css"
import SmoothScrollProvider from "@/components/SmoothScrollProvider"

export const metadata: Metadata = {
  title: "Code Complexity Analyzer",
  description: "Analyze JavaScript repositories for complexity metrics"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  )
}