import type { Metadata } from "next"
import "./globals.css"

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
      <body>{children}</body>
    </html>
  )
}