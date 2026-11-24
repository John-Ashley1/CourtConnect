import { useEffect, useState } from 'react'

/** Seconds left until `deadline` (ISO string), updated every second; 0 when passed or missing. */
export function useCountdown(deadline) {
  const left = () => (deadline ? Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 1000)) : 0)
  const [secs, setSecs] = useState(left)
  useEffect(() => {
    setSecs(left())
    if (!deadline) return
    const t = setInterval(() => setSecs(left()), 1000)
    return () => clearInterval(t)
  }, [deadline]) // eslint-disable-line react-hooks/exhaustive-deps
  return secs
}
