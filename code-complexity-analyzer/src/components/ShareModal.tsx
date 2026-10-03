"use client"

import { useState } from "react"
import { X, Copy, Check } from "lucide-react"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  analysisId: string
}

export default function ShareModal({
  isOpen,
  onClose,
  userId,
  analysisId,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${userId}/${analysisId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#2b2620]/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="animate-modal-in w-full max-w-md rounded-[2rem] bg-white/40 p-1.5 ring-1 ring-[#e6e0d4] shadow-[0_24px_60px_-24px_rgba(43,38,32,0.35)]">
        <div className="bg-[#faf8f3] rounded-[1.625rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e6e0d4]">
          <h2 className="text-lg font-semibold text-[#2b2620]">Share Analysis</h2>
          <button
            onClick={onClose}
            className="p-1 text-[#766c5e] hover:text-[#6f665a] transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#6f665a]">
            Share this link with others to let them view this analysis:
          </p>

          {/* URL Display */}
          <div className="bg-[#f4f1ea] rounded-lg p-4 border border-[#e6e0d4] break-all">
            <p className="text-xs font-mono text-[#51483d]">{shareUrl}</p>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full font-medium transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
              copied
                ? "badge-good"
                : "bg-[#c1694f] text-[#faf8f3] hover:bg-[#b25a41]"
            }`}
          >
            {copied ? (
              <>
                <Check size={18} />
                Copied
              </>
            ) : (
              <>
                <Copy size={18} />
                Copy Link
              </>
            )}
          </button>

          {/* Info */}
          <div className="bg-[#f2ead9] rounded-xl p-3 border border-[#dfcba2]">
            <p className="text-xs text-[#51483d]">
              This link is public — anyone with the URL can view this analysis.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e6e0d4] flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full px-5 py-2 text-[#51483d] hover:bg-[#eee9de] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] font-medium"
          >
            Done
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}