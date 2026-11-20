import { useState } from 'react'
import { api, setToken } from '../api'
import Field from './Field'
import Icon from './Icon'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

/** Same rules as the backend (ChangePasswordRequest / UserService); the backend is still the final check. */
function validate(f) {
  const err = {}
  if (!f.currentPassword) err.currentPassword = 'Enter your current password.'
  if (!f.newPassword) err.newPassword = 'Enter a new password.'
  else if (f.newPassword.length < 8 || f.newPassword.length > 72) err.newPassword = 'New password must be 8 to 72 characters.'
  else if (f.newPassword === f.currentPassword) err.newPassword = 'Choose a password different from your current one.'
  if (!f.confirmPassword) err.confirmPassword = 'Re-enter your new password.'
  else if (f.confirmPassword !== f.newPassword) err.confirmPassword = 'Passwords don’t match.'
  return err
}

/**
 * Change password (Increment 2; no dedicated FR in the SRS). On success the backend signs out every other device and returns
 * a fresh token, so this device stays signed in.
 */
export default function ChangePasswordCard() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { ok, message }
  const [show, setShow] = useState(false)

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
      setToken(r.token) // the old token no longer works
      setForm(EMPTY)
      setShow(false)
      setResult({ ok: true, message: r.message })
    } catch (ex) {
      if (Object.keys(ex.fieldErrors).length) setErrors(ex.fieldErrors)
      setResult({ ok: false, message: ex.message })
    } finally {
      setBusy(false)
    }
  }

  const type = show ? 'text' : 'password'
  const filled = form.currentPassword || form.newPassword || form.confirmPassword

  return (
    <form className="card section-card" onSubmit={submit} noValidate aria-labelledby="pw-title">
      <header className="section-head">
        <span className="section-icon" aria-hidden="true"><Icon name="lock" size={20} /></span>
        <div>
          <h2 id="pw-title">Password &amp; security</h2>
          <p>Change your password. You’ll stay signed in here; any other devices will be signed out.</p>
        </div>
      </header>

      <div className="section-body">
      {result && (
        <div className={'banner ' + (result.ok ? 'bn-ok' : 'bn-err')} role={result.ok ? 'status' : 'alert'}>
          <Icon name={result.ok ? 'check' : 'alert'} /><span>{result.message}</span>
        </div>
      )}

      <div className="form-grid">
        <Field id="pw-current" label="Current password" type={type} autoComplete="current-password"
          value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
        <div className="grid-spacer" aria-hidden="true" />
        <Field id="pw-new" label="New password" type={type} autoComplete="new-password" maxLength={72}
          hint="At least 8 characters." value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} />
        <Field id="pw-confirm" label="Confirm new password" type={type} autoComplete="new-password" maxLength={72}
          value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
      </div>

      <label className="check check-sm">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
      </label>
      </div>

      <footer className="section-foot">
        <span className="muted foot-note"><Icon name="shield" size={16} /> Use at least 8 characters. Don’t reuse a password from another site.</span>
        <div className="row-start">
          <button className="btn sec" type="button" disabled={busy || !filled}
            onClick={() => { setForm(EMPTY); setErrors({}); setResult(null) }}>Cancel</button>
          <button className="btn pri" type="submit" disabled={busy || !filled}>{busy ? 'Updating…' : 'Update password'}</button>
        </div>
      </footer>
    </form>
  )
}
