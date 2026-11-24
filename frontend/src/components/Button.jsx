import { Link } from 'react-router-dom'
import Icon from './Icon'

/**
 * Button or link styled as a button.
 *   variant: 'pri' (green) | 'sec' (outline) | 'dan' (red) | 'navy' | 'link' | 'ghost'
 *   size: 'sm'  · block: full width · busy: spinner + disabled · icon: Icon name
 *   to: renders a router <Link> instead of a <button>
 */
export default function Button({ variant = 'pri', size, block, busy, icon, to, className = '', type = 'button', disabled, children, ...rest }) {
  const cls = ['btn', variant, size, block && 'block', className].filter(Boolean).join(' ')
  const content = <>
    {busy ? <span className="spin" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
    {children}
  </>
  if (to) return <Link className={cls} to={to} {...rest}>{content}</Link>
  return (
    <button type={type} className={cls} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {content}
    </button>
  )
}
