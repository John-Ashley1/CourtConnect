import EmptyState from './EmptyState'
import Button from './Button'
import LaterIncrement from './LaterIncrement'

/**
 * Shown when a page's data can't be loaded. `error` is the ApiError from a service:
 *  - notBuilt (the feature's API doesn't exist yet) → "Available in a later increment"
 *  - offline → "can't reach the server" with Try again
 *  - anything else → the server's message with Try again
 */
export default function ErrorState({ title = 'We can’t load this right now', error, onRetry, reassurance, compact }) {
  if (error?.notBuilt) return <LaterIncrement />
  const offline = !error || error.offline || error.status === 0
  return (
    <EmptyState icon={offline ? 'offline' : 'alert'} tone="error" title={title} compact={compact}
      action={onRetry && <Button variant="sec" icon="refresh" onClick={onRetry}>Try again</Button>}>
      {offline ? 'The server didn’t respond. Check your connection, then try again.' : error.message}
      {reassurance && <> {reassurance}</>}
    </EmptyState>
  )
}
