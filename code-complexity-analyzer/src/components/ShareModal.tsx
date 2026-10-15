"use client"

import { useEffect, useRef, useState } from "react"
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
  const [closing, setClosing] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Bounded exit: apply ui-modal-exit, then unmount on animationend
  // (timeout fallback per the motion spec, <= 400ms).
  const requestClose = () => {
    if (closing) return
    setClosing(true)
  }
  useEffect(() => {
    if (!closing) return
    const el = dialogRef.current
    let done = false
    const finish = () => {
      if (done) return
      done = true
      onClose()
    }
    el?.addEventListener("animationend", finish, { once: true })
    const fallback = setTimeout(finish, 400)
    return () => {
      clearTimeout(fallback)
      el?.removeEventListener("animationend", finish)
    }
  }, [closing, onClose])

  // Escape closes too
  useEffect(() => {
    if (!isOpen || closing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClosing(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, closing])

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
    <div className="fixed inset-0 z-50 bg-[var(--ui-backdrop)] backdrop-blur-sm flex items-center justify-center p-4" onClick={requestClose}>
      <div ref={dialogRef} data-lenis-prevent="true" onClick={(e) => e.stopPropagation()} className={`ui-state-enter ${closing ? "ui-modal-exit" : ""} w-full max-w-md rounded-[2rem] bg-white/40 p-1.5 ring-1 ring-ui-border shadow-[0_24px_60px_-24px_rgba(43,38,32,0.35)]`}>
        <div className="bg-ui-surface rounded-[1.625rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ui-border">
          <h2 className="text-lg font-semibold text-ui-text">Share Analysis</h2>
          <button
            onClick={requestClose}
            className="p-1 text-ui-taupe-soft hover:text-ui-secondary transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-ui-secondary">
            Share this link with others to let them view this analysis:
          </p>

          {/* URL Display */}
          <div className="bg-ui-canvas rounded-lg p-4 border border-ui-border break-all">
            <p className="text-xs font-mono text-ui-text-deep">{shareUrl}</p>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`ui-press w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full font-medium transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
              copied
                ? "badge-good"
                : "bg-ui-accent text-ui-accent-ink hover:bg-ui-accent-hover"
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
          <div className="bg-ui-sand-warm rounded-xl p-3 border border-ui-sand-strong">
            <p className="text-xs text-ui-text-deep">
              This link is public — anyone with the URL can view this analysis.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ui-border flex justify-end">
          <button
            onClick={requestClose}
            className="ui-press rounded-full px-5 py-2 text-ui-text-deep hover:bg-ui-sand transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] font-medium"
          >
            Done
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}