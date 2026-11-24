import { useState } from 'react'
import Icon from './Icon'

/**
 * Password field with its own show/hide (eye) button inside the right edge.
 * Same API as Input/Field: label, error, hint, extra (e.g. the strength meter) and any <input> props.
 *  - Starts hidden each time the page opens; each field toggles independently.
 *  - The button is type="button" (never submits), keeps focus and the caret in the input on click,
 *    and works from the keyboard (Tab to it, then Enter or Space).
 */
export default function PasswordInput({ id, label, optional, error, hint, extra, className = 'inp', ...input }) {
  const [visible, setVisible] = useState(false)
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  const describedBy = [error && errId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label className="lbl" htmlFor={id}>
        {label}{optional && <span className="muted"> (optional)</span>}
      </label>
      <div className="pw-wrap">
        <input id={id} {...input} type={visible ? 'text' : 'password'}
          className={className + ' pw-input' + (error ? ' bad' : '')} aria-invalid={!!error} aria-describedby={describedBy}
          autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <button type="button" className="pw-toggle" aria-controls={id}
          aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'}
          onMouseDown={(e) => e.preventDefault()} /* keep focus (and the caret) in the input */
          onClick={() => setVisible((v) => !v)}>
          <Icon name={visible ? 'eyeOff' : 'eye'} size={20} />
        </button>
      </div>
      {extra}
      {hint && <p className="hint" id={hintId}>{hint}</p>}
      {error && <p className="ferr" id={errId}>{error}</p>}
    </div>
  )
}
