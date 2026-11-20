import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { homeFor } from '../../roles'
import Field from '../../components/Field'
import AuthLayout, { EMAIL_RE, ErrorBanner, InfoBanner } from './AuthLayout'

export default function SignIn() {
  const { login, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null) // { message, offline }
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value })
    setErrors({ ...errors, [k]: null })
  }

  const validate = () => {
    const err = {}
    if (!form.email.trim()) err.email = 'Enter your email address.'
    else if (!EMAIL_RE.test(form.email.trim())) err.email = 'Enter a valid email, like name@example.com.'
    if (!form.password) err.password = 'Enter your password.'
    else if (form.password.length < 8) err.password = 'Password must be at least 8 characters.'
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
      const res = await api('/auth/login', { method: 'POST', body: { email: form.email.trim(), password: form.password } })
      // Return to the page they were sent away from, if it belongs to their role.
      const home = homeFor(res.user.role)
      const from = location.state?.from
      navigate(from && from.startsWith(home) ? from : home, { replace: true })
      login(res)
    } catch (ex) {
      setServerError({
        offline: ex.offline,
        message: ex.offline ? 'We can’t reach the sign-in service right now. Check your connection and try again.'
          : ex.status === 401 ? 'Incorrect email or password. Try again.' : ex.message,
      })
      setBusy(false)
    }
  }

  return (
    <AuthLayout mode="login" title="Welcome back!" subtitle="Sign in to book courts and join games near you."
      footer={<>New to CourtConnect? <Link to="/register">Create an account</Link></>}>
      {notice && !serverError && <InfoBanner>{notice}</InfoBanner>}
      {serverError && <ErrorBanner offline={serverError.offline}>{serverError.message}</ErrorBanner>}
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field id="si-email" label="Email" type="email" placeholder="you@example.com" autoComplete="email"
          value={form.email} onChange={set('email')} error={errors.email} />
        <Field id="si-pw" label="Password" type="password" placeholder="Enter your password" autoComplete="current-password"
          value={form.password} onChange={set('password')} error={errors.password} />
        <p className="auth-forgot">
          <Link to="/forgot-password" state={{ email: form.email.trim() }}>Forgot password?</Link>
        </p>
        <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthLayout>
  )
}
