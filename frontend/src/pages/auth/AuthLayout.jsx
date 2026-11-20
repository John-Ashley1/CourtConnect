import { Link } from 'react-router-dom'
import BrandLogo from '../../components/BrandLogo'
import Icon from '../../components/Icon'

/** Split screen: brand on the left, teal panel with the form card on the right. */
export default function AuthLayout({ mode, title, subtitle, children, footer }) {
  const isLogin = mode === 'login'
  return (
    <div className="auth">
      <section className="auth-brand">
        <Link to="/" className="brand-link" aria-label="CourtConnect home"><BrandLogo large /></Link>
      </section>
      <section className="auth-panel">
        <div className="card auth-card">
          <nav className="auth-tabs" aria-label="Account">
            <Link to="/login" className={isLogin ? 'on' : ''} aria-current={isLogin ? 'page' : undefined}>Sign in</Link>
            <Link to="/register" className={!isLogin ? 'on' : ''} aria-current={!isLogin ? 'page' : undefined}>Register</Link>
          </nav>
          <h1>{title}</h1>
          <p className="auth-sub">{subtitle}</p>
          {children}
          <p className="auth-foot">{footer}</p>
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

export const EMAIL_RE = /^\S+@\S+\.\S+$/
