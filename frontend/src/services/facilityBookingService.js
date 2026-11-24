import { request, qs } from './client'

// Facility administrator: booking records, cancellation and QR check-in at their own facilities.

/**
 * filters: { q (ref or player name), status, facilityId, period: 'upcoming' | 'today' | 'week' | 'month' | 'all' }
 * GET /api/facility-bookings?q=&status=&facilityId=&period=
 */
export const listFacilityBookings = ({ q = '', status = '', facilityId = '', period = 'upcoming' } = {}) =>
  request('/facility-bookings' + qs({ q, status, facilityId, period }))

/** Releases the slots and notifies the player. POST /api/facility-bookings/{bookingId}/cancel */
export const cancelFacilityBooking = (bookingId) => request(`/facility-bookings/${bookingId}/cancel`, { method: 'POST' })

/** Looks up a booking code (QR content) at the admin's facilities. GET /api/check-in/{code} */
export const verifyBookingCode = (code) => request(`/check-in/${encodeURIComponent(code.trim().toUpperCase())}`)

/** POST /api/check-in/{bookingId} */
export const confirmCheckIn = (bookingId) => request(`/check-in/${bookingId}`, { method: 'POST' })
