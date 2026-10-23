"use client"

import { useEffect, useRef, useState } from "react"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  analysisId: string
}

// Native <dialog>, same pattern as FileDetailDialog: showModal() traps tab
// focus, Escape/backdrop fire `cancel` (prevented and routed through onClose so
// React owns the close), and effect cleanup returns focus to the Share button.
// The URL is built in the effect, never during render, so the server render and
// the first client render agree (no window access at module scope).
export default function ShareModal({
  isOpen,
  onClose,
  userId,
  analysisId,
}: ShareModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [shareUrl, setShareUrl] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    if (!isOpen) return
    const previous = document.activeElement
    const dialog = ref.current
    setShareUrl(
      `${window.location.origin}/share/${encodeURIComponent(userId)}/${encodeURIComponent(analysisId)}`
    )
    setStatus("")
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [isOpen, userId, analysisId])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setStatus("Link copied.")
    } catch {
      // Denied permission or an insecure context: say so and point at the input
      // instead of failing silently. No timer — the message stays until reopen.
      setStatus("Copy failed. Select and copy the link below.")
    }
  }

  if (!isOpen) return null

  return (
    <dialog
      ref={ref}
      data-lenis-prevent
      className="polish-ui border-0 bg-transparent p-0 text-left"
      style={{ maxWidth: "var(--ui-width-form)", width: "calc(100% - var(--ui-space-6))" }}
      aria-labelledby="share-title"
      onCancel={event => { event.preventDefault(); onClose() }}
    >
      {/* Landing-card shell: translucent halo + hairline ring, same recipe as
          the section 02/03 cards, so the modal reads as one of those panels. */}
      <div className="rounded-[var(--ui-radius-shell)] bg-white/40 p-1.5 ring-1 ring-ui-border">
        <div className="rounded-panel bg-ui-surface p-6">
          <h2 id="share-title" className="text-lg font-semibold text-ui-text">Share analysis</h2>
          <p className="mt-2 text-sm text-ui-secondary">
            This link is public — anyone with the URL can view this analysis.
          </p>

          <label htmlFor="share-url" className="mt-4 block text-xs uppercase tracking-wide text-ui-secondary">
            Public analysis link
          </label>
          <input
            id="share-url"
            value={shareUrl}
            readOnly
            className="mt-1 w-full rounded-control border border-ui-control bg-ui-canvas px-3 py-2 font-mono text-sm break-all text-ui-text-deep"
            onFocus={event => event.currentTarget.select()}
          />

          {/* Reserved height so the success/failure message cannot shift the buttons. */}
          <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-ui-text-deep">
            {status}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="primary-action ui-press"
              disabled={!shareUrl}
              onClick={() => { void handleCopy() }}
            >
              Copy link
            </button>
            <button type="button" className="secondary-action" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
