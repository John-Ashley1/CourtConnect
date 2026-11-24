import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { SIGN_IN, homeFor } from '../roles'

/** Not signed in → sign-in page (then back here). Signed in with another role → that role's own dashboard. */
export default function RequireRole({ role }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to={SIGN_IN} replace state={{ from: location.pathname + location.search }} />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}
