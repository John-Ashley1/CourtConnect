import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { ROLES, initials } from '../roles'
import EmptyState from './EmptyState'
import Card from './Card'
import Icon from './Icon'

/** Whole-page state for a feature whose backend isn't built yet. */
export default function LaterIncrement({ icon = 'clock', children }) {
  return (
    <EmptyState icon={icon} title="Available in a later increment">
      {children ?? 'This part of CourtConnect isn’t connected to the server yet. It will show real data once its feature is built.'}
    </EmptyState>
  )
}

/** Small "Available in a later increment" block inside a dashboard card. */
export function LaterBlock({ icon = 'clock', children }) {
  return (
    <div className="later">
      <span className="later-icon" aria-hidden="true"><Icon name={icon} size={20} /></span>
      <div>
        <b>Available in a later increment</b>
        <p>{children}</p>
      </div>
    </div>
  )
}

/** The signed-in account, from GET /api/auth/me (real data). */
export function AccountCard() {
  const { user } = useAuth()
  const cfg = ROLES[user.role]
  const profile = cfg.groups.flatMap((g) => g.items).find((i) => i.icon === 'user')?.path
  return (
    <Card title="Your account" actions={profile && <Link className="card-link" to={profile}>Profile</Link>}>
      <div className="account">
        <span className="avatar avatar-lg" aria-hidden="true">{initials(user.fullName)}</span>
        <div className="min0">
          <b>{user.fullName}</b>
          <p className="muted">{user.email}</p>
          <span className="badge b-info">{cfg.label}</span>
        </div>
      </div>
    </Card>
  )
}
