import { STATUS } from '../constants/status'

/** Pill label. tone: ok | pend | bad | mute | info | org */
export default function Badge({ tone = 'mute', dot, children, className = '' }) {
  return (
    <span className={`badge b-${tone} ${className}`}>
      {dot && <span className="bdot" aria-hidden="true" />}
      {children}
    </span>
  )
}

/**
 * Badge for an SRS status value, e.g. <StatusBadge kind="booking" status="CONFIRMED" />.
 * kind: slot | booking | payment | join | game | user | notification
 */
export function StatusBadge({ kind, status, prefix }) {
  const s = STATUS[kind]?.[status] ?? { label: status ?? 'Unknown', tone: 'mute' }
  return <Badge tone={s.tone}>{prefix}{s.label}</Badge>
}

export const statusLabel = (kind, status) => STATUS[kind]?.[status]?.label ?? status
