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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Share Analysis</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Share this link with others to let them view this analysis:
          </p>

          {/* URL Display */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 break-all">
            <p className="text-xs font-mono text-gray-700">{shareUrl}</p>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              copied
                ? "bg-green-100 text-green-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {copied ? (
              <>
                <Check size={18} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={18} />
                Copy Link
              </>
            )}
          </button>

          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-900">
              <span className="font-semibold">Note:</span> This link is public and anyone with the URL can view this analysis.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}