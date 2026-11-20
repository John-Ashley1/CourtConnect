import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api, getToken, setToken, SESSION_ENDED } from './api'
import { AuthCtx } from './auth'
import { ROLES, homeFor } from './roles'
import RequireRole from './components/RequireRole'
import EmptyState from './components/EmptyState'
import Landing from './pages/Landing'
import SignIn from './pages/auth/SignIn'
import Register from './pages/auth/Register'
import ComingSoon from './pages/ComingSoon'
import Profile from './pages/Profile'
import PlayerHome from './pages/player/PlayerHome'
import FacilityDashboard from './pages/facility/FacilityDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

const HOME_PAGES = { PLAYER: PlayerHome, FACILITY_ADMIN: FacilityDashboard, SYSTEM_ADMIN: AdminDashboard }
// Sidebar items with a `page` key (see roles.js) use these; every other item shows "Coming soon".
const BUILT_PAGES = { profile: Profile }

export default function App() {
  const [user, setUser] = useState(null)
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
  const logout = (message = null) => { setToken(null); setUser(null); setNotice(message) }
  const updateUser = (changes) => setUser((u) => (u ? { ...u, ...changes } : u))

  // The backend rejected our token (expired, or signed out everywhere after a password change).
  useEffect(() => {
    const onEnded = () => { if (getToken()) logout('Your session has ended. Please sign in again.') }
    window.addEventListener(SESSION_ENDED, onEnded)
    return () => window.removeEventListener(SESSION_ENDED, onEnded)
  }, [])

  if (status === 'checking') return <div className="boot" role="status">Loading…</div>
  if (status === 'offline') {
    return (
      <div className="boot">
        <EmptyState icon="offline" tone="error" title="Can’t reach the server"
          action={<div className="row-gap">
            <button className="btn pri" onClick={verify}>Try again</button>
            <button className="btn sec" onClick={() => { logout(); setStatus('ready') }}>Sign out</button>
          </div>}>
          CourtConnect isn’t responding. Check your connection, then try again.
        </EmptyState>
      </div>
    )
  }

  const home = user ? homeFor(user.role) : '/login'

  return (
    <AuthCtx.Provider value={{ user, login, logout, updateUser, notice, clearNotice: () => setNotice(null) }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to={home} replace /> : <SignIn />} />
        <Route path="/register" element={user ? <Navigate to={home} replace /> : <Register />} />
        <Route path="/dashboard" element={<Navigate to={home} replace />} />

        {Object.entries(ROLES).map(([role, cfg]) => {
          const Home = HOME_PAGES[role]
          const others = cfg.groups.flatMap((g) => g.items).filter((i) => i.path !== cfg.home)
          return (
            <Route key={role} path={cfg.home} element={<RequireRole role={role} />}>
              <Route index element={<Home />} />
              {others.map((i) => {
                const Page = BUILT_PAGES[i.page] ?? ComingSoon
                return <Route key={i.path} path={i.path.slice(cfg.home.length + 1)} element={<Page />} />
              })}
              <Route path="*" element={<Navigate to={cfg.home} replace />} />
            </Route>
          )
        })}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthCtx.Provider>
  )
}
