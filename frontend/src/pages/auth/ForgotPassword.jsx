import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../../api'
import Field from '../../components/Field'
import Icon from '../../components/Icon'
import AuthLayout, { EMAIL_RE, ErrorBanner } from './AuthLayout'

/** Step 1 of forgot password: ask for the email. The answer is the same whether or not it's registered. */
export default function ForgotPassword() {
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [error, setError] = useState(null)
  const [serverError, setServerError] = useState(null) // { message, offline }
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(null) // success message from the server

  const submit = async (e) => {
    e.preventDefault()
    setServerError(null)
    const v = email.trim()
    const err = !v ? 'Enter your email address.' : !EMAIL_RE.test(v) ? 'Enter a valid email, like name@example.com.' : null
    setError(err)
    if (err) return
    setBusy(true)
    try {
      const r = await api('/auth/forgot-password', { method: 'POST', body: { email: v } })
      setSent(r.message)
    } catch (ex) {
      if (ex.fieldErrors.email) setError(ex.fieldErrors.email)
      else setServerError({ offline: ex.offline, message: ex.message })
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout mode="reset" title="Check your email" subtitle={<>We sent instructions to <b>{email.trim()}</b>.</>}
        footer={<Link to="/login">Back to sign in</Link>}>
        <div className="banner bn-ok" role="status" style={{ marginTop: 16 }}>
          <Icon name="check" /><span>{sent}</span>
        </div>
        <p className="hint auth-note">
          Didn’t get it? Check your spam folder, make sure the email is correct, and try again in a minute.
        </p>
        <button className="btn sec auth-wide" type="button" onClick={() => setSent(null)}>Try a different email</button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout mode="reset" title="Forgot your password?"
      subtitle="Enter the email you use for CourtConnect and we’ll send you a link to reset it."
      footer={<>Remembered it? <Link to="/login">Back to sign in</Link></>}>
      {serverError && <ErrorBanner offline={serverError.offline}>{serverError.message}</ErrorBanner>}
      <form className="auth-form" onSubmit={submit} noValidate>
        <Field id="fp-email" label="Email" type="email" placeholder="you@example.com" autoComplete="email" autoFocus
          value={email} onChange={(e) => { setEmail(e.target.value); setError(null) }} error={error} />
        <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
    </AuthLayout>
  )
}
