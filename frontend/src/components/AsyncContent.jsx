import ErrorState from './ErrorState'
import { SkeletonPage } from './Skeleton'

/**
 * Loading → skeleton, error → ErrorState with "Try again", empty → `empty`, otherwise children(data).
 *   <AsyncContent state={q} isEmpty={(d) => !d.length} empty={<EmptyState …/>} errorTitle="…">
 *     {(data) => …}
 *   </AsyncContent>
 */
export default function AsyncContent({ state, loading, errorTitle, reassurance, isEmpty, empty, children }) {
  if (state.status === 'loading') return loading ?? <SkeletonPage />
  if (state.status === 'error') return <ErrorState title={errorTitle} error={state.error} onRetry={state.reload} reassurance={reassurance} />
  if (isEmpty?.(state.data)) return empty ?? null
  return children(state.data)
}
