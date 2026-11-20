const KEY = 'cc_token'
export const getToken = () => localStorage.getItem(KEY)
export const setToken = (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY))

export const OFFLINE_MESSAGE = 'We can’t reach the server right now. Check your connection and try again.'

/** Error with the HTTP status (0 = server unreachable) and the backend's `message`. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
  get offline() { return this.status === 0 }
}

export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE)
  }
  const data = await res.json().catch(() => ({}))
  if (res.ok) return data
  // The Vite dev proxy answers 5xx with no JSON body when the backend isn't running.
  if (res.status >= 500 && !data.message) throw new ApiError(0, OFFLINE_MESSAGE)
  throw new ApiError(res.status, data.message || 'Something went wrong. Please try again.')
}
