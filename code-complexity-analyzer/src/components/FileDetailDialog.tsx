"use client"

import { useEffect, useRef } from "react"

type FileDetail = { path: string; loc: number; functions: number; complexity: number }

// Native <dialog>: showModal() traps tab focus, Escape/backdrop fire `cancel`
// (prevented and routed through onClose so React owns the close), and effect
// cleanup returns focus to the row that opened it.
export default function FileDetailDialog({ file, onClose }: { file: FileDetail; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      // max-h + overflow keep a tall card scrollable inside the centred box on a
      // short viewport; data-lenis-prevent stops Lenis swallowing that wheel
      // (05: every modal body is armed).
      className="file-detail-dialog max-h-[calc(100dvh-var(--ui-space-6))] overflow-auto rounded-2xl border border-ui-control bg-ui-raised text-left"
      data-lenis-prevent
      style={{ padding: "var(--ui-space-5)", maxWidth: "var(--ui-width-form)", width: "calc(100% - var(--ui-space-6))" }}
      aria-labelledby="file-detail-title"
      onCancel={event => { event.preventDefault(); onClose() }}
    >
      <h2 id="file-detail-title" className="text-lg font-semibold text-ui-text">File details</h2>
      <p className="font-mono text-sm break-all text-ui-text-deep">{file.path}</p>
      <dl className="mt-4 space-y-2">
        <dt className="text-xs uppercase tracking-wide text-ui-secondary">Lines of code</dt>
        <dd className="font-mono tabular-nums text-ui-text">{file.loc.toLocaleString("en-US")}</dd>
        <dt className="text-xs uppercase tracking-wide text-ui-secondary">Functions</dt>
        <dd className="font-mono tabular-nums text-ui-text">{file.functions.toLocaleString("en-US")}</dd>
        <dt className="text-xs uppercase tracking-wide text-ui-secondary">Complexity</dt>
        <dd className="font-mono tabular-nums text-ui-text">{file.complexity.toLocaleString("en-US")}</dd>
      </dl>
      <button type="button" className="secondary-action mt-5 text-sm" onClick={onClose}>Close details</button>
    </dialog>
  )
}
