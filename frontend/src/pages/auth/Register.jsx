import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { homeFor } from '../../roles'
import Field from '../../components/Field'
import AuthLayout, { EMAIL_RE, ErrorBanner } from './AuthLayout'

const LEVELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
const COLORS = ['#B91C1C', '#C2410C', '#B45309', '#0B7A5A', '#0B7A5A']

function strength(pw) {
  if (pw.length < 8) return 0
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

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

  const score = strength(form.password)
  const color = COLORS[score]

  const validate = () => {
    const err = {}
    if (form.fullName.trim().length < 2) err.fullName = 'Enter your full name.'
    if (!form.email.trim()) err.email = 'Enter your email address.'
    else if (!EMAIL_RE.test(form.email.trim())) err.email = 'Enter a valid email, like name@example.com.'
    if (form.password.length < 8) err.password = 'Use at least 8 characters.'
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
      else setServerError({
        offline: ex.offline,
        message: ex.offline ? 'Registration is unavailable right now. Nothing was submitted. Please try again later.' : ex.message,
      })
      setBusy(false)
    }
  }

  return (
    <AuthLayout mode="register" title="Create your account" subtitle="Join CourtConnect to book courts and find players near you."
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}>
      {serverError && <ErrorBanner offline={serverError.offline}>{serverError.message}</ErrorBanner>}
      <form className="auth-form" onSubmit={submit} noValidate>        <Field id="r-name" label="Full name" placeholder="Your full name" autoComplete="name"
          value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
        <Field id="r-email" label="Email" type="email" placeholder="you@example.com" autoComplete="email"
          value={form.email} onChange={set('email')} error={errors.email} />
        <Field id="r-pw" label="Password" type="password" placeholder="At least 8 characters" autoComplete="new-password"
          value={form.password} onChange={set('password')} error={errors.password}
          extra={<>
            <div className="meter" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <i key={i} style={{ background: form.password && i < Math.max(1, score) ? color : undefined }} />)}
            </div>
            <p className="hint">Strength: <b>{form.password ? LEVELS[score] : '—'}</b></p>
          </>} />
        <Field id="r-pw2" label="Confirm password" type="password" placeholder="Re-enter your password" autoComplete="new-password"
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
