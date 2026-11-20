/** Labelled input with an inline error and an optional hint underneath. */
export default function Field({ id, label, optional, error, hint, extra, className = 'inp', ...input }) {
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  const describedBy = [error && errId, hint && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label className="lbl" htmlFor={id}>
        {label}{optional && <span className="muted"> (optional)</span>}
      </label>
      <input id={id} className={className + (error ? ' bad' : '')} aria-invalid={!!error} aria-describedby={describedBy} {...input} />
      {extra}
      {hint && <p className="hint" id={hintId}>{hint}</p>}
      {error && <p className="ferr" id={errId}>{error}</p>}
    </div>
  )
}
