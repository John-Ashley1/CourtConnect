import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { ROLES, findNavItem } from '../roles'
import AppLayout from '../components/AppLayout'
import EmptyState from '../components/EmptyState'

/** Placeholder for sidebar pages whose feature hasn't been built yet. */
export default function ComingSoon() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const cfg = ROLES[user.role]
  const item = findNavItem(user.role, pathname)?.item ?? { label: 'Coming soon', icon: 'clock' }

  return (
    <AppLayout title={item.label} description="This page isn’t available yet.">
      <EmptyState icon={item.icon} title="Available in a later phase"
        action={<Link className="btn sec" to={cfg.home}>Back to {cfg.homeLabel.toLowerCase()}</Link>}>
        {item.label} is part of a feature that hasn’t been built yet. You’ll find it here once it’s ready.
      </EmptyState>
    </AppLayout>
  )
}
