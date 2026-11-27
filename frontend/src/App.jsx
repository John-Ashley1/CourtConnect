import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api, getToken, setToken, SESSION_ENDED } from './api'
import { AuthCtx } from './auth'
import { ADMIN_SIGN_IN, ROLES, SIGN_IN, homeFor, signInFor } from './roles'
import { ROLE_ROUTES } from './routes'
import RequireRole from './components/RequireRole'
import EmptyState from './components/EmptyState'
import { ToastProvider } from './components/Toast'
import Landing from './pages/Landing'
import SignIn from './pages/auth/SignIn'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'


export default function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const userRef = useRef(null)
  userRef.current = user // always the latest user, also inside event listeners
  // checking = verifying a saved token, offline = server unreachable while verifying
  const [status, setStatus] = useState(getToken() ? 'checking' : 'ready')

  const verify = useCallback(() => {
    setStatus('checking')
    api('/auth/me')
      .then((u) => { setUser(u); setStatus('ready') })
      .catch((err) => {
        if (err.offline) { setStatus('offline'); return }
        setToken(null) // expired or invalid token
        setStatus('ready')
      })
  }, [])

  useEffect(() => { if (getToken()) verify() }, [verify])

  // Message shown once on the sign-in page, e.g. after a password change or an expired session.
  const [notice, setNotice] = useState(null)

  const login = ({ token, user }) => { setToken(token); setUser(user); setNotice(null) }
  /**
   * The one sign-out for the whole app (top bar, offline screen, expired session, password change/reset).
   * 1. Reads the role first (or `role` when nobody is signed in here, e.g. after a reset link),
   * 2. clears the token and the user (nothing else is stored),
   * 3. goes to that role's sign-in page: players → /signin, administrators → /admin/signin, unknown → /signin.
   * `replace` swaps out the current page in the history; Back to any signed-in page is then sent to
   * sign-in again by RequireRole.
   */
  const logout = useCallback(({ message = null, role } = {}) => {
    const r = role ?? userRef.current?.role
    setToken(null)
    setUser(null)
    setNotice(message)
    navigate(signInFor(r), { replace: true })
  }, [navigate])
  const updateUser = (changes) => setUser((u) => (u ? { ...u, ...changes } : u))

  // The backend rejected our token (expired, or signed out everywhere after a password change).
  useEffect(() => {
    const onEnded = () => { if (getToken()) logout({ message: 'Your session has ended. Please sign in again.' }) }
    window.addEventListener(SESSION_ENDED, onEnded)
    return () => window.removeEventListener(SESSION_ENDED, onEnded)
  }, [logout])

  if (status === 'checking') return <div className="boot" role="status">Loading…</div>
  if (status === 'offline') {
    return (
      <div className="boot">
        <EmptyState icon="offline" tone="error" title="Can’t reach the server"
          action={<div className="row-gap">
            <button className="btn pri" onClick={verify}>Try again</button>
            <button className="btn sec" onClick={() => { setStatus('ready'); logout() }}>Sign out</button>
          </div>}>
          CourtConnect isn’t responding. Check your connection, then try again.
        </EmptyState>
      </div>
    )
  }

  const home = user ? homeFor(user.role) : SIGN_IN

  return (
    <AuthCtx.Provider value={{ user, login, logout, updateUser, notice, clearNotice: () => setNotice(null) }}>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path={SIGN_IN} element={user ? <Navigate to={home} replace /> : <SignIn />} />
          <Route path="/login" element={<Navigate to={SIGN_IN} replace />} /> {/* old address */}
          <Route path={ADMIN_SIGN_IN} element={user ? <Navigate to={home} replace /> : <SignIn admin />} /> {/* login only, for administrators */}
          <Route path="/register" element={user ? <Navigate to={home} replace /> : <Register />} />
          <Route path="/forgot-password" element={user ? <Navigate to={home} replace /> : <ForgotPassword />} />
          {/* Open even when signed in: the link may be clicked in a browser that has a session. */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Navigate to={home} replace />} />

          {/* Signed-in pages. Not signed in → that area's sign-in page (players /signin, administrators /admin/signin);
              another role → that role's own dashboard. */}
          {Object.entries(ROLES).map(([role, cfg]) => (
            <Route key={role} path={cfg.home} element={<RequireRole role={role} />}>
              {ROLE_ROUTES[role].map(({ index, path, Page }) => {
                const el = <Suspense fallback={<div className="boot" role="status">Loading…</div>}><Page /></Suspense>
                return index ? <Route key="index" index element={el} /> : <Route key={path} path={path} element={el} />
              })}
              <Route path="*" element={<Navigate to={cfg.home} replace />} />
            </Route>
          ))}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthCtx.Provider>
  )
}
