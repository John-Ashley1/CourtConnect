import { useCallback, useEffect, useState } from 'react'

/**
 * Runs a service call and tracks its state:
 *   const q = useAsync(() => courtService.searchCourts(filters), [filters.sport, filters.date])
 *   q.status: 'loading' | 'ready' | 'error' · q.data · q.error · q.reload() · q.setData(fn)
 *   q.notBuilt: true when the feature's backend doesn't exist yet
 * Re-runs when `deps` change and on reload().
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: undefined, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, status: 'loading', error: null }))
    fn()
      .then((data) => { if (alive) setState({ status: 'ready', data, error: null }) })
      .catch((error) => { if (alive) setState({ status: 'error', data: undefined, error }) })
    return () => { alive = false }
  }, [...deps, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setTick((t) => t + 1), [])
  /** Update the loaded data in place (after a successful action), without reloading. */
  const setData = useCallback((upd) => setState((s) => ({ ...s, data: typeof upd === 'function' ? upd(s.data) : upd })), [])

  return { ...state, notBuilt: !!state.error?.notBuilt, reload, setData }
}
