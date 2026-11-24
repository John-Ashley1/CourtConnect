import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from '../../components/BrandLogo'
import Icon from '../../components/Icon'

/**
 * Split screen: brand on the left, teal panel with the form card on the right.
 * mode: 'login' | 'register' show the Sign in / Register tabs; anything else (e.g. 'admin', 'reset') hides them.
 */
export default function AuthLayout({ mode, title, subtitle, children, footer }) {
  const isLogin = mode === 'login'
  const showTabs = mode === 'login' || mode === 'register'
  const tabTitle = { login: 'Sign in', register: 'Register' }[mode] ?? (typeof title === 'string' ? title : 'Account')
  useEffect(() => { document.title = `${tabTitle} · CourtConnect` }, [tabTitle])
  return (
    <div className="auth">
      <section className="auth-brand">
        <Link to="/" className="brand-link" aria-label="CourtConnect home"><BrandLogo large /></Link>
      </section>
      <section className="auth-panel">
        <div className="card auth-card">
          {showTabs && (
            <nav className="auth-tabs" aria-label="Account">
              <Link to="/signin" className={isLogin ? 'on' : ''} aria-current={isLogin ? 'page' : undefined}>Sign in</Link>
              <Link to="/register" className={!isLogin ? 'on' : ''} aria-current={!isLogin ? 'page' : undefined}>Register</Link>
            </nav>
          )}
          <h1>{title}</h1>
          <p className="auth-sub">{subtitle}</p>
          {children}
          {footer && <p className="auth-foot">{footer}</p>}
        </div>
      </section>
    </div>
  )
}

/** Red banner for server-side problems (offline, wrong password, etc.). */
export function ErrorBanner({ offline, children }) {
  return (
    <div className="banner bn-err" role="alert">
      <Icon name={offline ? 'offline' : 'alert'} />
      <span>{children}</span>
    </div>
  )
}

/** Neutral notice, e.g. "Your session has ended" or "Password changed". */
export function InfoBanner({ children }) {
  return (
    <div className="banner bn-info" role="status">
      <Icon name="alert" />
      <span>{children}</span>
    </div>
  )
}

export const EMAIL_RE = /^\S+@\S+\.\S+$/
