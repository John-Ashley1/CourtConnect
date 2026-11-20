import Icon from './Icon'

/** Centered message card used for empty, "later phase" and error states. */
export default function EmptyState({ icon = 'chart', title, children, action, tone, compact }) {
  return (
    <div className={'state' + (compact ? ' state-compact' : '')} role={tone === 'error' ? 'alert' : undefined}>
      <div className={'state-icon' + (tone === 'error' ? ' state-icon-err' : '')}><Icon name={icon} size={26} /></div>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
