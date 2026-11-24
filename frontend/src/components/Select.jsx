/**
 * Labelled <select> with inline error.
 * options: [{ value, label }] or strings. `placeholder` adds a first empty option.
 */
export default function Select({ id, label, optional, error, hint, options = [], placeholder, hideLabel, ...select }) {
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  const describedBy = [error && errId, hint && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label className={hideLabel ? 'sr-only' : 'lbl'} htmlFor={id}>
        {label}{optional && <span className="muted"> (optional)</span>}
      </label>
      <select id={id} className={'inp' + (error ? ' bad' : '')} aria-invalid={!!error} aria-describedby={describedBy} {...select}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o
          return <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
        })}
      </select>
      {hint && <p className="hint" id={hintId}>{hint}</p>}
      {error && <p className="ferr" id={errId}>{error}</p>}
    </div>
  )
}
