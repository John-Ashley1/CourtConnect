import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { homeFor } from '../../roles'
import Field from '../../components/Field'
import PasswordInput from '../../components/PasswordInput'
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter'
import { newPasswordError, PASSWORD_MAX } from '../../utils/passwordStrength'
import AuthLayout, { EMAIL_RE, ErrorBanner } from './AuthLayout'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', agree: false })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
    setErrors({ ...errors, [k]: null })
  }

  const validate = () => {
    const err = {}
    if (form.fullName.trim().length < 2) err.fullName = 'Enter your full name.'
    if (!form.email.trim()) err.email = 'Enter your email address.'
    else if (!EMAIL_RE.test(form.email.trim())) err.email = 'Enter a valid email, like name@example.com.'
    const pwErr = newPasswordError(form.password)
    if (pwErr) err.password = pwErr
    if (!form.confirm || form.confirm !== form.password) err.confirm = 'Passwords do not match.'
    if (!form.agree) err.agree = 'You need to agree to the privacy notice to register.'
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
      const res = await api('/auth/register', {
        method: 'POST',
        body: { fullName: form.fullName.trim(), email: form.email.trim(), password: form.password },
      })
      navigate(homeFor(res.user.role), { replace: true })
      login(res) // the backend signs new players in straight away
    } catch (ex) {
      if (ex.status === 409) setErrors({ email: ex.message })
      else if (Object.keys(ex.fieldErrors ?? {}).length) setErrors(ex.fieldErrors) // e.g. the backend's password rule
      else setServerError({
        offline: ex.offline,
        message: ex.offline ? 'Registration is unavailable right now. Nothing was submitted. Please try again later.' : ex.message,
      })
      setBusy(false)
    }
  }

  return (
    <AuthLayout mode="register" title="Create your account" subtitle="Join CourtConnect to book courts and find players near you."
      footer={<>Already have an account? <Link to="/signin">Sign in</Link></>}>
      {serverError && <ErrorBanner offline={serverError.offline}>{serverError.message}</ErrorBanner>}
      <form className="auth-form" onSubmit={submit} noValidate>        <Field id="r-name" label="Full name" placeholder="Your full name" autoComplete="name"
          value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
        <Field id="r-email" label="Email" type="email" placeholder="you@example.com" autoComplete="email"
          value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordInput id="r-pw" label="Password" placeholder="At least 8 characters, with a letter and a number" autoComplete="new-password"
          maxLength={PASSWORD_MAX} value={form.password} onChange={set('password')} error={errors.password}
          extra={<PasswordStrengthMeter value={form.password} />} />
        <PasswordInput id="r-pw2" label="Confirm password" placeholder="Re-enter your password" autoComplete="new-password"
          value={form.confirm} onChange={set('confirm')} error={errors.confirm} />

        <div className="privacy">
          <p><b>Privacy notice.</b> We collect only your name, email and notification token to manage your account, bookings and notifications, as required by the Data Privacy Act of 2012 (RA 10173).</p>
          <label className="check">
            <input type="checkbox" checked={form.agree} onChange={set('agree')}
              aria-invalid={!!errors.agree} aria-describedby={errors.agree ? 'r-agree-err' : undefined} />
            I have read and agree to the privacy notice.
          </label>
          {errors.agree && <p className="ferr" id="r-agree-err">{errors.agree}</p>}
        </div>

        <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="hint">Registration creates <b>Player</b> accounts. Facility administrator access is assigned by the system administrator.</p>
      </form>
    </AuthLayout>
  )
}
