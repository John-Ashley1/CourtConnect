import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { ROLES, initials } from '../roles'
import Icon from './Icon'

/** Card with a heading and an optional "See all" style link. */
export function DashCard({ title, link, className = '', children }) {
  return (
    <section className={'card dash-card ' + className}>
      <div className="card-head">
        <h2>{title}</h2>
        {link && <Link to={link.to}>{link.label}</Link>}
      </div>
      {children}
    </section>
  )
}

/** Small "Available in a later phase" block shown inside a card. */
export function LaterPhase({ icon = 'clock', children }) {
  return (
    <div className="later">
      <span className="later-icon"><Icon name={icon} size={20} /></span>
      <div>
        <b>Available in a later phase</b>
        <p>{children}</p>
      </div>
    </div>
  )
}

/** KPI tile. Without a value it shows a dash and "Available in a later phase" — never a made-up number. */
export function Kpi({ label, value, note }) {
  const ready = value !== undefined && value !== null
  return (
    <div className="kpi">
      <span>{label}</span>
      <b aria-label={ready ? undefined : 'Not available yet'}>{ready ? value : '—'}</b>
      <p>{ready ? note : 'Available in a later phase'}</p>
    </div>
  )
}

/** Real data from the auth feature: the signed-in account. */
export function AccountCard() {
  const { user } = useAuth()
  const cfg = ROLES[user.role]
  const profile = cfg.groups.flatMap((g) => g.items).find((i) => i.icon === 'user')?.path
  return (
    <DashCard title="Your account" link={profile && { to: profile, label: 'Profile' }}>
      <div className="account">
        <span className="avatar avatar-lg" aria-hidden="true">{initials(user.fullName)}</span>
        <div>
          <b>{user.fullName}</b>
          <p className="muted">{user.email}</p>
          <span className="badge b-info">{cfg.label}</span>
        </div>
      </div>
    </DashCard>
  )
}
