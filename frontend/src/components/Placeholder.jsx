import Icon from './Icon'

/**
 * Dashed box for an external service that isn't connected yet
 * (PayMongo checkout, camera QR scan, weather, push permission, photo upload, PDF export…).
 */
export default function Placeholder({ icon = 'clock', title, children, action, style }) {
  return (
    <div className="ph-box" style={style}>
      <span className="state-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <b>{title}</b>
      {children && <span>{children}</span>}
      {action}
    </div>
  )
}
