import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { homeFor, signInFor } from '../roles'

/**
 * Not signed in → the sign-in page for this area (player pages → /signin, facility and system admin
 * pages → /admin/signin), then back here after signing in. This also covers the Back button after
 * logging out and an expired session. Signed in with another role → that role's own dashboard.
 */
export default function RequireRole({ role }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to={signInFor(role)} replace state={{ from: location.pathname + location.search }} />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}
