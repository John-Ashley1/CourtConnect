import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../Logo'
import { api } from '../api'
import { useAuth } from '../auth'

export default function Auth({ mode }) {
  const isLogin = mode === 'login'
  const { login } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const body = isLogin ? { email: form.email, password: form.password } : form
      login(await api(isLogin ? '/auth/login' : '/auth/register', { method: 'POST', body }))
      nav('/dashboard')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="auth">
      <section className="auth-brand">
        <Link to="/" aria-label="CourtConnect home"><Logo size={56} large /></Link>
        <p className="tagline-small">Book • Play • Connect</p>
      </section>
      <section className="auth-panel">
        <div className="card">
          <div className="tabs" role="tablist">
            <Link role="tab" aria-selected={isLogin} className={isLogin ? 'on' : ''} to="/login">Sign in</Link>
            <Link role="tab" aria-selected={!isLogin} className={!isLogin ? 'on' : ''} to="/register">Register</Link>
          </div>
          <h2>{isLogin ? 'Welcome back!' : 'Create your account'}</h2>
          <p className="muted">{isLogin ? 'Sign in to book courts and join games near you.' : 'Join CourtConnect to book courts and join players near you.'}</p>
          <form onSubmit={submit}>
            {!isLogin && <label>Full name<input required value={form.fullName} onChange={set('fullName')} placeholder="Juan Dela Cruz" autoComplete="name" /></label>}
            <label>Email<input required type="email" value={form.email} onChange={set('email')} placeholder="juan@example.com" autoComplete="email" /></label>
            <label>Password<input required type="password" minLength={isLogin ? undefined : 8} value={form.password} onChange={set('password')} placeholder={isLogin ? 'Enter your password' : 'At least 8 characters'} autoComplete={isLogin ? 'current-password' : 'new-password'} /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn btn-dark btn-block" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
          </form>
          <p className="switch">{isLogin ? 'New to CourtConnect?' : 'Already have an account?'} <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link></p>
        </div>
      </section>
    </div>
  )
}
