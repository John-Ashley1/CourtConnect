import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastCtx = createContext(() => {})

/**
 * Short messages in the bottom-right corner (bottom of the screen on phones), announced to screen readers.
 * Usage: const toast = useToast(); toast('Booking cancelled.'); toast('Couldn’t save.', 'err')
 */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const seq = useRef(0)

  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const toast = useCallback((message, kind = 'ok') => {
    const id = ++seq.current
    setItems((xs) => [...xs.slice(-2), { id, message, kind }])
    setTimeout(() => dismiss(id), kind === 'err' ? 7000 : 4500)
  }, [dismiss])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={'toast' + (t.kind === 'err' ? ' err' : '')}>
            <span>{t.message}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
