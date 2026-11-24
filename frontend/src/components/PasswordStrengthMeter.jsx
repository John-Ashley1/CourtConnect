import { PASSWORD_ADVICE, passwordStrength } from '../utils/passwordStrength'

/**
 * 4-segment strength bar + "Strength: …" label under a new-password field (as in docs/ui-prototype/auth-register),
 * plus a security tip while the password is Too short or Weak. The label is announced politely as it changes.
 */
export default function PasswordStrengthMeter({ value = '', id }) {
  const s = passwordStrength(value)
  const typed = value.length > 0
  return (
    <div className="pw-strength" id={id}>
      <div className="meter" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <i key={i} style={{ background: typed && i < s.bars ? s.color : undefined }} />)}
      </div>
      <p className="hint" aria-live="polite">
        Strength: <b style={{ color: typed ? s.color : undefined }}>{typed ? s.label : '—'}</b>
      </p>
      {typed && s.score < 2 && <p className="hint pw-advice">{PASSWORD_ADVICE}</p>}
    </div>
  )
}
