/**
 * Labelled input (or textarea with as="textarea") with an inline error and an optional hint.
 * The error is linked with aria-describedby and the field gets aria-invalid.
 */
export default function Input({ id, label, optional, error, hint, extra, as = 'input', className = 'inp', ...input }) {
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  const describedBy = [error && errId, hint && hintId].filter(Boolean).join(' ') || undefined
  const Tag = as
  return (
    <div className="field">
      <label className="lbl" htmlFor={id}>
        {label}{optional && <span className="muted"> (optional)</span>}
      </label>
      <Tag id={id} className={className + (error ? ' bad' : '')} aria-invalid={!!error} aria-describedby={describedBy} {...input} />
      {extra}
      {hint && <p className="hint" id={hintId}>{hint}</p>}
      {error && <p className="ferr" id={errId}>{error}</p>}
    </div>
  )
}
