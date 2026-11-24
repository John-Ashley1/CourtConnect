import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog: focus moves inside, Tab stays inside, Escape and the backdrop close it,
 * and focus returns to the button that opened it.
 */
export default function Modal({ open, title, onClose, children, footer, wide, closeOnBackdrop = true }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const el = ref.current
    const first = el.querySelector('[data-autofocus]') || el.querySelector(FOCUSABLE) || el
    first.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.() }
      if (e.key !== 'Tab') return
      const items = [...el.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      const a = items[0], z = items[items.length - 1]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      opener?.focus?.()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null
  return createPortal(
    <div className="overlay" onMouseDown={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose?.() }}>
      <div ref={ref} className={'dlg' + (wide ? ' dlg-wide' : '')} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId}>{title}</h2>
        {children}
        {footer && <div className="dlg-actions">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/**
 * "Are you sure?" dialog for cancel / decline / block / deactivate.
 * The safe choice (Keep / Cancel) gets focus first.
 */
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal open={open} title={title} onClose={busy ? undefined : onCancel} closeOnBackdrop={!busy}
      footer={<>
        <Button variant="sec" onClick={onCancel} disabled={busy} data-autofocus>{cancelLabel}</Button>
        <Button variant={danger ? 'dan' : 'pri'} onClick={onConfirm} busy={busy}>{confirmLabel}</Button>
      </>}>
      <div className="dlg-body">{children}</div>
    </Modal>
  )
}
