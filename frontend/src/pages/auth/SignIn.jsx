import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { homeFor } from '../../roles'
import Field from '../../components/Field'
import PasswordInput from '../../components/PasswordInput'
import AuthLayout, { EMAIL_RE, ErrorBanner, InfoBanner } from './AuthLayout'

/**
 * Sign in. `admin` = the administrator sign-in page (/admin/signin): same form and login endpoint,
 * but no register options, and player accounts are turned away (not signed in).
 */
export default function SignIn({ admin = false }) {
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
    // No length or strength rule at sign-in: older accounts (e.g. admins) may have weaker passwords.
    if (!form.password) err.password = 'Enter your password.'
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
      if (admin && res.user.role === 'PLAYER') {
        // Not signed in: the token is discarded and nothing is stored.
        setServerError({ playerOnAdmin: true })
        setBusy(false)
        return
      }
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
    <AuthLayout
      mode={admin ? 'admin' : 'login'}
      title={admin ? 'Administrator sign in' : 'Welcome back!'}
      subtitle={admin ? 'For facility administrators and system administrators.' : 'Sign in to book courts and join games near you.'}
      footer={admin ? <Link to="/">Back to home</Link> : <>New to CourtConnect? <Link to="/register">Create an account</Link></>}>
      {notice && !serverError && <InfoBanner>{notice}</InfoBanner>}
      {serverError?.playerOnAdmin && (
        <ErrorBanner>
          This sign-in is for administrators. Players, please use the <Link to="/signin">regular sign in</Link>.
        </ErrorBanner>
      )}
      {serverError && !serverError.playerOnAdmin && <ErrorBanner offline={serverError.offline}>{serverError.message}</ErrorBanner>}
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field id="si-email" label="Email" type="email" placeholder="you@example.com" autoComplete="email"
          value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordInput id="si-pw" label="Password" placeholder="Enter your password" autoComplete="current-password"
          value={form.password} onChange={set('password')} error={errors.password} />
        <p className="auth-forgot">
          <Link to="/forgot-password" state={{ email: form.email.trim() }}>Forgot password?</Link>
        </p>
        <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthLayout>
  )
}
