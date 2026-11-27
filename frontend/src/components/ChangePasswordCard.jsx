import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import Icon from './Icon'
import PasswordInput from './PasswordInput'
import PasswordStrengthMeter from './PasswordStrengthMeter'
import { newPasswordError, PASSWORD_MAX } from '../utils/passwordStrength'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

/** Same rules as the backend (ChangePasswordRequest + @StrongPassword / UserService); the backend is still the final check. */
function validate(f) {
  const err = {}
  if (!f.currentPassword) err.currentPassword = 'Enter your current password.'
  const pwErr = newPasswordError(f.newPassword, 'Enter a new password.')
  if (pwErr) err.newPassword = pwErr
  else if (f.newPassword === f.currentPassword) err.newPassword = 'Choose a password different from your current one.'
  if (!f.confirmPassword) err.confirmPassword = 'Re-enter your new password.'
  else if (f.confirmPassword !== f.newPassword) err.confirmPassword = 'Passwords don’t match.'
  return err
}

/**
 * Change password (Increment 2; no dedicated FR in the SRS). On success every session is signed out, this one too,
 * and the shared logout sends the user to their sign-in page (administrators: /admin/signin).
 */
export default function ChangePasswordCard() {
  const { logout } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { ok, message }

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value })
    setErrors({ ...errors, [k]: null })
    setResult(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    setResult(null)
    const err = validate(form)
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      const r = await api('/users/me/password', {
        method: 'POST',
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      })
      // Every session is signed out, this one too: sign in again with the new password.
      // The shared logout sends administrators to the Administrator sign-in page and players to /signin.
      logout({ message: 'Password changed. Sign in with your new password.' })
    } catch (ex) {
      if (Object.keys(ex.fieldErrors).length) setErrors(ex.fieldErrors)
      setResult({ ok: false, message: ex.message })
      setBusy(false)
    }
  }

  const filled = form.currentPassword || form.newPassword || form.confirmPassword

  return (
    <form className="card section-card" onSubmit={submit} noValidate aria-labelledby="pw-title">
      <header className="section-head">
        <span className="section-icon" aria-hidden="true"><Icon name="lock" size={20} /></span>
        <div>
          <h2 id="pw-title">Password &amp; security</h2>
          <p>Change your password. You’ll be signed out on all devices, including this one, and then sign in with your new password.</p>
        </div>
      </header>

      <div className="section-body">
      {result && (
        <div className={'banner ' + (result.ok ? 'bn-ok' : 'bn-err')} role={result.ok ? 'status' : 'alert'}>
          <Icon name={result.ok ? 'check' : 'alert'} /><span>{result.message}</span>
        </div>
      )}

      <div className="form-grid">
        <PasswordInput id="pw-current" label="Current password" autoComplete="current-password"
          value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
        <div className="grid-spacer" aria-hidden="true" />
        <PasswordInput id="pw-new" label="New password" autoComplete="new-password" maxLength={PASSWORD_MAX}
          value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword}
          extra={<PasswordStrengthMeter value={form.newPassword} />} />
        <PasswordInput id="pw-confirm" label="Confirm new password" autoComplete="new-password" maxLength={PASSWORD_MAX}
          value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
      </div>

      </div>

      <footer className="section-foot">
        <span className="muted foot-note"><Icon name="shield" size={16} /> Use 8+ characters with a letter and a number. Don’t reuse a password from another site.</span>
        <div className="row-start">
          <button className="btn sec" type="button" disabled={busy || !filled}
            onClick={() => { setForm(EMPTY); setErrors({}); setResult(null) }}>Cancel</button>
          <button className="btn pri" type="submit" disabled={busy || !filled}>{busy ? 'Updating…' : 'Update password'}</button>
        </div>
      </footer>
    </form>
  )
}
