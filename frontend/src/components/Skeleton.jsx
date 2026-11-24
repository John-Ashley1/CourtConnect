/** Grey shimmering block shown while data loads. */
export default function Skeleton({ height = 72, width = '100%', radius, style }) {
  return <div className="skel" style={{ height, width, borderRadius: radius, ...style }} aria-hidden="true" />
}

/**
 * Common loading layouts. kind: 'list' (rows) | 'cards' (tile row + rows) | 'table'
 * Announces "Loading…" to screen readers.
 */
export function SkeletonPage({ kind = 'list', rows = 3 }) {
  return (
    <div className="skel-stack" role="status" aria-busy="true">
      {kind === 'cards' && (
        <div className="skel-row"><Skeleton height={96} /><Skeleton height={96} /><Skeleton height={96} /></div>
      )}
      {kind === 'table' && <Skeleton height={44} />}
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={kind === 'table' ? 52 : 72} />)}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
