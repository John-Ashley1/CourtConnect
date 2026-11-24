import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../auth'
import PasswordInput from '../../components/PasswordInput'
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter'
import { newPasswordError, PASSWORD_MAX } from '../../utils/passwordStrength'
import AuthLayout, { ErrorBanner } from './AuthLayout'

/** Step 2 of forgot password: opened from the link (/reset-password?token=…). */
export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null) // { message, offline, badLink }
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: null }) }

  const validate = () => {
    const err = {}
    const pwErr = newPasswordError(form.newPassword, 'Enter a new password.')
    if (pwErr) err.newPassword = pwErr
    if (!form.confirmPassword) err.confirmPassword = 'Re-enter your new password.'
    else if (form.confirmPassword !== form.newPassword) err.confirmPassword = 'Passwords don’t match.'
    return err
  }

  const submit = async (e) => {
    e.preventDefault()
    setServerError(null)
    const err = validate()
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      const r = await api('/auth/reset-password', { method: 'POST', body: { token, newPassword: form.newPassword } })
      logout(r.message) // every session was signed out; show the message on the sign-in page
      navigate('/signin', { replace: true })
    } catch (ex) {
      const { token: tokenErr, ...fieldErrs } = ex.fieldErrors
      if (Object.keys(fieldErrs).length) setErrors(fieldErrs)
      setServerError({ offline: ex.offline, message: tokenErr ?? ex.message, badLink: !!tokenErr })
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout mode="reset" title="Reset link incomplete" subtitle="This link is missing its reset code."
        footer={<Link to="/signin">Back to sign in</Link>}>
        <ErrorBanner>Open the link from your email again, or request a new one.</ErrorBanner>
        <Link className="btn pri auth-wide" to="/forgot-password">Request a new link</Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout mode="reset" title="Choose a new password"
      subtitle="Pick a strong password you don’t use anywhere else. You’ll be signed out on all devices."
      footer={<Link to="/signin">Back to sign in</Link>}>
      {serverError && (
        <ErrorBanner offline={serverError.offline}>
          {serverError.message}
          {serverError.badLink && <> <Link to="/forgot-password">Request a new link</Link></>}
        </ErrorBanner>
      )}
      <form className="auth-form" onSubmit={submit} noValidate>
        <PasswordInput id="rp-new" label="New password" autoComplete="new-password" maxLength={PASSWORD_MAX} autoFocus
          value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword}
          extra={<PasswordStrengthMeter value={form.newPassword} />} />
        <PasswordInput id="rp-confirm" label="Confirm new password" autoComplete="new-password" maxLength={PASSWORD_MAX}
          value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
        <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</button>
      </form>
    </AuthLayout>
  )
}
