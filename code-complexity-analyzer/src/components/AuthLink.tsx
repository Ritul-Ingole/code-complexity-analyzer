"use client"

import type { ReactNode } from "react"

// Sign-in link that forces a full browser navigation. Next's client router
// would fetch /api/auth/login and follow the redirect to github.com with RSC
// headers, which fails the CORS preflight; the OAuth redirect must be a
// top-level document navigation, which requires a client component.
export default function AuthLink({ className, children, next }: { className?: string; children: ReactNode; next?: string }) {
  const href = next ? `/api/auth/login?next=${encodeURIComponent(next)}` : "/api/auth/login"
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        window.location.href = href
      }}
      className={className}
    >
      {children}
    </a>
  )
}
