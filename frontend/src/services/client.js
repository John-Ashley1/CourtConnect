import { api, ApiError } from '../api'

export const NOT_BUILT_MESSAGE = 'Available in a later increment.'

/**
 * Calls the backend for a feature service. Pages never call this directly — they call service functions.
 *
 * While a feature's API doesn't exist yet, Spring answers with its own generic
 * 404 "Not Found" (or 405 "Method Not Allowed"). That becomes an ApiError with notBuilt = true,
 * and pages show "Available in a later increment" instead of an error.
 * Real "not found" answers from our controllers carry their own message, so they pass through.
 */
export async function request(path, options) {
  try {
    return await api(path, options)
  } catch (e) {
    const springDefault = (e.status === 404 && e.message === 'Not Found') || (e.status === 405 && e.message === 'Method Not Allowed')
    if (!springDefault) throw e
    const x = new ApiError(e.status, NOT_BUILT_MESSAGE)
    x.notBuilt = true
    throw x
  }
}

/** Query string from an object, skipping empty values. */
export function qs(params) {
  const p = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v) })
  const s = p.toString()
  return s ? '?' + s : ''
}
